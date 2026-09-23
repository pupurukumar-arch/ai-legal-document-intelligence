/**
 * Parser Service Proxy
 * Streams uploaded PDF documents to the Python FastAPI parser microservice (PyMuPDF structural chunking).
 */

const FormData = require('form-data');

const PARSER_SERVICE_URL = process.env.PARSER_SERVICE_URL || 'http://127.0.0.1:8000/parse-pdf';

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

module.exports = {
    parsePdfContract,
    PARSER_SERVICE_URL
};
