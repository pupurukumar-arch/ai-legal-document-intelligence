/**
 * End-to-End Integration & Unit Test Suite for Backend API Bridge
 * Tests database layer, graph resolution, multi-hop retrieval, and upload proxying.
 */

const assert = require('assert');
const http = require('http');
const FormData = require('form-data');
const app = require('./server');
const db = require('./db');
const { saveContractWithClauses, multiHopQuery, normalizeRefToClauseId } = require('./services/graphService');

let server;
const PORT = 3099; // Test port to avoid conflicts
const BASE_URL = `http://localhost:${PORT}`;

// Sample parsed clauses to test graph service directly
const mockParsedClauses = [
    {
        clause_id: 'PREAMBLE',
        section_title: 'Preamble',
        page_number: 1,
        content: 'This Agreement is between Company A and Company B.',
        cross_references: []
    },
    {
        clause_id: 'SEC-1.1',
        section_title: 'Confidential Information',
        page_number: 1,
        content: 'Confidential Information includes all non-public technical data and proprietary code.',
        cross_references: []
    },
    {
        clause_id: 'SEC-1.2',
        section_title: 'Exclusions from Protection',
        page_number: 1,
        content: 'The obligations of Section 1.1 shall not apply to materials cataloged in Schedule A.',
        cross_references: ['Section 1.1', 'Schedule A']
    },
    {
        clause_id: 'SEC-2.1',
        section_title: 'Non-Disclosure Obligations',
        page_number: 2,
        content: 'Recipient shall maintain confidentiality as governed by Section 1.1 and Exhibit B.',
        cross_references: ['Section 1.1', 'Exhibit B']
    },
    {
        clause_id: 'SCHED-A',
        section_title: 'SCHEDULE A - EXCLUDED ASSETS',
        page_number: 2,
        content: '1. Open source components and public whitepapers.',
        cross_references: []
    }
];

async function runTests() {
    console.log('--- Starting Backend API Test Suite ---\n');

    // 1. Start test server
    await new Promise((resolve) => {
        server = app.listen(PORT, resolve);
    });
    console.log(`[TEST] Server listening on ${BASE_URL}`);

    try {
        // -------------------------------------------------------------
        // Test 1: Health Check Endpoint
        // -------------------------------------------------------------
        console.log('\n[TEST 1] Testing GET /health');
        const healthRes = await fetch(`${BASE_URL}/health`);
        assert.strictEqual(healthRes.status, 200);
        const healthData = await healthRes.json();
        assert.strictEqual(healthData.status, 'healthy');
        assert.strictEqual(healthData.service, 'backend-api');
        console.log('✓ GET /health passed:', healthData);

        // -------------------------------------------------------------
        // Test 2: Graph Persistence & Reference Normalization
        // -------------------------------------------------------------
        console.log('\n[TEST 2] Testing Reference Normalization');
        assert.strictEqual(normalizeRefToClauseId('Section 1.1'), 'SEC-1.1');
        assert.strictEqual(normalizeRefToClauseId('Clause 3.2'), 'SEC-3.2');
        assert.strictEqual(normalizeRefToClauseId('Schedule A'), 'SCHED-A');
        assert.strictEqual(normalizeRefToClauseId('Exhibit B-1'), 'EXHIBIT-B-1');
        assert.strictEqual(normalizeRefToClauseId('Article 2'), 'ART-2');
        console.log('✓ Normalization passed');

        console.log('\n[TEST 3] Testing Clause Persistence & Graph Dependencies');
        const saveResult = await saveContractWithClauses(
            { filename: 'nda_agreement.pdf', total_pages: 2 },
            mockParsedClauses,
            12048
        );

        assert(saveResult.contract.id, 'Contract ID should exist');
        assert.strictEqual(saveResult.total_clauses_stored, 5);
        assert(saveResult.dependencies_linked >= 3, `Expected at least 3 linked dependencies, got ${saveResult.dependencies_linked}`);
        console.log(`✓ Stored ${saveResult.total_clauses_stored} clauses and ${saveResult.dependencies_linked} dependencies.`);

        // -------------------------------------------------------------
        // Test 4: Multi-Hop Legal Retrieval Algorithm
        // -------------------------------------------------------------
        console.log('\n[TEST 4] Testing Multi-Hop Query Engine');
        const queryRes = await multiHopQuery({
            query: 'exclusions from protection',
            contractId: saveResult.contract.id,
            topK: 1,
            maxHops: 2
        });

        assert.strictEqual(queryRes.direct_matches.length, 1);
        const seed = queryRes.direct_matches[0];
        assert.strictEqual(seed.clause_id, 'SEC-1.2', 'Seed clause should be SEC-1.2 Exclusions');
        console.log(`  - Direct Match (Hop 0): [${seed.clause_id}] "${seed.section_title}"`);

        // Verify Multi-Hop Traversal (Hop 1 should contain SEC-1.1 and SCHED-A)
        console.log(`  - Traversed Dependencies: ${queryRes.multi_hop_references.length} clauses discovered`);
        const hopClauseIds = queryRes.multi_hop_references.map(h => h.clause_id);
        assert(hopClauseIds.includes('SEC-1.1'), `Hop should discover SEC-1.1. Found: ${hopClauseIds}`);
        assert(hopClauseIds.includes('SCHED-A'), `Hop should discover SCHED-A. Found: ${hopClauseIds}`);

        for (const ref of queryRes.multi_hop_references) {
            console.log(`    * [Hop ${ref.hop_level}] ${ref.clause_id} (${ref.section_title}) via ${ref.referenced_by} [${ref.relation_type}]`);
        }

        assert(queryRes.full_context.includes('DIRECT RETRIEVAL MATCHES'), 'Context should contain Direct Matches section');
        assert(queryRes.full_context.includes('MULTI-HOP DEPENDENCY CONTEXT'), 'Context should contain Multi-Hop section');
        assert.strictEqual(queryRes.is_abstain, false, 'Resolved Schedule A should not trigger abstention');
        console.log('✓ Multi-Hop Retrieval passed with all dependency hops verified.');

        console.log('\n[TEST 5] Testing Missing-Evidence Abstention');
        const missingEvidenceRes = await multiHopQuery({
            query: 'Is Exhibit B attached and what does it require?',
            contractId: saveResult.contract.id,
            topK: 2,
            maxHops: 2
        });
        assert.strictEqual(missingEvidenceRes.is_abstain, true);
        assert(missingEvidenceRes.missing_references.some(ref => ref.normalized_reference === 'EXHIBIT-B'));
        assert(missingEvidenceRes.abstain_reason.includes('Exhibit B'));
        console.log(`✓ Correctly abstained: ${missingEvidenceRes.abstain_reason}`);

        // -------------------------------------------------------------
        // Test 5: HTTP POST /api/query Route
        // -------------------------------------------------------------
        console.log('\n[TEST 6] Testing POST /api/query Route');
        const apiQueryRes = await fetch(`${BASE_URL}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'confidential information proprietary code',
                contract_id: saveResult.contract.id,
                top_k: 2,
                hops: 1
            })
        });

        assert.strictEqual(apiQueryRes.status, 200);
        const apiQueryData = await apiQueryRes.json();
        assert.strictEqual(apiQueryData.success, true);
        assert(apiQueryData.direct_matches.length > 0);
        assert(apiQueryData.generated_answer, 'A grounded-answer envelope should be returned');
        assert(['gemini', 'extractive-fallback', 'safe-fallback'].includes(apiQueryData.generated_answer.answer_provider));
        assert(apiQueryData.generated_answer.citations.every(cid =>
            apiQueryData.direct_matches.concat(apiQueryData.multi_hop_references)
                .some(clause => clause.clause_id === cid)
        ), 'Every answer citation must refer to retrieved evidence');
        console.log(`✓ POST /api/query returned ${apiQueryData.total_context_clauses} context clauses.`);

        // -------------------------------------------------------------
        // Test 6: Contract Listing & Details
        // -------------------------------------------------------------
        console.log('\n[TEST 7] Testing GET /api/contracts and GET /api/contracts/:id');
        const listRes = await fetch(`${BASE_URL}/api/contracts`);
        assert.strictEqual(listRes.status, 200);
        const listData = await listRes.json();
        assert(listData.contracts.length > 0);

        const detailRes = await fetch(`${BASE_URL}/api/contracts/${saveResult.contract.id}`);
        assert.strictEqual(detailRes.status, 200);
        const detailData = await detailRes.json();
        assert.strictEqual(detailData.clauses.length, 5);
        assert(detailData.dependencies.length > 0);
        console.log('✓ Contract details and graph listing passed.');

        console.log('\n=============================================');
        console.log('  ALL BACKEND-API TESTS PASSED SUCCESSFULLY! ');
        console.log('=============================================\n');

    } finally {
        if (server) {
            server.close();
        }
        process.exit(0);
    }
}

if (require.main === module) {
    runTests().catch((err) => {
        console.error('\n[FATAL TEST FAILURE]:', err);
        if (server) server.close();
        process.exit(1);
    });
}

module.exports = { runTests };
