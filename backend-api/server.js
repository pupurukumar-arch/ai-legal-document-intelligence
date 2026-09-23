/**
 * Express Server & API Bridge Layer
 * Orchestrates PDF upload proxying to Python FastAPI parser,
 * PostgreSQL persistence, and Multi-Hop legal graph retrieval.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const db = require('./db');
const { parsePdfContract, PARSER_SERVICE_URL } = require('./services/parserService');
const { saveContractWithClauses, multiHopQuery } = require('./services/graphService');
const { addContractJob, isRedisConnected } = require('./services/queueService');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Multer for in-memory file handling
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file format. Only PDF files are allowed.'), false);
        }
    }
});

// Middlewares
app.use(cors());
app.use(express.json());

// ============================================================================
// Health & Diagnostic Routes
// ============================================================================

app.get('/health', async (req, res) => {
    const isDbConnected = await db.checkConnection();
    let isParserReachable = false;

    try {
        const parserRes = await fetch(PARSER_SERVICE_URL.replace('/parse-pdf', '/health'), { method: 'GET' });
        isParserReachable = parserRes.ok;
    } catch {
        isParserReachable = false;
    }

    res.json({
        status: 'healthy',
        service: 'backend-api',
        database: isDbConnected ? 'connected' : (db.isMock() ? 'in-memory-fallback' : 'disconnected'),
        python_parser: isParserReachable ? 'reachable' : 'unavailable',
        parser_url: PARSER_SERVICE_URL,
        redis_queue: isRedisConnected() ? 'connected' : 'disabled'
    });
});

// ============================================================================
// Contract Upload & Ingestion Route
// ============================================================================

/**
 * POST /api/contracts/upload
 * 1. Accepts PDF multipart upload.
 * 2. Proxies PDF to the Python parser microservice (http://localhost:8000/parse-pdf).
 * 3. Persists contract and clauses into PostgreSQL.
 * 4. Resolves legal cross-references into the `clause_dependencies` graph table.
 */
app.post('/api/contracts/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'Missing file. Please upload a PDF contract using field name "file".'
            });
        }

        console.log(`[Upload] Processing contract: ${req.file.originalname} (${req.file.size} bytes)`);

        // Step 1: Proxy PDF to Python Parser Microservice
        const parsedData = await parsePdfContract(req.file.buffer, req.file.originalname);

        if (!parsedData.clauses || parsedData.clauses.length === 0) {
            return res.status(422).json({
                error: 'Parser did not extract any structural clauses from the PDF.'
            });
        }

        console.log(`[Upload] Python parser extracted ${parsedData.clauses.length} clauses.`);

        // Step 2: Persist in PostgreSQL and resolve dependency graph
        const storageResult = await saveContractWithClauses(
            parsedData.metadata,
            parsedData.clauses,
            req.file.size
        );

        // Step 3: Trigger background embedding job via BullMQ (if active)
        await addContractJob('generate-embeddings', {
            contractId: storageResult.contract.id,
            clauseCount: storageResult.total_clauses_stored
        });

        res.status(201).json({
            success: true,
            contract_id: storageResult.contract.id,
            filename: storageResult.contract.filename,
            total_pages: storageResult.contract.total_pages,
            total_clauses: storageResult.total_clauses_stored,
            dependencies_linked: storageResult.dependencies_linked,
            parser_time_ms: parsedData.metadata.processing_time_ms,
            clauses: storageResult.clauses
        });

    } catch (err) {
        console.error('[Upload Error]', err.message);
        res.status(500).json({
            error: 'Failed to process contract',
            details: err.message
        });
    }
});

// ============================================================================
// Legal Search & Multi-Hop Retrieval Route
// ============================================================================

/**
 * POST /api/query
 * Accepts legal search query and returns multi-hop retrieval results.
 * Hop 0: Direct keyword/vector match
 * Hop 1 & 2: Traverses clause_dependencies for referenced sections, schedules, exhibits.
 */
app.post('/api/query', async (req, res) => {
    try {
        const { query, contract_id, top_k = 3, hops = 2 } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Field "query" is required in JSON body.'
            });
        }

        const retrievalResult = await multiHopQuery({
            query,
            contractId: contract_id || null,
            topK: parseInt(top_k, 10) || 3,
            maxHops: parseInt(hops, 10) || 2
        });

        res.json({
            success: true,
            ...retrievalResult
        });

    } catch (err) {
        console.error('[Query Error]', err.message);
        res.status(500).json({
            error: 'Failed to execute legal query',
            details: err.message
        });
    }
});

// ============================================================================
// Contract Listing & Graph Details
// ============================================================================

app.get('/api/contracts', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM contracts ORDER BY created_at DESC');
        res.json({
            success: true,
            contracts: result.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const contractRes = await db.query('SELECT * FROM contracts WHERE id = $1', [id]);
        if (contractRes.rows.length === 0) {
            return res.status(404).json({ error: 'Contract not found' });
        }

        const clausesRes = await db.query('SELECT * FROM clauses WHERE contract_id = $1 ORDER BY page_number ASC', [id]);
        const depsRes = await db.query('SELECT * FROM clause_dependencies WHERE contract_id = $1', [id]);

        res.json({
            success: true,
            contract: contractRes.rows[0],
            clauses: clausesRes.rows,
            dependencies: depsRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Multer error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[Server] backend-api running on http://localhost:${PORT}`);
        console.log(`[Server] Python parser configured at ${PARSER_SERVICE_URL}`);
    });
}

module.exports = app;
