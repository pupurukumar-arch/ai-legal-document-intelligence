/**
 * Complete End-to-End Cross-Service Integration Test
 * Starts the Python Parser (FastAPI), generates a PDF contract,
 * uploads it through Node.js Express API bridge (POST /api/contracts/upload),
 * and executes a multi-hop query (POST /api/query).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const FormData = require('form-data');
const app = require('./server');

const PORT = 3050;
const BASE_URL = `http://localhost:${PORT}`;
const PARSER_DIR = path.resolve(__dirname, '../backend-parser');
const SAMPLE_PDF_PATH = path.resolve(__dirname, 'sample_contract.pdf');
const NORMALIZED_PDF_PATH = SAMPLE_PDF_PATH.replace(/\\/g, '/');

let server = null;
let pythonProcess = null;

function runCommandSync(cmd, args, options = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { shell: false, ...options });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (d) => stdout += d.toString());
        proc.stderr.on('data', (d) => stderr += d.toString());
        proc.on('close', (code) => {
            if (code === 0) resolve(stdout);
            else reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        });
    });
}

async function runE2ETest() {
    console.log('=== Starting Cross-Service E2E Integration Test ===\n');

    // 1. Generate test PDF using Python script executed directly in backend-parser directory
    console.log('[E2E 1] Generating synthetic legal contract PDF from backend-parser directory...');
    const pythonCmd = `from test_service import generate_synthetic_legal_pdf; open('${NORMALIZED_PDF_PATH}', 'wb').write(generate_synthetic_legal_pdf())`;
    await runCommandSync('python', ['-c', pythonCmd], { cwd: PARSER_DIR });
    console.log(`✓ Created ${SAMPLE_PDF_PATH}`);

    // 2. Start Python FastAPI parser microservice if not already running
    console.log('\n[E2E 2] Checking Python parser availability on port 8000...');
    let parserRunning = false;
    try {
        const check = await fetch('http://127.0.0.1:8000/health');
        if (check.ok) parserRunning = true;
    } catch {}

    if (!parserRunning) {
        console.log(`Starting Python parser in ${PARSER_DIR} (uvicorn main:app --port 8000)...`);
        pythonProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--port', '8000'], {
            cwd: PARSER_DIR,
            detached: false,
            stdio: 'ignore'
        });
        // Wait 2.5s for FastAPI startup
        await new Promise((r) => setTimeout(r, 2500));
    }

    const parserHealth = await fetch('http://127.0.0.1:8000/health');
    assert.strictEqual(parserHealth.status, 200);
    console.log('✓ Python parser is healthy and responding on http://127.0.0.1:8000');

    // 3. Start Node.js Express server
    await new Promise((resolve) => {
        server = app.listen(PORT, resolve);
    });
    console.log(`✓ Node.js Express API bridge running on ${BASE_URL}`);

    // 4. Test Health Check on Express Bridge
    const apiHealth = await fetch(`${BASE_URL}/health`);
    const healthJson = await apiHealth.json();
    assert.strictEqual(healthJson.python_parser, 'reachable');
    console.log('✓ Express /health reports Python parser is reachable:', healthJson);

    // 5. Test POST /api/contracts/upload
    console.log('\n[E2E 3] Uploading contract PDF through Node.js Express bridge...');
    const pdfBuffer = fs.readFileSync(SAMPLE_PDF_PATH);

    const form = new FormData();
    form.append('file', pdfBuffer, {
        filename: 'commercial_nda.pdf',
        contentType: 'application/pdf'
    });

    const uploadRes = await fetch(`${BASE_URL}/api/contracts/upload`, {
        method: 'POST',
        body: form.getBuffer(),
        headers: form.getHeaders()
    });

    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadRes.status, 201, `Upload failed: ${JSON.stringify(uploadData)}`);
    assert.strictEqual(uploadData.success, true);
    assert(uploadData.contract_id, 'Contract ID should be returned');
    assert(uploadData.total_clauses >= 6, `Expected at least 6 clauses, got ${uploadData.total_clauses}`);
    assert(uploadData.dependencies_linked >= 2, `Expected at least 2 dependencies linked, got ${uploadData.dependencies_linked}`);

    console.log(`✓ Contract uploaded and ingested:`);
    console.log(`  - Contract ID: ${uploadData.contract_id}`);
    console.log(`  - Total Pages: ${uploadData.total_pages}`);
    console.log(`  - Clauses Extracted: ${uploadData.total_clauses}`);
    console.log(`  - Cross-References Linked: ${uploadData.dependencies_linked}`);
    console.log(`  - Parser Processing Time: ${uploadData.parser_time_ms} ms`);

    // 6. Test POST /api/query for Multi-Hop Legal Retrieval
    console.log('\n[E2E 4] Executing Multi-Hop Legal Query...');
    const queryRes = await fetch(`${BASE_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: 'exclusions from protection',
            contract_id: uploadData.contract_id,
            top_k: 1,
            hops: 2
        })
    });

    assert.strictEqual(queryRes.status, 200);
    const queryData = await queryRes.json();
    assert.strictEqual(queryData.success, true);
    assert(queryData.direct_matches.length > 0, 'Direct match required');

    console.log(`✓ Multi-Hop Query Successful:`);
    console.log(`  - Seed Clause: [${queryData.direct_matches[0].clause_id}] "${queryData.direct_matches[0].section_title}"`);
    console.log(`  - Multi-Hop Traversal Discovered:`);
    for (const ref of queryData.multi_hop_references) {
        console.log(`    -> [Hop ${ref.hop_level}] ${ref.clause_id} (${ref.section_title}) [${ref.relation_type}]`);
    }

    console.log('\n======================================================');
    console.log('  FULL CROSS-SERVICE END-TO-END PIPELINE VALIDATED!   ');
    console.log('======================================================\n');
}

runE2ETest()
    .catch((err) => {
        console.error('[E2E TEST ERROR]:', err);
        process.exitCode = 1;
    })
    .finally(() => {
        if (server) server.close();
        if (pythonProcess) {
            try { pythonProcess.kill(); } catch {}
        }
        process.exit(process.exitCode || 0);
    });
