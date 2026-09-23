import React from 'react';
import type { Clause } from '../types/legal';
import { ExternalLink, Hash, Bookmark } from 'lucide-react';

interface ClauseCardProps {
  clause: Clause;
  isActive?: boolean;
  isHighlighted?: boolean;
  isDependencyHop?: boolean;
  onSelectReference?: (reference: string) => void;
}

export const ClauseCard: React.FC<ClauseCardProps> = ({
  clause,
  isActive = false,
  isHighlighted = false,
  isDependencyHop = false,
  onSelectReference
}) => {
  // Determine canonical badge style with rich background & borders
  const getBadgeStyle = (cid: string) => {
    if (cid.startsWith('SEC-')) {
      return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10';
    }
    if (cid.startsWith('CLAUSE-')) {
      return 'bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10';
    }
    if (cid.startsWith('SCHED-') || cid.startsWith('EXHIBIT-')) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10';
    }
    if (cid.startsWith('ART-')) {
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/10';
    }
    return 'bg-slate-500/15 text-slate-200 border-slate-500/40';
  };

  return (
    <div
      id={`clause-${clause.clause_id}`}
      className={`relative p-5 sm:p-6 rounded-2xl transition-all duration-300 glass-card ${
        isHighlighted
          ? 'highlight-target'
          : isActive
          ? 'border-cyan-500/90 bg-slate-900/95 shadow-xl shadow-cyan-500/15 ring-1 ring-cyan-500/30'
          : isDependencyHop
          ? 'border-indigo-500/50 bg-indigo-950/25 ring-1 ring-indigo-500/20'
          : 'hover:border-slate-600/90'
      }`}
    >
      {/* Top Header: Canonical Badge + Section Title + Page Number */}
      <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`font-mono text-sm sm:text-base font-bold px-3 py-1 rounded-lg border tracking-wide uppercase shrink-0 ${getBadgeStyle(
              clause.clause_id
            )}`}
          >
            {clause.clause_id}
          </span>
          <span className="text-base sm:text-lg text-slate-100 font-semibold truncate tracking-tight">
            {clause.section_title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-400 font-mono shrink-0 ml-auto">
          <Bookmark className="w-4 h-4 text-cyan-400/80" />
          <span>Page {clause.page_number}</span>
        </div>
      </div>

      {/* Main Clause Body Text - Increased size & readability for presentation */}
      <div className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans whitespace-pre-line mb-4 select-text">
        {clause.content}
      </div>

      {/* Clickable Cross-References Section */}
      {clause.cross_references && clause.cross_references.length > 0 && (
        <div className="pt-3.5 border-t border-slate-800/90 flex items-center flex-wrap gap-2">
          <span className="text-xs sm:text-sm uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5 mr-1">
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            Cross-References:
          </span>
          {clause.cross_references.map((ref, idx) => (
            <button
              key={idx}
              onClick={() => onSelectReference && onSelectReference(ref)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-mono font-semibold bg-slate-800/90 hover:bg-cyan-950/70 text-cyan-300 hover:text-cyan-100 border border-slate-700 hover:border-cyan-400/60 shadow-sm transition-all duration-200 group cursor-pointer"
              title={`Jump to referenced clause: ${ref}`}
            >
              <span>{ref}</span>
              <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
