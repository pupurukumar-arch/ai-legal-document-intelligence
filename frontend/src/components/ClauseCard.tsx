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
  return (
    <div
      id={`clause-${clause.clause_id}`}
      className={`relative p-4 rounded-lg border bg-[#fffdf8] transition-colors ${
        isHighlighted
          ? 'highlight-target'
          : isActive
          ? 'border-[#5aaec0] bg-[#e9f5f3]'
          : isDependencyHop
          ? 'border-[#9ab7c4] bg-[#f1f6f3]'
          : 'border-[#e1d6bb] hover:border-[#b6a26e]'
      }`}
    >
      {/* Top Header: Canonical Badge + Section Title + Page Number */}
      <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="font-mono text-[11px] font-semibold px-2 py-1 rounded border border-[#c8d8d3] bg-[#edf4f1] text-[#2a6670] tracking-wide uppercase shrink-0"
          >
            {clause.clause_id}
          </span>
          <span className="text-sm text-[#203a55] font-medium truncate tracking-tight">
            {clause.section_title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 ml-auto">
          <Bookmark className="w-3.5 h-3.5" />
          <span>Page {clause.page_number}</span>
        </div>
      </div>

      {/* Main Clause Body Text - Increased size & readability for presentation */}
        <div className={`text-sm text-[#4e5b67] leading-relaxed font-sans whitespace-pre-line mb-3 select-text ${!isActive && !isDependencyHop && !isHighlighted ? 'line-clamp-2' : ''}`}>
        {clause.content}
      </div>

      {/* Clickable Cross-References Section */}
      {clause.cross_references && clause.cross_references.length > 0 && (
        <div className="pt-3.5 border-t border-[#eadfc7] flex items-center flex-wrap gap-2">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mr-1">
            <Hash className="w-3.5 h-3.5" />
            Refers to:
          </span>
          {clause.cross_references.map((ref, idx) => (
            <button
              key={idx}
              onClick={() => onSelectReference && onSelectReference(ref)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#edf4f1] hover:bg-[#dfeee9] text-[#286575] border border-[#c8d8d3] transition-colors group cursor-pointer"
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
