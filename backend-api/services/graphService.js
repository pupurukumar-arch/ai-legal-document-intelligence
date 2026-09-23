/**
 * Legal Graph & Multi-Hop Retrieval Engine
 * Manages clause persistence, dependency graph linking, and multi-hop legal query traversal.
 */

const db = require('../db');

/**
 * Normalizes a cross-reference string to match canonical clause_id formats.
 * e.g. "Section 1.1" -> "SEC-1.1", "Schedule A" -> "SCHED-A", "Article 2" -> "ART-2"
 */
function normalizeRefToClauseId(ref) {
    if (!ref) return null;
    const clean = ref.trim();

    // Section 1.1 -> SEC-1.1
    const secMatch = clean.match(/(?:Section|Clause)\s+(\d+(?:\.\d+)*)/i);
    if (secMatch) return `SEC-${secMatch[1]}`;

    // Article 2 / Article II -> ART-2 / ART-II
    const artMatch = clean.match(/Article\s+([IVXLCDM\d]+)/i);
    if (artMatch) return `ART-${artMatch[1]}`;

    // Schedule A / Schedule B-1 -> SCHED-A / SCHED-B-1
    const schedMatch = clean.match(/Schedule\s+([A-Z0-9]+(?:[\.\-][A-Z0-9]+)*)/i);
    if (schedMatch) return `SCHED-${schedMatch[1]}`;

    // Exhibit B / Exhibit B-1 -> EXHIBIT-B / EXHIBIT-B-1
    const exMatch = clean.match(/Exhibit\s+([A-Z0-9]+(?:[\.\-][A-Z0-9]+)*)/i);
    if (exMatch) return `EXHIBIT-${exMatch[1]}`;

    return clean.toUpperCase().replace(/\s+/g, '-');
}

/**
 * Saves a contract and its clauses into PostgreSQL, then resolves and links dependencies.
 */
async function saveContractWithClauses(contractMeta, parsedClauses, fileSizeBytes) {
    // 1. Insert into contracts
    const contractRes = await db.query(
        `INSERT INTO contracts (filename, file_size_bytes, total_pages, total_clauses, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
            contractMeta.filename || 'contract.pdf',
            fileSizeBytes || 0,
            contractMeta.total_pages || 1,
            parsedClauses.length,
            'processed'
        ]
    );

    const contract = contractRes.rows[0];
    const contractId = contract.id;

    // 2. Insert clauses
    const insertedClauses = [];
    const clauseIdToDbId = new Map(); // Maps canonical clause_id (e.g. 'SEC-1.1') -> DB UUID

    for (const c of parsedClauses) {
        const clauseRes = await db.query(
            `INSERT INTO clauses (contract_id, clause_id, section_title, page_number, content, cross_references, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                contractId,
                c.clause_id,
                c.section_title || 'Untitled Section',
                c.page_number || 1,
                c.content,
                c.cross_references || [],
                null // Embedding can be populated asynchronously via BullMQ queue
            ]
        );

        const savedClause = clauseRes.rows[0];
        insertedClauses.push(savedClause);

        // Store lookup key variations for flexible cross-reference resolution
        clauseIdToDbId.set(c.clause_id, savedClause.id);
        const normalized = normalizeRefToClauseId(c.clause_id);
        if (normalized) clauseIdToDbId.set(normalized, savedClause.id);
    }

    // 3. Resolve and insert clause dependencies
    const insertedDependencies = [];

    for (const sourceClause of insertedClauses) {
        const refs = sourceClause.cross_references || [];

        for (const rawRef of refs) {
            const normalizedRef = normalizeRefToClauseId(rawRef);
            const targetDbId = clauseIdToDbId.get(normalizedRef) || clauseIdToDbId.get(rawRef) || null;

            // Determine legal relation type based on target reference code
            let relationType = 'CROSS_REFERENCE';
            if (/Schedule|Exhibit|Appendix/i.test(rawRef)) {
                relationType = 'ATTACHMENT_REFERENCE';
            } else if (/Article\s+1|Definitions/i.test(rawRef)) {
                relationType = 'DEFINITION_DEPENDENCY';
            } else if (/Term|Termination|Default/i.test(rawRef)) {
                relationType = 'CONDITIONED_ON';
            }

            const depRes = await db.query(
                `INSERT INTO clause_dependencies (contract_id, source_clause_id, target_clause_id, target_clause_code, relation_type)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [
                    contractId,
                    sourceClause.id,
                    targetDbId,
                    rawRef,
                    relationType
                ]
            );

            insertedDependencies.push(depRes.rows[0]);
        }
    }

    return {
        contract,
        total_clauses_stored: insertedClauses.length,
        dependencies_linked: insertedDependencies.length,
        clauses: insertedClauses
    };
}

/**
 * Multi-Hop Legal Retrieval
 * 1. Seed Retrieval (Hop 0): Finds directly relevant clauses by keyword or vector.
 * 2. Dependency Traversal (Hop 1 & Hop 2): Follows directed links in `clause_dependencies`
 *    to retrieve referenced schedules, exhibits, and companion clauses.
 */
async function multiHopQuery({ query, contractId = null, topK = 3, maxHops = 2, queryEmbedding = null }) {
    if (!query || typeof query !== 'string') {
        throw new Error("Query parameter must be a non-empty string.");
    }

    // Step 1: Retrieve all clauses for the target contract (or all contracts)
    let clausesSql = `SELECT * FROM clauses`;
    let clausesParams = [];
    if (contractId) {
        clausesSql += ` WHERE contract_id = $1`;
        clausesParams.push(contractId);
    }

    const clausesRes = await db.query(clausesSql, clausesParams);
    const allClauses = clausesRes.rows || [];

    if (allClauses.length === 0) {
        return {
            query,
            direct_matches: [],
            multi_hop_references: [],
            full_context: "No clauses found in the database for this contract."
        };
    }

    // Step 2: Retrieve dependencies
    let depsSql = `SELECT * FROM clause_dependencies`;
    let depsParams = [];
    if (contractId) {
        depsSql += ` WHERE contract_id = $1`;
        depsParams.push(contractId);
    }
    const depsRes = await db.query(depsSql, depsParams);
    const allDependencies = depsRes.rows || [];

    // Map clauses by ID for quick traversal
    const clauseMap = new Map();
    for (const c of allClauses) {
        clauseMap.set(c.id, c);
        clauseMap.set(c.clause_id, c);
    }

    // Step 3: Direct Match Scoring (Hop 0)
    // Hybrid scoring: checks terms in title, clause_id, and content
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    const scoredClauses = allClauses.map(clause => {
        let score = 0;
        const textToSearch = `${clause.clause_id} ${clause.section_title} ${clause.content}`.toLowerCase();

        for (const term of queryTerms) {
            // High weight if matched in section title or clause_id
            if (clause.section_title && clause.section_title.toLowerCase().includes(term)) {
                score += 5;
            }
            if (clause.clause_id && clause.clause_id.toLowerCase().includes(term)) {
                score += 4;
            }
            // Word occurrences in content
            const matches = textToSearch.split(term).length - 1;
            score += Math.min(matches, 3);
        }

        return { clause, score };
    });

    // Sort by score descending and pick top_k
    scoredClauses.sort((a, b) => b.score - a.score);
    const directSeeds = scoredClauses
        .filter(item => item.score > 0)
        .slice(0, topK)
        .map(item => ({
            ...item.clause,
            relevance_score: item.score,
            hop_level: 0
        }));

    // If no keyword match found, return the top clauses by fallback order
    const seeds = directSeeds.length > 0 ? directSeeds : allClauses.slice(0, 1).map(c => ({
        ...c,
        relevance_score: 1,
        hop_level: 0
    }));

    // Step 4: Multi-Hop Dependency Traversal
    const visitedClauseIds = new Set(seeds.map(s => s.id));
    const multiHopResults = [];

    let currentHopClauses = seeds;

    for (let hop = 1; hop <= maxHops; hop++) {
        const nextHopClauses = [];

        for (const parentClause of currentHopClauses) {
            // Find all dependencies where source is parentClause
            const outgoingDeps = allDependencies.filter(
                d => d.source_clause_id === parentClause.id
            );

            for (const dep of outgoingDeps) {
                let target = null;
                if (dep.target_clause_id && clauseMap.has(dep.target_clause_id)) {
                    target = clauseMap.get(dep.target_clause_id);
                } else if (dep.target_clause_code) {
                    const norm = normalizeRefToClauseId(dep.target_clause_code);
                    target = clauseMap.get(norm) || null;
                }

                if (target && !visitedClauseIds.has(target.id)) {
                    visitedClauseIds.add(target.id);
                    const targetWithHop = {
                        ...target,
                        hop_level: hop,
                        relation_type: dep.relation_type,
                        referenced_by: parentClause.clause_id,
                        target_code: dep.target_clause_code
                    };
                    multiHopResults.push(targetWithHop);
                    nextHopClauses.push(targetWithHop);
                }
            }
        }

        currentHopClauses = nextHopClauses;
        if (currentHopClauses.length === 0) break;
    }

    // Step 5: Synthesize Full Legal Context
    const contextSections = [];
    contextSections.push(`=== DIRECT RETRIEVAL MATCHES (HOP 0) ===`);
    for (const s of seeds) {
        contextSections.push(
            `[${s.clause_id}] ${s.section_title} (Page ${s.page_number})\n${s.content}\n`
        );
    }

    if (multiHopResults.length > 0) {
        contextSections.push(`\n=== MULTI-HOP DEPENDENCY CONTEXT (HOPS 1-${maxHops}) ===`);
        for (const m of multiHopResults) {
            contextSections.push(
                `[${m.clause_id}] ${m.section_title} (Page ${m.page_number}) [via ${m.referenced_by} -> ${m.relation_type}]\n${m.content}\n`
            );
        }
    }

    return {
        query,
        contract_id: contractId,
        direct_matches: seeds,
        multi_hop_references: multiHopResults,
        total_context_clauses: seeds.length + multiHopResults.length,
        full_context: contextSections.join('\n')
    };
}

module.exports = {
    saveContractWithClauses,
    multiHopQuery,
    normalizeRefToClauseId
};
