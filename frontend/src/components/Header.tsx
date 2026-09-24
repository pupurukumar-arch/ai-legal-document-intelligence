import React from 'react';
import { Scale, UploadCloud } from 'lucide-react';
import type { BackendHealthStatus } from '../services/api';

interface HeaderProps {
  healthStatus: BackendHealthStatus;
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
  onOpenUpload: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  healthStatus,
  isOfflineMode,
  onToggleOfflineMode,
  onOpenUpload
}) => {
  return (
    <header className="px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-[#0b0f17] flex items-center justify-between gap-3 sticky top-0 z-40">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3.5">
        <div className="hidden sm:flex w-9 h-9 rounded-lg border border-slate-700 bg-slate-900 items-center justify-center">
          <Scale className="w-4.5 h-4.5 text-slate-200" />
        </div>

        <div>
          <h1 className="text-sm sm:text-base font-semibold tracking-tight text-white">
            Contract Evidence Assistant
          </h1>
          <p className="hidden sm:block text-[11px] text-slate-500">
            Evidence-linked contract review
          </p>
        </div>
      </div>

      {/* Center/Right: Health Status, Mode Toggle, and Actions */}
      <div className="flex items-center gap-3">
        {/* Microservice Health Indicators */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
          <span className={`w-2 h-2 rounded-full ${healthStatus.isOnline && healthStatus.python_parser === 'reachable' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span>{healthStatus.isOnline ? 'Services ready' : 'Sample mode ready'}</span>
        </div>

        {/* Presentation Safe Mode Switch */}
        <button
          type="button"
          onClick={onToggleOfflineMode}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
            isOfflineMode
              ? 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
              : 'bg-slate-100 text-slate-950 border-slate-100'
          }`}
          title="Switch between prepared sample data and the live backend"
        >
          <span>{isOfflineMode ? 'Sample data' : 'Live backend'}</span>
        </button>

        {/* Upload Contract Button */}
        <button
          type="button"
          onClick={onOpenUpload}
          className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-950 text-xs font-semibold flex items-center gap-2 border border-slate-100 transition-colors cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">Upload PDF</span>
        </button>
      </div>
    </header>
  );
};
