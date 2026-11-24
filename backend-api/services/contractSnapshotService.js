const { assessContractReadiness } = require('./readinessService');
const { evaluateClause } = require('./policyGraphService');
const { normalizeRefToClauseId } = require('./graphService');

function buildContractReviewSnapshot({ documentType, clauses = [], dependencies = [] }) {
    const readiness = assessContractReadiness({ documentType, clauses, dependencies });
    const codes = new Set(clauses.flatMap(clause => [String(clause.clause_id || '').toUpperCase(), normalizeRefToClauseId(clause.clause_id)]));
    const references = clauses.flatMap(clause => clause.cross_references || []);
    const resolvedReferences = references.filter(reference => codes.has(normalizeRefToClauseId(reference)) || codes.has(String(reference).toUpperCase()));
    const evidenceCompleteness = references.length ? Math.round((resolvedReferences.length / references.length) * 100) : 100;
    const missingRequirements = (readiness.required_checks || []).filter(check => check.status === 'MISSING').length;
    const riskFlags = (readiness.policy_findings || []).length;
    // Prototype clarity indicator: decreases only for observable missing
    // required terms and matched vague/risky patterns; not legal validity.
    const clauseClarity = Math.max(0, Math.min(100, 100 - missingRequirements * 7 - riskFlags * 25));
    const draftReady = clauses.some(clause => Boolean(evaluateClause({ documentType, clauseText: `${clause.section_title || ''}\n${clause.content || ''}` }).templates));
    return {
        evidence_completeness: evidenceCompleteness,
        clause_clarity: clauseClarity,
        risk_flags: riskFlags,
        high_risk_flags: riskFlags,
        negotiation_readiness: draftReady ? 'READY' : 'LIMITED',
        references: { total: references.length, resolved: resolvedReferences.length },
        methodology: 'Prototype indicators derived from parsed reference resolution, required-term coverage, and curated policy-pattern checks. They are not legal validity scores.'
    };
}

module.exports = { buildContractReviewSnapshot };
