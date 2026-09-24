import React from 'react';
import type { QueryResult } from '../types/legal';
import { AlertTriangle, CheckCircle2, FileSearch, ShieldAlert } from 'lucide-react';

interface EvidenceChainProps {
  result: QueryResult | null;
  isLoading: boolean;
  onSelectClause: (clauseId: string) => void;
}

export const EvidenceChain: React.FC<EvidenceChainProps> = ({ result, isLoading, onSelectClause }) => {
  if (isLoading) {
    return (
      <div className="h-full min-h-72 flex flex-col items-center justify-center p-8 text-center bg-[#111722] rounded-xl border border-slate-800">
        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-slate-300 animate-spin mb-4" />
        <h3 className="font-semibold text-white">Checking the contract…</h3>
        <p className="text-sm text-slate-400 mt-2">Finding relevant clauses and verifying their references.</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full min-h-72 flex flex-col items-center justify-center p-10 text-center bg-[#111722] rounded-xl border border-slate-800">
        <FileSearch className="w-8 h-8 text-slate-500 mb-4" />
        <h3 className="font-medium text-slate-200">No result yet</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">Ask a question to see the relevant clauses and their references.</p>
      </div>
    );
  }

  const isAbstain = Boolean(result.is_abstain);
  const evidence = [
    ...result.direct_matches.map((clause) => ({ ...clause, role: 'Direct evidence' })),
    ...result.multi_hop_references.map((clause) => ({ ...clause, role: 'Linked clause' })),
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#111722] rounded-xl overflow-hidden border border-slate-800">
      <div className={`p-5 border-b ${isAbstain ? 'border-rose-900' : 'border-slate-800'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAbstain ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'}`}>
            {isAbstain ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isAbstain ? 'text-rose-300' : 'text-emerald-300'}`}>
              {isAbstain ? 'Cannot answer safely' : 'Relevant evidence found'}
            </p>
            <h3 className="text-base font-medium text-white mt-1 leading-relaxed">
              {isAbstain ? result.abstain_reason : result.verdict_summary}
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              {isAbstain
                ? 'The system stopped instead of guessing what the missing document contains.'
                : 'Review the clauses below before relying on the result.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {isAbstain && result.missing_references && result.missing_references.length > 0 && (
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Missing evidence</h4>
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
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Clauses inspected</h4>
          <div className="space-y-2">
            {evidence.length === 0 ? (
              <p className="text-sm text-slate-400 p-3 rounded-xl bg-slate-900">No matching clause was found.</p>
            ) : (
              evidence.map((clause, index) => (
                <button
                  key={`${clause.clause_id}-${index}`}
                  type="button"
                  onClick={() => onSelectClause(clause.clause_id)}
                  className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0e1420] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-300">{clause.clause_id}</span>
                      <span className="text-xs text-slate-500">Page {clause.page_number}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-100 truncate mt-1">{clause.section_title}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{clause.role}</span>
                </button>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
};
