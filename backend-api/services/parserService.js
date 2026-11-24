/**
 * Parser Service Proxy
 * Streams uploaded PDF documents to the Python FastAPI parser microservice (PyMuPDF structural chunking).
 */

const FormData = require('form-data');

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL || 'http://127.0.0.1:8000/parse-pdf';
const PARSER_BASE_URL = PARSER_SERVICE_URL.replace(/\/parse-pdf$/, '');

/**
 * Proxies a PDF buffer to the Python layout parser microservice.
 * @param {Buffer} fileBuffer - Binary content of the uploaded PDF.
 * @param {string} originalname - Original file name.
 * @returns {Promise<Object>} - Structured JSON from the parser.
 */
async function parsePdfContract(fileBuffer, originalname) {
    const form = new FormData();
    form.append('file', fileBuffer, {
        filename: originalname || 'contract.pdf',
        contentType: 'application/pdf'
    });

    let response;
    try {
        response = await fetch(PARSER_SERVICE_URL, {
            method: 'POST',
            body: form.getBuffer(),
            headers: form.getHeaders(),
        });
    } catch (err) {
        throw new Error(
            `Failed to reach Python parser microservice at ${PARSER_SERVICE_URL}: ${err.message}. ` +
            `Ensure the backend-parser microservice is running (e.g. 'python -m uvicorn backend-parser.main:app --port 8000').`
        );
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Parser microservice returned HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
}

async function indexClausesInVectorStore({ contractId, documentType, clauses, filename }) {
    const response = await fetch(`${PARSER_BASE_URL}/vector/index-clauses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, document_type: documentType, clauses, filename })
    });
    if (!response.ok) throw new Error(`Vector index returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return response.json();
}

async function getVectorContract(contractId) {
    const response = await fetch(`${PARSER_BASE_URL}/vector/contracts/${encodeURIComponent(contractId)}`);
    if (!response.ok) throw new Error(`Vector contract returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return response.json();
}

async function listVectorContracts() {
    const response = await fetch(`${PARSER_BASE_URL}/vector/contracts`);
    if (!response.ok) throw new Error(`Vector contracts returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return response.json();
}

async function deleteVectorContract(contractId) {
    const response = await fetch(`${PARSER_BASE_URL}/vector/contracts/${encodeURIComponent(contractId)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Vector deletion returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return response.json();
}

async function semanticClauseSearch({ query, contractId, topK }) {
    const response = await fetch(`${PARSER_BASE_URL}/vector/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, contract_id: contractId || null, top_k: topK || 3 })
    });
    if (!response.ok) throw new Error(`Vector search returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return response.json();
}

async function indexPolicySourcesInVectorStore(sources) {
    const response = await fetch(`${PARSER_BASE_URL}/vector/index-policy-sources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sources }) });
    if (!response.ok) throw new Error(`Policy vector index returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return response.json();
}

async function semanticPolicySearch({ query, documentType, topK = 3 }) {
    const response = await fetch(`${PARSER_BASE_URL}/vector/search-policy-sources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, document_type: documentType || null, top_k: topK }) });
    if (!response.ok) throw new Error(`Policy vector search returned HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
    return response.json();
}

module.exports = {
    parsePdfContract,
    indexClausesInVectorStore,
    getVectorContract,
    listVectorContracts,
    deleteVectorContract,
    semanticClauseSearch,
    indexPolicySourcesInVectorStore,
    semanticPolicySearch,
    PARSER_SERVICE_URL
};
