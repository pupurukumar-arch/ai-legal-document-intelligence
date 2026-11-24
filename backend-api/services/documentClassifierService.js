/** Lightweight, explainable document-type classifier for upload routing.
 * The user can override this suggestion in the upload form.
 */
const SIGNALS = {
    nda: ['confidential information', 'non-disclosure', 'receiving party', 'disclosing party'],
    rental_agreement: ['landlord', 'tenant', 'premises', 'security deposit', 'monthly rent'],
    employment_agreement: ['employee', 'employer', 'probation', 'compensation', 'resignation'],
    service_agreement: ['supplier', 'customer', 'statement of work', 'services', 'milestones']
};

function classifyDocument(clauses = []) {
    const text = clauses.map(clause => `${clause.section_title || ''} ${clause.content || ''}`).join(' ').toLowerCase();
    const scored = Object.entries(SIGNALS).map(([document_type, signals]) => ({
        document_type,
        matched_signals: signals.filter(signal => text.includes(signal)),
    })).map(item => ({ ...item, score: item.matched_signals.length }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0] || { document_type: 'unknown', score: 0, matched_signals: [] };
    return {
        document_type: top.score ? top.document_type : 'unknown',
        confidence: top.score >= 3 ? 'high' : top.score >= 1 ? 'medium' : 'low',
        matched_signals: top.matched_signals,
        candidates: scored
    };
}

module.exports = { classifyDocument };
