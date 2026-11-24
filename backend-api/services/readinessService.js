/** Deterministic contract-readiness assessment.
 * This is an evidence/readiness screen, not a legal-validity determination.
 */
const { getDocumentPolicy, evaluateClause } = require('./policyGraphService');

const REQUIREMENT_TERMS = {
    parties: ['party', 'parties', 'landlord', 'tenant', 'employer', 'employee', 'supplier', 'customer'],
    property_description: ['premises', 'property', 'address'],
    rent: ['rent', 'monthly rent'],
    security_deposit: ['security deposit', 'deposit'],
    term: ['term', 'duration', 'months', 'years'],
    notice_period: ['notice', 'termination'],
    maintenance: ['maintenance', 'repair'],
    signatures: ['signature', 'signed', 'execution'],
    confidential_information_definition: ['confidential information', 'confidential'],
    exclusions: ['exclusion', 'publicly available', 'independently developed'],
    permitted_disclosure: ['permitted disclosure', 'disclose', 'need to know'],
    governing_law: ['governing law', 'jurisdiction'],
    employer_employee: ['employer', 'employee'],
    role: ['role', 'position', 'designation'],
    compensation: ['compensation', 'salary', 'remuneration'],
    probation: ['probation'],
    confidentiality: ['confidential'],
    intellectual_property: ['intellectual property', 'work product', 'assignment'],
    scope: ['scope', 'services', 'statement of work'],
    scope_of_work: ['scope', 'services', 'statement of work'],
    payment: ['payment', 'invoice', 'fees'],
    milestones: ['milestone'],
    acceptance: ['acceptance', 'accepted'],
    liability: ['liability', 'damages'],
    termination: ['termination', 'terminate'],
    property: ['premises', 'property']
};

function assessContractReadiness({ documentType, clauses = [], dependencies = [] }) {
    const policy = getDocumentPolicy(documentType);
    if (!policy) return { status: 'NEEDS_HUMAN_REVIEW', error: 'Unsupported document type.' };
    const corpus = clauses.map(clause => `${clause.section_title || ''} ${clause.content || ''}`).join(' ').toLowerCase();
    const required_checks = policy.required_checks.map(requirement => {
        const terms = REQUIREMENT_TERMS[requirement] || [requirement.replace(/_/g, ' ')];
        const matched = terms.some(term => corpus.includes(term));
        return { requirement, status: matched ? 'FOUND' : 'MISSING', matched_terms: matched ? terms.filter(term => corpus.includes(term)) : [] };
    });
    const clause_reviews = clauses.map(clause => ({
        clause_id: clause.clause_id,
        section_title: clause.section_title,
        ...evaluateClause({
            documentType,
            clauseText: `${clause.section_title || ''}\n${clause.content || ''}`,
            clauseType: clause.clause_type
        })
    }))
        .filter(review => review.status === 'RISK_PATTERN_FOUND');
    const unresolved = dependencies.filter(edge => !edge.target_clause_id && !edge.target_id);
    const missingCount = required_checks.filter(check => check.status === 'MISSING').length;
    const status = unresolved.length ? 'INSUFFICIENT_EVIDENCE' : (missingCount || clause_reviews.length ? 'REQUIRES_REVIEW' : 'READY_FOR_HUMAN_REVIEW');
    return {
        status,
        summary: unresolved.length
            ? 'Supporting references are missing, so the system cannot complete the readiness assessment.'
            : `${missingCount} required item(s) missing and ${clause_reviews.length} policy risk finding(s) detected.`,
        document_type: documentType,
        required_checks,
        policy_findings: clause_reviews,
        unresolved_references: unresolved,
        disclaimer: 'This is a document-readiness screen based on the supplied contract and curated prototype checks. It is not a legal validity or enforceability determination and requires human review.'
    };
}

module.exports = { assessContractReadiness };
