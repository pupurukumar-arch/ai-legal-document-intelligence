import React, { useState, useEffect, useRef } from 'react';
import type { Contract } from '../types/legal';
import { ClauseCard } from './ClauseCard';
import { FileText, Search, Layers, Clock, CheckCircle2 } from 'lucide-react';

interface DocumentViewerProps {
  contract: Contract;
  activeClauseId: string | null;
  highlightedClauseId: string | null;
  seedClauseIds: string[];
  hopClauseIds: string[];
  onSelectReference: (reference: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  contract,
  activeClauseId,
  highlightedClauseId,
  seedClauseIds,
  hopClauseIds,
  onSelectReference,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter clauses based on user search filter
  const filteredClauses = contract.clauses.filter((c) => {
    const q = searchFilter.toLowerCase();
    return (
      c.clause_id.toLowerCase().includes(q) ||
      c.section_title.toLowerCase().includes(q) ||
      c.content.toLowerCase().includes(q)
    );
  });

  // Auto-scroll to highlighted or active clause
  useEffect(() => {
    const targetId = highlightedClauseId || activeClauseId;
    if (targetId) {
      const el = document.getElementById(`clause-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedClauseId, activeClauseId]);

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/70 flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 truncate">
                <span className="truncate">{contract.filename}</span>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  PARSED
                </span>
              </h2>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-300 mt-1">
                <span className="flex items-center gap-1.5 font-mono">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  {contract.total_clauses} Structural Clauses
                </span>
                <span>•</span>
                <span className="font-mono">{contract.total_pages} Pages</span>
                {contract.parser_time_ms && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-cyan-400 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {contract.parser_time_ms}ms
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs sm:text-sm text-slate-200 font-medium shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Layout Chunking</span>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter clauses by ID, title, or keywords..."
            className="w-full pl-10 pr-16 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Clause Blocks Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scroll-smooth"
      >
        {filteredClauses.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Search className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-base font-semibold text-slate-300">No clauses match '{searchFilter}'</p>
            <p className="text-sm mt-1 text-slate-400">Try clearing the search filter</p>
          </div>
        ) : (
          filteredClauses.map((clause) => {
            const isHighlighted =
              highlightedClauseId === clause.clause_id ||
              highlightedClauseId === clause.id;
            const isSeed = seedClauseIds.includes(clause.clause_id);
            const isHop = hopClauseIds.includes(clause.clause_id);

            return (
              <ClauseCard
                key={clause.id || clause.clause_id}
                clause={clause}
                isActive={isSeed}
                isDependencyHop={isHop}
                isHighlighted={isHighlighted}
                onSelectReference={onSelectReference}
              />
            );
          })
        )}
      </div>

      {/* Bottom Panel Footer */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs sm:text-sm text-slate-300 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
            Direct Match
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50"></span>
            Graph Hop
          </span>
        </div>
        <span className="text-slate-400">Click any cross-reference link to jump</span>
      </div>
    </div>
  );
};
