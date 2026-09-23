import React from 'react';
import { Scale, UploadCloud, Shield } from 'lucide-react';
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
    <header className="px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center">
            <Scale className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              AI Legal Document Intelligence Platform
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 tracking-wide uppercase">
              MID-VIVA DEMO
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Structural Layout Chunking • Multi-Hop pgvector Retrieval • Chain-of-Evidence Forensic Engine
          </p>
        </div>
      </div>

      {/* Center/Right: Health Status, Mode Toggle, and Actions */}
      <div className="flex items-center gap-3">
        {/* Microservice Health Indicators */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            <span className="text-[11px]">
              {healthStatus.isOnline ? 'Bridge :3050 Online' : 'Bridge :3050 Standby'}
            </span>
          </div>

          <span className="text-slate-600">|</span>

          <div className="flex items-center gap-1.5 text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus.python_parser === 'reachable'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-cyan-400'
              }`}
            ></span>
            <span className="text-[11px]">Parser :8000 (PyMuPDF)</span>
          </div>
        </div>

        {/* Presentation Safe Mode Switch */}
        <button
          type="button"
          onClick={onToggleOfflineMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border cursor-pointer ${
            isOfflineMode
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
          }`}
          title="Toggle between Live API calls and Verified Offline Data for Presentation Safety"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{isOfflineMode ? 'Presentation Mode (Mock)' : 'Live Services Mode'}</span>
        </button>

        {/* Upload Contract Button */}
        <button
          type="button"
          onClick={onOpenUpload}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 hover:border-cyan-500/50 shadow-md transition-all cursor-pointer"
        >
          <UploadCloud className="w-4 h-4 text-cyan-400" />
          <span>Upload Contract</span>
        </button>
      </div>
    </header>
  );
};
