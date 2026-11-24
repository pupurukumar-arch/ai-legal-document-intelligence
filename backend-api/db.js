/**
 * Database Connection & Query Management Layer
 * Connects to PostgreSQL (with pgvector support) via pg.Pool.
 * Includes graceful in-memory mock store for test environments without live PostgreSQL.
 */

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'legal_ai_db'}`;

let pool = null;
let isConnectedToPostgres = false;
let forceMock = process.env.USE_MOCK_DB === 'true';

// In-memory mock store for tests/dev fallback
class MockDatabase {
    constructor() {
        this.contracts = new Map();
        this.clauses = new Map();
        this.dependencies = new Map();
    }

    reset() {
        this.contracts.clear();
        this.clauses.clear();
        this.dependencies.clear();
    }
}

const mockStore = new MockDatabase();

function initPool() {
    if (forceMock) {
        console.log('[DB] Mock DB mode forced by USE_MOCK_DB=true');
        return;
    }

    try {
        pool = new Pool({
            connectionString,
            connectionTimeoutMillis: 3000,
            max: 20,
            idleTimeoutMillis: 30000,
        });

        pool.on('error', (err) => {
            console.warn('[DB] PostgreSQL pool background error:', err.message);
        });
    } catch (err) {
        console.warn('[DB] Could not initialize PostgreSQL pool:', err.message);
        pool = null;
    }
}

initPool();

/**
 * Checks PostgreSQL connectivity.
 */
async function checkConnection() {
    if (forceMock || !pool) return false;
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        isConnectedToPostgres = true;
        return true;
    } catch (err) {
        isConnectedToPostgres = false;
        return false;
    }
}

/**
 * Executes a query against PostgreSQL or fallback mock store.
 */
async function query(text, params = []) {
    if (pool && !forceMock) {
        try {
            return await pool.query(text, params);
        } catch (err) {
            // If connection refused, fall back to mock store gracefully for local testing
            if (err.code === 'ECONNREFUSED' || err.code === '28P01' || err.message.includes('connect ECONNREFUSED')) {
                console.warn('[DB] Live PostgreSQL unavailable. Falling back to in-memory store for query.');
                return executeMockQuery(text, params);
            }
            throw err;
        }
    }
    return executeMockQuery(text, params);
}

/**
 * In-memory SQL emulator for essential queries during development/testing.
 */
function executeMockQuery(text, params = []) {
    const trimmed = text.trim().toUpperCase();

    // 1. INSERT INTO contracts
    if (trimmed.startsWith('INSERT INTO CONTRACTS')) {
        const id = require('crypto').randomUUID();
        const [filename, file_size_bytes, total_pages, total_clauses, status, document_type] = params;
        const row = {
            id,
            filename,
            file_size_bytes: file_size_bytes || 0,
            total_pages: total_pages || 0,
            total_clauses: total_clauses || 0,
            status: status || 'processed',
            document_type: document_type || 'unknown',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        mockStore.contracts.set(id, row);
        return { rows: [row], rowCount: 1 };
    }

    // 2. INSERT INTO clauses
    if (trimmed.startsWith('INSERT INTO CLAUSES')) {
        const id = require('crypto').randomUUID();
        const [contract_id, clause_id, section_title, page_number, content, cross_references, embedding] = params;
        const row = {
            id,
            contract_id,
            clause_id,
            section_title,
            page_number,
            content,
            cross_references: cross_references || [],
            embedding: embedding || null,
            created_at: new Date().toISOString()
        };
        mockStore.clauses.set(id, row);
        return { rows: [row], rowCount: 1 };
    }

    // 3. INSERT INTO clause_dependencies
    if (trimmed.startsWith('INSERT INTO CLAUSE_DEPENDENCIES')) {
        const id = require('crypto').randomUUID();
        const [contract_id, source_clause_id, target_clause_id, target_clause_code, relation_type] = params;
        const row = {
            id,
            contract_id,
            source_clause_id,
            target_clause_id,
            target_clause_code,
            relation_type: relation_type || 'CROSS_REFERENCE',
            created_at: new Date().toISOString()
        };
        mockStore.dependencies.set(id, row);
        return { rows: [row], rowCount: 1 };
    }

    // 4. SELECT FROM contracts
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM CONTRACTS')) {
        if (params.length > 0 && params[0]) {
            const found = mockStore.contracts.get(params[0]);
            return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
        }
        return { rows: Array.from(mockStore.contracts.values()), rowCount: mockStore.contracts.size };
    }

    // 5. SELECT FROM clauses WHERE contract_id = $1
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM CLAUSES')) {
        let all = Array.from(mockStore.clauses.values());
        if (params.length > 0 && params[0]) {
            all = all.filter(c => c.contract_id === params[0]);
        }
        return { rows: all, rowCount: all.length };
    }

    // 6. SELECT FROM clause_dependencies
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM CLAUSE_DEPENDENCIES')) {
        let all = Array.from(mockStore.dependencies.values());
        if (params.length > 0 && params[0]) {
            all = all.filter(d => d.contract_id === params[0] || d.source_clause_id === params[0]);
        }
        return { rows: all, rowCount: all.length };
    }

    return { rows: [], rowCount: 0 };
}

module.exports = {
    query,
    getPool: () => pool,
    checkConnection,
    mockStore,
    isMock: () => !isConnectedToPostgres || forceMock,
    setForceMock: (val) => { forceMock = val; }
};
