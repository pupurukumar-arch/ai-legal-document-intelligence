import React from 'react';
import type { QueryResult } from '../types/legal';
import {
  ShieldAlert,
  ShieldCheck,
  GitFork,
  CheckCircle,
  AlertTriangle,
  Scale,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface EvidenceChainProps {
  result: QueryResult | null;
  isLoading: boolean;
  onSelectClause: (clauseId: string) => void;
}

export const EvidenceChain: React.FC<EvidenceChainProps> = ({
  result,
  isLoading,
  onSelectClause
}) => {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-slate-800">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full border-3 border-cyan-500/20 border-t-cyan-500 animate-spin flex items-center justify-center"></div>
          <Scale className="w-8 h-8 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Executing Multi-Hop Graph Traversal...</h3>
        <p className="text-sm text-slate-300 mt-2 max-w-md leading-relaxed">
          Traversing legal hierarchy (Articles, Sections, Schedules) and querying clause dependencies in PostgreSQL...
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center glass-panel rounded-2xl border border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
          <Scale className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Forensic Chain-of-Evidence</h3>
        <p className="text-sm text-slate-300 mt-2 max-w-md leading-relaxed">
          Submit a legal query above to trace the step-by-step reasoning path:
          <span className="block mt-2.5 font-mono text-xs sm:text-sm text-cyan-400 font-semibold">
            [Retrieved Clause] → [Dependency Traversal] → [Verification] → [Verdict]
          </span>
        </p>
      </div>
    );
  }

  const isAbstain = result.is_abstain;

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
      {/* Top Banner: Master Verdict Card */}
      <div
        className={`p-5 sm:p-6 border-b transition-all duration-300 ${
          isAbstain
            ? 'bg-gradient-to-r from-red-950/80 via-rose-950/60 to-slate-950 border-rose-600/70 shadow-xl shadow-rose-950/50'
            : 'bg-gradient-to-r from-cyan-950/50 via-indigo-950/40 to-slate-950 border-cyan-500/40'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border ${
                isAbstain
                  ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-500/30 animate-pulse'
                  : 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50'
              }`}
            >
              {isAbstain ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
            </div>

            <div>
              {/* Prominent Red ABSTAIN Badge or Verified Badge - Enlarged to text-sm/text-base */}
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {isAbstain ? (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm sm:text-base font-mono font-extrabold bg-rose-600 text-white shadow-xl shadow-rose-600/50 border border-rose-300 tracking-wider uppercase animate-bounce">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    ABSTAIN: Missing Evidence
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm sm:text-base font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 tracking-wide uppercase shadow-sm">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    VERIFIED LEGAL PROVENANCE
                  </span>
                )}

                <span className="text-xs sm:text-sm font-mono text-slate-300 font-medium">
                  {result.total_context_clauses} Nodes Evaluated
                </span>
              </div>

              {/* Verdict Summary Text - Enlarged for presentation view */}
              <p
                className={`text-sm sm:text-base leading-relaxed font-sans font-medium ${
                  isAbstain ? 'text-rose-100 font-semibold' : 'text-slate-100'
                }`}
              >
                {isAbstain ? result.abstain_reason : result.verdict_summary}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Step Chain-of-Evidence Pipeline */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs sm:text-sm text-slate-300 uppercase tracking-wider font-bold font-mono">
          <span>Forensic Reasoning Steps</span>
          <span>Provenance Score</span>
        </div>

        {result.evidence_steps &&
          result.evidence_steps.map((step) => {
            const isStepAbstain = step.status === 'abstain';

            return (
              <div
                key={step.step_number}
                className={`relative p-4 sm:p-5 rounded-xl transition-all border ${
                  isStepAbstain
                    ? 'bg-rose-950/25 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Step Header: Step Number + Enlarged Title + Badge */}
                <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs sm:text-sm font-mono font-bold shrink-0 ${
                        isStepAbstain
                          ? 'bg-rose-500 text-white'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {step.step_number}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
                      {step.title}
                    </h4>
                  </div>

                  <span
                    className={`text-xs sm:text-sm font-mono font-semibold px-3 py-1 rounded-md border ${
                      isStepAbstain
                        ? 'bg-rose-500/25 text-rose-300 border-rose-500/50'
                        : 'bg-slate-800/90 text-cyan-300 border-slate-700'
                    }`}
                  >
                    {step.badge}
                  </span>
                </div>

                {/* Step Description - Enlarged font size */}
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed pl-10 mb-3">
                  {step.details}
                </p>

                {/* Citation & Action Footer */}
                {step.source_citation && (
                  <div className="pl-10 flex items-center justify-between pt-2.5 border-t border-slate-800/70 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-slate-300 font-mono">
                      <GitFork className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="font-medium">Node: {step.source_citation}</span>
                    </div>

                    {/* Jump to citation button if valid code */}
                    {step.source_citation.includes('SEC-') && (
                      <button
                        onClick={() => onSelectClause('SEC-1.2')}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-mono font-semibold hover:underline cursor-pointer"
                      >
                        Inspect in Document <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* Multi-Hop Traversal Summary Card */}
        {result.multi_hop_references && result.multi_hop_references.length > 0 && (
          <div className="p-4 sm:p-5 rounded-xl bg-slate-900/50 border border-slate-800">
            <h4 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
              <GitFork className="w-4 h-4 text-indigo-400" />
              Traversed Graph Nodes ({result.multi_hop_references.length})
            </h4>

            <div className="space-y-2.5">
              {result.multi_hop_references.map((hop, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs sm:text-sm font-mono"
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    <span className="text-xs px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      Hop {hop.hop_level}
                    </span>
                    <span className="font-bold text-slate-100 shrink-0">{hop.clause_id}</span>
                    <span className="text-slate-300 truncate font-medium">
                      {hop.section_title}
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-slate-400 shrink-0 ml-3 bg-slate-900 px-2 py-0.5 rounded">
                    {hop.relation_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Forensic Verification Signature Footer */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm text-slate-300 font-mono">
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Forensic Hallucination Prevention Active
        </span>
        <span className="text-slate-400">pgvector + HNSW Graph Traversal</span>
      </div>
    </div>
  );
};
