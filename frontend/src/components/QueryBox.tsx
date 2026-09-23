import React, { useState } from 'react';
import { Search, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

interface QueryBoxProps {
  onSearch: (query: string, isMissingEvidenceDemo: boolean) => void;
  isLoading: boolean;
}

export const QueryBox: React.FC<QueryBoxProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState(
    'What are the exclusions to confidential information?'
  );
  const [isMissingEvidenceToggle, setIsMissingEvidenceToggle] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query.trim(), isMissingEvidenceToggle);
  };

  const handleSelectPreset = (presetText: string, isMissingDemo: boolean) => {
    setQuery(presetText);
    setIsMissingEvidenceToggle(isMissingDemo);
    onSearch(presetText, isMissingDemo);
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-xl mb-4">
      {/* Search Input Bar - Enlarged for presentation view */}
      <form onSubmit={handleSubmit} className="flex items-center gap-3 mb-3.5">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question across the contract hierarchy (e.g., 'What are the exclusions to confidentiality?')..."
            className="w-full pl-12 pr-4 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25 font-sans transition-all"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base flex items-center gap-2.5 shadow-lg shadow-cyan-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <span>Execute Retrieval</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </>
          )}
        </button>
      </form>

      {/* Preset Prompts & Forensic Toggle Bar - Increased button padding & text */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 pt-3 border-t border-slate-800/70 text-xs sm:text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-300 font-mono font-semibold flex items-center gap-1.5 mr-1">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Presets:
          </span>

          <button
            type="button"
            onClick={() =>
              handleSelectPreset(
                'What are the exclusions to confidential information?',
                false
              )
            }
            className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 border border-slate-700/80 transition-colors font-medium text-xs sm:text-sm cursor-pointer shadow-sm"
          >
            Exclusions (Multi-Hop)
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectPreset(
                'What standard of care is required, and what is the agreement duration?',
                false
              )
            }
            className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 border border-slate-700/80 transition-colors font-medium text-xs sm:text-sm cursor-pointer shadow-sm"
          >
            Standard of Care & Duration
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectPreset(
                'Is Schedule B attached to this agreement, and what protocols does it dictate?',
                true
              )
            }
            className="px-3.5 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-200 hover:text-white border border-rose-600/50 transition-colors font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-950/40"
            title="Demonstrates ABSTAIN: Missing Evidence when unattached schedule is queried"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            Is Schedule B Attached? (ABSTAIN Demo)
          </button>
        </div>

        {/* Missing Evidence Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800">
          <input
            type="checkbox"
            checked={isMissingEvidenceToggle}
            onChange={(e) => setIsMissingEvidenceToggle(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-rose-500 focus:ring-rose-500/30 accent-rose-500 cursor-pointer"
          />
          <span className="text-xs sm:text-sm font-mono text-rose-300 font-semibold">
            Simulate Missing Evidence
          </span>
        </label>
      </div>
    </div>
  );
};
