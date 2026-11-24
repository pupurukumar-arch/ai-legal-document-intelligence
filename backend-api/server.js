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
const { parsePdfContract, indexClausesInVectorStore, semanticClauseSearch, getVectorContract, listVectorContracts, deleteVectorContract, indexPolicySourcesInVectorStore, semanticPolicySearch, PARSER_SERVICE_URL } = require('./services/parserService');
const { saveContractWithClauses, multiHopQuery } = require('./services/graphService');
const { addContractJob, isRedisConnected } = require('./services/queueService');
const { generateGroundedAnswer } = require('./services/geminiService');
const { generateProviderAnswer } = require('./services/llmService');
const { getDocumentPolicy, getPolicyVectorSources, evaluateClause, buildLocalRedline } = require('./services/policyGraphService');
const { assessContractReadiness } = require('./services/readinessService');
const { classifyDocument } = require('./services/documentClassifierService');
const { verifyGeneratedAnswer } = require('./services/evidenceVerifierService');
const { buildContractReviewSnapshot } = require('./services/contractSnapshotService');

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
const indexedPolicyTypes = new Set();
function needsClarification(query, history) {
    if (!Array.isArray(history) || history.length === 0) return false;
    const normalized = String(query || '').trim().toLowerCase().replace(/[^a-z0-9 ]+/g, ' ');
    const vaguePatterns = [
        /^(so )?what (do|should) (i|we) do( with it)?$/,
        /^(so )?what to do( with it)?$/,
        /^what about it$/,
        /^and then\??$/,
        /^what now\??$/,
        /^so what\??$/
    ];
    return normalized.split(/\s+/).length <= 8 && vaguePatterns.some(pattern => pattern.test(normalized));
}
function hasLexicalTopicSupport(query, clauses) {
    const ignored = new Set(['what', 'when', 'where', 'which', 'who', 'does', 'will', 'would', 'could', 'should', 'about', 'under', 'this', 'that', 'agreement', 'contract', 'clause', 'apply', 'applies', 'happen', 'happens', 'there']);
    const terms = (String(query || '').toLowerCase().match(/[a-z]{4,}/g) || []).filter(term => !ignored.has(term));
    return terms.some(term => {
        const variants = [term, term.replace(/ity$/, ''), term.replace(/ies$/, 'y'), term.replace(/ing$/, '')].filter(Boolean);
        return clauses.some(clause => {
            const text = `${clause.section_title || ''} ${clause.content || ''}`.toLowerCase();
            return variants.some(variant => text.includes(variant));
        });
    });
}
async function ensurePolicySourcesIndexed(documentType) {
    if (!documentType || documentType === 'unknown' || indexedPolicyTypes.has(documentType)) return;
    await indexPolicySourcesInVectorStore(getPolicyVectorSources(documentType));
    indexedPolicyTypes.add(documentType);
}

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
        redis_queue: isRedisConnected() ? 'connected' : 'disabled',
        persistent_document_store: 'chromadb-local',
        contract_graph: 'rebuilt-from-stored-cross-references',
        answer_generation: process.env.GEMINI_API_KEY ? 'gemini-configured' : (process.env.LLM_PROVIDER ? `${process.env.LLM_PROVIDER}-configured` : 'evidence-only-fallback')
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
        const classification = classifyDocument(parsedData.clauses);
        const requestedType = req.body.document_type || 'auto';
        const documentType = requestedType === 'auto' ? classification.document_type : requestedType;
        const storageResult = await saveContractWithClauses(
            parsedData.metadata,
            parsedData.clauses,
            req.file.size,
            documentType
        );

        let vectorIndex = { indexed_clauses: 0, status: 'unavailable' };
        try {
            vectorIndex = await indexClausesInVectorStore({ contractId: storageResult.contract.id, documentType, clauses: storageResult.clauses, filename: storageResult.contract.filename });
            await ensurePolicySourcesIndexed(documentType);
        } catch (vectorError) {
            console.warn('[ChromaDB]', vectorError.message);
        }

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
            document_type: documentType,
            classification,
            vector_indexed_clauses: vectorIndex.indexed_clauses || 0,
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
 * Hop 0: Direct lexical match
 * Hop 1 & 2: Traverses clause_dependencies for referenced sections, schedules, exhibits.
 */
app.post('/api/query', async (req, res) => {
    try {
        const { query, contract_id, top_k = 3, hops = 2, conversation_history = [], prior_clause_ids = [] } = req.body;

        if (!query) {
            return res.status(400).json({
                error: 'Field "query" is required in JSON body.'
            });
        }

        // Do not let a grounded assistant guess the meaning of pronouns such
        // as “it” in a short follow-up. Asking a targeted question is safer
        // and more useful than repeating the previous answer.
        if (needsClarification(query, conversation_history)) {
            const previousTopic = conversation_history.filter(turn => turn?.role === 'user').at(-1)?.content || 'the previous clause';
            return res.json({
                success: true,
                query,
                contract_id,
                direct_matches: [], multi_hop_references: [], total_context_clauses: 0, full_context: '',
                is_abstain: false, missing_references: [],
                generated_answer: {
                    status: 'CLARIFICATION_NEEDED',
                    answer: `I want to answer accurately. By “it,” do you mean the practical effect, the risk, or a proposed change for: “${previousTopic}”? Please specify which one.`,
                    citations: [], answer_provider: 'conversation-clarifier', answer_model: null
                },
                evidence_verification: { status: 'NOT_APPLICABLE', citation_ids_valid: true, unsupported_citation_ids: [], sentence_checks: [], verifier: 'clarification-gate' }
            });
        }

        let vectorMatches = [];
        try {
            const vectorResult = await semanticClauseSearch({ query, contractId: contract_id || null, topK: parseInt(top_k, 10) || 3 });
            vectorMatches = vectorResult.matches || [];
        } catch (vectorError) {
            console.warn('[ChromaDB]', vectorError.message);
        }

        let persistedClauses = null;
        if (contract_id) {
            try { persistedClauses = (await getVectorContract(contract_id)).clauses; }
            catch (vectorContractError) { console.warn('[ChromaDB]', vectorContractError.message); }
        }
        if (persistedClauses?.length && (persistedClauses[0].document_type || 'unknown') === 'unknown') {
            return res.json({
                success: true,
                query, contract_id,
                direct_matches: [], multi_hop_references: [], total_context_clauses: 0, full_context: '',
                is_abstain: false, missing_references: [],
                generated_answer: {
                    status: 'DOCUMENT_TYPE_REVIEW_NEEDED',
                    answer: 'This PDF was parsed, but it was not confidently identified as a supported legal agreement. Please upload an NDA, rent, employment, or service agreement, or select its type before asking contract questions.',
                    citations: [], answer_provider: 'document-classifier', answer_model: null
                },
                evidence_verification: { status: 'NOT_APPLICABLE', citation_ids_valid: true, unsupported_citation_ids: [], sentence_checks: [], verifier: 'document-type-gate' }
            });
        }
        const retrievalResult = await multiHopQuery({
            query,
            contractId: contract_id || null,
            topK: parseInt(top_k, 10) || 3,
            maxHops: parseInt(hops, 10) || 2,
            vectorSeedClauseIds: [...new Set([...vectorMatches.map(match => match.clause_id).filter(Boolean), ...prior_clause_ids])],
            persistedClauses
        });

        let generatedAnswer;
        if (retrievalResult.is_abstain) {
            generatedAnswer = {
                status: 'INSUFFICIENT_EVIDENCE',
                answer: retrievalResult.abstain_reason,
                citations: retrievalResult.missing_references
                    .map(ref => ref.referenced_by)
                    .filter(Boolean),
                answer_provider: 'deterministic-verifier',
                answer_model: null
            };
        } else {
            const evidence = [
                ...retrievalResult.direct_matches,
                ...retrievalResult.multi_hop_references
            ];
            try {
                generatedAnswer = process.env.LLM_PROVIDER
                    ? await generateProviderAnswer({ question: query, evidence, conversationHistory: Array.isArray(conversation_history) ? conversation_history : [] })
                    : await generateGroundedAnswer({ question: query, evidence });
                // A retrieved clause can validly prove an omission (for
                // example, an acceptance clause with no rejection remedy).
                // Some models still label that useful answer as insufficient.
                // Keep a true refusal for weak/fallback retrieval, but present
                // a strong clause-backed omission as an answer to the user.
                if (generatedAnswer.status === 'INSUFFICIENT_EVIDENCE') {
                    if (generatedAnswer.citations?.length && hasLexicalTopicSupport(query, retrievalResult.direct_matches)) {
                        generatedAnswer.status = 'ANSWERED';
                    } else {
                        // No retrieved clause actually addresses this topic.
                        // Avoid displaying a valid-but-irrelevant citation.
                        generatedAnswer.citations = [];
                    }
                }
            } catch (generationError) {
                console.warn('[Gemini]', generationError.message);
                generatedAnswer = {
                    status: 'GENERATION_FAILED',
                    answer: 'Relevant clauses were retrieved, but answer generation was unavailable. Review the cited evidence below.',
                    citations: retrievalResult.direct_matches.slice(0, 1).map(item => item.clause_id),
                    answer_provider: 'safe-fallback',
                    answer_model: null
                };
            }
        }

        const evidence = [
            ...retrievalResult.direct_matches,
            ...retrievalResult.multi_hop_references
        ];
        const evidenceVerification = verifyGeneratedAnswer({ answer: generatedAnswer.answer, citations: generatedAnswer.citations, evidence });
        res.json({
            success: true,
            ...retrievalResult,
            vector_matches: vectorMatches,
            generated_answer: generatedAnswer,
            evidence_verification: evidenceVerification,
            guardrail_summary: {
                citation_valid: evidenceVerification.citation_ids_valid,
                evidence_support_score: evidenceVerification.evidence_support_score,
                required_references_complete: !retrievalResult.is_abstain,
                human_review_recommended: true,
                scope: 'Document interpretation only — not legal advice.'
            }
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
// Legal Policy Graph: review and controlled redlining (prototype scope)
// ============================================================================

app.get('/api/policy-graph/:documentType', (req, res) => {
    const policy = getDocumentPolicy(req.params.documentType);
    if (!policy) return res.status(404).json({ error: 'Unsupported document type.' });
    res.json({ success: true, document_type: req.params.documentType, policy });
});

app.post('/api/review-clause', (req, res) => {
    const { document_type, clause_text, clause_type } = req.body;
    if (!document_type || !clause_text) return res.status(400).json({ error: 'document_type and clause_text are required.' });
    res.json({ success: true, review: evaluateClause({ documentType: document_type, clauseText: clause_text, clauseType: clause_type }) });
});

app.post('/api/redline', async (req, res) => {
    const { document_type, clause_text, clause_type, objective } = req.body;
    if (!document_type || !clause_text) return res.status(400).json({ error: 'document_type and clause_text are required.' });
    try {
        await ensurePolicySourcesIndexed(document_type);
        const policyResult = await semanticPolicySearch({ query: clause_text, documentType: document_type, topK: 2 });
        res.json({ success: true, redline: buildLocalRedline({ documentType: document_type, clauseText: clause_text, clauseType: clause_type, objective }), retrieved_policy_sources: policyResult.matches || [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/readiness-check', async (req, res) => {
    const { document_type, clauses, dependencies = [] } = req.body;
    if (!document_type || !Array.isArray(clauses)) return res.status(400).json({ error: 'document_type and clauses[] are required.' });
    try {
        await ensurePolicySourcesIndexed(document_type);
        const policyResult = await semanticPolicySearch({ query: clauses.map(clause => `${clause.section_title || ''} ${clause.content || ''}`).join(' '), documentType: document_type, topK: 3 });
        res.json({ success: true, readiness: assessContractReadiness({ documentType: document_type, clauses, dependencies }), snapshot: buildContractReviewSnapshot({ documentType: document_type, clauses, dependencies }), retrieved_policy_sources: policyResult.matches || [] });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/classify-document', (req, res) => {
    if (!Array.isArray(req.body.clauses)) return res.status(400).json({ error: 'clauses[] is required.' });
    res.json({ success: true, classification: classifyDocument(req.body.clauses) });
});

// ============================================================================
// Contract Listing & Graph Details
// ============================================================================

app.get('/api/contracts', async (req, res) => {
    try {
        const result = await listVectorContracts();
        res.json({ success: true, contracts: result.contracts, source: 'chromadb-persistent-store' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await getVectorContract(id);
        res.json({ success: true, contract: result.contract, clauses: result.clauses, source: 'chromadb-persistent-store' });
    } catch (err) {
        res.status(err.message.includes('HTTP 404') ? 404 : 500).json({ error: err.message });
    }
});

app.delete('/api/contracts/:id', async (req, res) => {
    try {
        const result = await deleteVectorContract(req.params.id);
        res.json({ success: true, removed_clauses: result.removed_clauses });
    } catch (err) {
        res.status(err.message.includes('HTTP 404') ? 404 : 500).json({ error: err.message });
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
