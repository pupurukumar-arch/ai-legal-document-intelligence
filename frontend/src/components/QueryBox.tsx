import React, { useState } from 'react';
import { Search, AlertTriangle, ArrowRight } from 'lucide-react';

interface QueryBoxProps {
  onSearch: (query: string, isMissingEvidenceDemo: boolean) => void;
  isLoading: boolean;
}

export const QueryBox: React.FC<QueryBoxProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState(
    'What are the exclusions to confidential information?'
  );
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSearch(query.trim(), false);
  };

  const handleSelectPreset = (presetText: string, isMissingDemo: boolean) => {
    setQuery(presetText);
    onSearch(presetText, isMissingDemo);
  };

  return (
    <div className="bg-[#111722] p-5 rounded-xl border border-slate-800 mb-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Ask about the contract</h2>
        <p className="text-xs text-slate-500 mt-1">Answers remain linked to the clauses used.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-3">
        <div className="relative flex-1">
          <Search className="w-4.5 h-4.5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Example: What information is excluded?"
            className="w-full pl-11 pr-4 py-3 bg-[#0b0f17] border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-slate-500 transition-colors"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-5 py-3 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
              <span>Searching...</span>
            </>
          ) : (
            <>
              <span>Check contract</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center gap-x-4 gap-y-2 flex-wrap pt-1 text-xs">
          <span className="text-slate-500">Examples</span>

          <button
            type="button"
            onClick={() =>
              handleSelectPreset(
                'What are the exclusions to confidential information?',
                false
              )
            }
            className="text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-700 cursor-pointer"
          >
            What is excluded?
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectPreset(
                'What standard of care is required, and what is the agreement duration?',
                false
              )
            }
            className="text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-700 cursor-pointer"
          >
            Care and duration
          </button>

          <button
            type="button"
            onClick={() =>
              handleSelectPreset(
                'Is Schedule B attached to this agreement, and what protocols does it dictate?',
                true
              )
            }
            className="text-rose-300 hover:text-rose-200 font-medium flex items-center gap-1.5 cursor-pointer"
            title="Queries the dependency graph for an unattached schedule"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            Check missing Schedule B
          </button>
      </div>
    </div>
  );
};
