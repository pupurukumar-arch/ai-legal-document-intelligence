import React from 'react';
import type { QueryResult } from '../types/legal';
import { AlertTriangle, BadgeCheck, CheckCircle2, FileSearch, GitBranch, Link2, ShieldAlert, ShieldCheck } from 'lucide-react';

interface EvidenceChainProps {
  result: QueryResult | null;
  isLoading: boolean;
  onSelectClause: (clauseId: string) => void;
}

export const EvidenceChain: React.FC<EvidenceChainProps> = ({ result, isLoading, onSelectClause }) => {
  if (isLoading) {
    return (
      <div className="h-full min-h-72 flex flex-col items-center justify-center p-8 text-center bg-[#fffdf8] rounded-xl border border-[#ded2b6] shadow-[0_8px_22px_rgba(83,60,20,0.08)]">
        <div className="w-8 h-8 rounded-full border-2 border-[#c9ded8] border-t-[#28758a] animate-spin mb-4" />
        <h3 className="font-semibold text-[#17304e]">Checking the contract…</h3>
        <p className="text-sm text-[#737b7b] mt-2">Finding relevant clauses and verifying their references.</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full min-h-72 flex flex-col items-center justify-center p-10 text-center bg-[#fffdf8] rounded-xl border border-[#ded2b6]">
        <FileSearch className="w-8 h-8 text-slate-500 mb-4" />
        <h3 className="font-medium text-[#17304e]">No answer yet</h3>
        <p className="text-sm text-[#737b7b] mt-2 max-w-sm">Ask a question to see the relevant clauses and their references.</p>
      </div>
    );
  }

  const isAbstain = Boolean(result.is_abstain);
  const isClarification = result.answer_status === 'CLARIFICATION_NEEDED';
  const isUnsupportedDocument = result.answer_status === 'DOCUMENT_TYPE_REVIEW_NEEDED';
  const evidence = [
    ...result.direct_matches.map((clause) => ({ ...clause, role: 'Direct evidence' })),
    ...result.multi_hop_references.map((clause) => ({ ...clause, role: 'Linked clause' })),
  ];
  const verification = result.evidence_verification;
  const guardrails = result.guardrail_summary;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#fffdf8] rounded-xl overflow-hidden border border-[#ded2b6] shadow-[0_8px_22px_rgba(83,60,20,0.08)]">
      <div className={`p-5 border-b ${isAbstain ? 'border-[#e5b6a8]' : 'border-[#e8dcc1]'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAbstain ? 'bg-rose-950 text-rose-300' : isClarification ? 'bg-amber-100 text-amber-700' : 'bg-emerald-950 text-emerald-300'}`}>
            {isAbstain ? <ShieldAlert className="w-5 h-5" /> : isClarification || isUnsupportedDocument ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isAbstain ? 'text-rose-300' : 'text-emerald-300'}`}>
              {isAbstain ? 'Cannot answer safely' : isClarification ? 'Clarification needed' : isUnsupportedDocument ? 'Document type review needed' : 'Relevant evidence found'}
            </p>
            <h3 className="text-base font-medium text-[#17304e] mt-1 leading-relaxed">
              {isAbstain ? result.abstain_reason : result.verdict_summary}
            </h3>
            <p className="text-xs text-[#737b7b] mt-2">
              {isAbstain
                ? 'The system stopped instead of guessing what the missing document contains.'
                : isClarification ? 'Please clarify the follow-up before the system retrieves or interprets contract evidence.'
                : isUnsupportedDocument ? 'Contract-specific analysis is disabled until the document type is confirmed.'
                : 'Review the clauses below before relying on the result.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {verification && !isAbstain && !isClarification && !isUnsupportedDocument && (
          <section className="rounded-xl border border-[#b9d8d9] bg-[#eef8f7] p-3.5">
            <div className="flex gap-2"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#28758a]" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#173f50]">Answer safety check</p><div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4"><Metric label="Citation" value={verification.citation_ids_valid ? 'Valid' : 'Review'} tone={verification.citation_ids_valid ? 'good' : 'warn'} /><Metric label="Evidence support" value={guardrails?.evidence_support_score != null ? `${guardrails.evidence_support_score}%` : 'N/A'} tone={(guardrails?.evidence_support_score || 0) >= 55 ? 'good' : 'warn'} /><Metric label="References" value={guardrails?.required_references_complete ? 'Complete' : 'Missing'} tone={guardrails?.required_references_complete ? 'good' : 'warn'} /><Metric label="Human review" value="Recommended" tone="neutral" /></div><p className="mt-2 text-[10px] leading-4 text-[#6b7779]">Support score is a lexical comparison of answer sentences against cited contract text; it is not a legal-validity score.</p></div></div>
          </section>
        )}
        {!isClarification && !isUnsupportedDocument && (
          <section className="rounded-xl border border-[#d8c8a8] bg-[#fffaf0] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#806b3c]">Evidence trace</p><h4 className="mt-1 text-sm font-semibold text-[#17304e]">Why this result was allowed or stopped</h4></div>
              <GitBranch className="h-5 w-5 text-[#28758a]" />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <TraceStep icon={<FileSearch className="h-3.5 w-3.5" />} label="Direct clauses" value={`${result.direct_matches.length} retrieved`} tone="blue" />
              <TraceStep icon={<Link2 className="h-3.5 w-3.5" />} label="Dependency hops" value={`${result.multi_hop_references.length} linked`} tone="teal" />
              <TraceStep icon={isAbstain ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />} label="Guardrail decision" value={isAbstain ? 'Blocked safely' : 'Evidence released'} tone={isAbstain ? 'warn' : 'good'} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-[#6f746f]"><span className="h-px flex-1 bg-[#d9caa9]"/><span>retrieval → dependency check → verification → response</span><span className="h-px flex-1 bg-[#d9caa9]"/></div>
          </section>
        )}
        {isAbstain && result.missing_references && result.missing_references.length > 0 && (
          <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#837a67] mb-2">Missing evidence</h4>
            {result.missing_references.map((missing) => (
              <div key={missing.normalized_reference} className="flex items-start gap-3 p-3 rounded-xl bg-rose-950/30 border border-rose-800/70">
                <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-rose-200">{missing.reference} was not found</p>
                  <p className="text-slate-400 mt-1">Referenced by {missing.referenced_by || 'a contract clause'}{missing.source_page ? ` on page ${missing.source_page}` : ''}.</p>
                </div>
              </div>
            ))}
          </section>
        )}

        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#837a67] mb-2">Clauses inspected</h4>
          <div className="space-y-2">
            {evidence.length === 0 ? (
              <p className="text-sm text-[#737b7b] p-3 rounded-xl bg-[#f8f1e1]">No matching clause was found.</p>
            ) : (
              evidence.map((clause, index) => (
                <button
                  key={`${clause.clause_id}-${index}`}
                  type="button"
                  onClick={() => onSelectClause(clause.clause_id)}
                  className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg bg-[#fffaf0] hover:bg-[#f5ead1] border border-[#e5d7ba] hover:border-[#b6a26e] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#245d71]">{clause.clause_id}</span>
                      <span className="text-xs text-[#837a67]">Page {clause.page_number}</span>
                    </div>
                    <p className="text-sm font-medium text-[#243b53] truncate mt-1">{clause.section_title}</p>
                  </div>
                  <span className="text-xs text-[#737b7b] shrink-0">{clause.role}</span>
                </button>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

function Metric({ label, value, tone }: { label: string; value: string; tone: 'good' | 'warn' | 'neutral' }) {
  const colors = tone === 'good' ? 'border-[#bad9c7] bg-[#f5fbf4] text-[#347257]' : tone === 'warn' ? 'border-[#ead09a] bg-[#fff9e9] text-[#8a6b27]' : 'border-[#c8d9df] bg-[#f4fafb] text-[#426b76]';
  return <div className={`rounded-lg border px-2 py-2 ${colors}`}><p className="text-[9px] uppercase tracking-wider opacity-75">{label}</p><p className="mt-0.5 text-xs font-semibold">{value}</p></div>;
}

function TraceStep({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'blue' | 'teal' | 'good' | 'warn' }) {
  const colors = tone === 'warn' ? 'border-[#e6b6a9] bg-[#fff2ed] text-[#a64e3d]' : tone === 'good' ? 'border-[#b7d8c5] bg-[#f2faf4] text-[#2f7654]' : tone === 'teal' ? 'border-[#b9d8d9] bg-[#eef8f7] text-[#28758a]' : 'border-[#cad9e1] bg-[#f3f8fa] text-[#356b7c]';
  return <div className={`rounded-lg border px-3 py-2.5 ${colors}`}><div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">{icon}{label}</div><p className="mt-1 text-xs font-semibold">{value}</p></div>;
}
