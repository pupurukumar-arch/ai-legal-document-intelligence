import React from 'react';
import { BookOpen, Scale, UploadCloud } from 'lucide-react';
import type { BackendHealthStatus } from '../services/api';

interface HeaderProps {
  healthStatus: BackendHealthStatus;
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
  onOpenUpload: () => void;
  onOpenLibrary: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  healthStatus,
  isOfflineMode,
  onToggleOfflineMode,
  onOpenUpload,
  onOpenLibrary
}) => {
  return (
    <header className="px-4 sm:px-6 py-3.5 border-b border-[#decda7] bg-[#fffaf0]/95 backdrop-blur flex items-center justify-between gap-3 sticky top-0 z-40">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3.5">
        <div className="hidden sm:flex w-9 h-9 rounded-lg border border-cyan-300/30 bg-gradient-to-br from-blue-500 to-cyan-500 items-center justify-center shadow-lg shadow-blue-950/40">
          <Scale className="w-4.5 h-4.5 text-white" />
        </div>

        <div>
          <h1 className="text-sm sm:text-base font-semibold tracking-tight text-[#142846]">
            Contract Evidence Assistant
          </h1>
          <p className="hidden sm:block text-[11px] text-[#7a745f]">
            Contract review, made clear
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
              ? 'bg-[#f5ead1] text-[#554622] border-[#ddc78e] hover:border-[#c7a85d]'
              : 'bg-emerald-300 text-emerald-950 border-emerald-300'
          }`}
          title="Switch between prepared sample data and the live backend"
        >
          <span>{isOfflineMode ? 'Sample data' : 'Live backend'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenLibrary}
          className="hidden sm:flex px-3 py-2 rounded-lg text-xs font-medium border border-[#d9c8a4] bg-white text-[#334155] hover:border-[#80a9b4] hover:text-[#17304e] transition-colors cursor-pointer items-center gap-2"
          title="Open contracts saved in the local ChromaDB document library"
        >
          <BookOpen className="w-4 h-4" />
          <span>Library</span>
        </button>

        {/* Upload Contract Button */}
        <button
          type="button"
          onClick={onOpenUpload}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white text-xs font-semibold flex items-center gap-2 border border-cyan-300/30 shadow-lg shadow-blue-950/40 transition-colors cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span className="hidden sm:inline">Upload PDF</span>
        </button>
      </div>
    </header>
  );
};
