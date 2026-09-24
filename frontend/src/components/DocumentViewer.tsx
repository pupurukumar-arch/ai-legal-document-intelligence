import React, { useState, useEffect, useRef } from 'react';
import type { Contract } from '../types/legal';
import { ClauseCard } from './ClauseCard';
import { FileText, Search } from 'lucide-react';

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
    <div className="flex flex-col h-full bg-[#111722] rounded-xl overflow-hidden border border-slate-800">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 mb-1">Current document</p>
              <h2 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center gap-2 truncate">
                <span className="truncate">{contract.filename}</span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span>{contract.total_clauses} clauses</span>
                <span>•</span>
                <span>{contract.total_pages} pages</span>
                <span>•</span>
                <span className="text-emerald-400">Ready</span>
              </div>
            </div>
          </div>

        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Find a clause or keyword..."
            className="w-full pl-10 pr-16 py-2.5 bg-[#0b0f17] border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors font-sans"
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
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 scroll-smooth"
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
      <div className="px-5 py-3 bg-[#0b0f17] border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Direct evidence
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            Linked clause
          </span>
        </div>
        <span className="hidden sm:inline text-slate-400">Select a reference to open its clause</span>
      </div>
    </div>
  );
};
