/** Conservative heuristic evidence verifier.
 * It verifies citation IDs and reports sentence-to-evidence lexical overlap;
 * it never claims legal correctness or overrides a deterministic abstention.
 */
const STOP = new Set(['the','a','an','and','or','to','of','in','on','for','is','are','be','by','with','that','this','it','as','from','at','under','does','not']);
function tokens(value) { return new Set(String(value || '').toLowerCase().match(/[a-z0-9]{3,}/g)?.filter(word => !STOP.has(word)) || []); }
function overlap(sentence, evidenceText) {
    const source = tokens(sentence); const evidence = tokens(evidenceText);
    if (!source.size) return 1;
    return [...source].filter(word => evidence.has(word)).length / source.size;
}
function verifyGeneratedAnswer({ answer, citations = [], evidence = [] }) {
    const evidenceById = new Map(evidence.map(item => [item.clause_id, item]));
    const unsupported = citations.filter(id => !evidenceById.has(id));
    const citedText = citations.map(id => evidenceById.get(id)?.content || '').join(' ');
    const sentences = String(answer || '').split(/(?<=[.!?])\s+/).filter(Boolean).map(sentence => {
        const score = overlap(sentence, citedText);
        return { sentence, lexical_support: Number(score.toFixed(2)), status: score >= 0.14 ? 'SUPPORTED_HEURISTICALLY' : 'REVIEW_NEEDED' };
    });
    const supportScores = sentences.map(item => item.lexical_support).filter(score => Number.isFinite(score));
    const evidence_support_score = supportScores.length ? Number((supportScores.reduce((sum, score) => sum + score, 0) / supportScores.length * 100).toFixed(0)) : null;
    return {
        status: unsupported.length ? 'INVALID_CITATION' : (!citations.length ? 'NO_CITATION' : 'CITATION_IDS_VALID'),
        citation_ids_valid: unsupported.length === 0,
        unsupported_citation_ids: unsupported,
        sentence_checks: sentences,
        evidence_support_score,
        review_recommended: !citations.length || !unsupported.length && (evidence_support_score === null || evidence_support_score < 55),
        verifier: 'lexical-overlap-heuristic'
    };
}
module.exports = { verifyGeneratedAnswer };
