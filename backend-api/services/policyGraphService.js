/**
 * Legal Policy Graph for controlled contract review and redlining.
 * This is intentionally a small, versioned prototype playbook - it does not
 * claim to be a complete legal database or make enforceability determinations.
 */
const policyGraph = require('../knowledge-base/policy-graph.json');

function getDocumentPolicy(documentType) {
    return policyGraph.document_types[documentType] || null;
}

function getPolicyVectorSources(documentType = null) {
    const entries = Object.entries(policyGraph.document_types)
        .filter(([type]) => !documentType || type === documentType);
    return entries.flatMap(([type, documentPolicy]) => Object.entries(documentPolicy.clause_policies).flatMap(([clauseType, policy]) =>
        Object.entries(policy.templates).map(([objective, template]) => ({
            source_id: `${type}:${clauseType}:${objective}`,
            document_type: type,
            clause_type: clauseType,
            label: `${policy.label} (${objective.replace(/_/g, ' ')})`,
            content: `${documentPolicy.label}. ${policy.label}. Review checks: ${policy.review_checks.join('; ')}. Draft template: ${template}`
        }))
    ));
}

function normaliseClauseType(value = '') {
    const text = String(value).toLowerCase();
    if (/security|deposit/.test(text)) return 'security_deposit';
    if (/notice|termination|evict|vacate/.test(text)) return 'termination';
    if (/confidential|non-disclosure/.test(text)) return 'confidentiality';
    if (/liability|damages|indemn/.test(text)) return 'liability';
    if (/probation|resign|employment notice/.test(text)) return 'notice_period';
    return null;
}

function findPolicy(documentType, clauseText, explicitClauseType) {
    const documentPolicy = getDocumentPolicy(documentType);
    if (!documentPolicy) return null;
    const clauseType = explicitClauseType || normaliseClauseType(clauseText);
    const policy = clauseType ? documentPolicy.clause_policies[clauseType] : null;
    return policy ? { clauseType, documentPolicy, policy } : null;
}

function evaluateClause({ documentType, clauseText, clauseType }) {
    const found = findPolicy(documentType, clauseText, clauseType);
    if (!found) {
        return {
            status: 'NEEDS_HUMAN_REVIEW',
            message: 'No reviewed policy node matched this clause. The platform will not draft a policy-based replacement.',
            graph_path: [],
            findings: []
        };
    }
    const lowered = String(clauseText || '').toLowerCase();
    const matchedPatterns = found.policy.risk_patterns.filter(pattern => lowered.includes(pattern));
    return {
        status: matchedPatterns.length ? 'RISK_PATTERN_FOUND' : 'POLICY_CONTEXT_READY',
        clause_type: found.clauseType,
        policy_label: found.policy.label,
        required_checks: found.policy.review_checks,
        risk_patterns_found: matchedPatterns,
        graph_path: [
            `${found.documentPolicy.label}`,
            found.policy.label,
            ...found.policy.review_checks.map(check => `Review rule: ${check}`)
        ],
        templates: found.policy.templates,
        disclaimer: policyGraph.disclaimer
    };
}

function buildLocalRedline({ documentType, clauseText, clauseType, objective = 'balanced' }) {
    const review = evaluateClause({ documentType, clauseText, clauseType });
    if (!review.templates) return review;
    const chosen = review.templates[objective] || review.templates.balanced || Object.values(review.templates)[0];
    return {
        ...review,
        status: 'DRAFT_READY_FOR_REVIEW',
        objective,
        original_clause: clauseText,
        replacement_clause: chosen,
        negotiation_note: `Request: ${objective.replace(/_/g, ' ')} wording. The draft was generated from the ${review.policy_label} policy node and must be reviewed before use.`,
        requires_human_review: true
    };
}

module.exports = { policyGraph, getDocumentPolicy, getPolicyVectorSources, normaliseClauseType, evaluateClause, buildLocalRedline };
