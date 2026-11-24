import React, { useState, useRef } from 'react';
import type { Contract } from '../types/legal';
import { uploadContractPdf } from '../services/api';
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  GitFork
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContractUploaded: (contract: Contract) => void;
  isOfflineMode: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onContractUploaded,
  isOfflineMode,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<Contract | null>(null);
  const [documentType, setDocumentType] = useState('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Only PDF documents are supported for structural hierarchy parsing.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setUploadStatus('Streaming PDF to Python FastAPI parser (:8000)...');

    try {
      setTimeout(() => {
        setUploadStatus('Executing structural layout chunking (PyMuPDF fitz)...');
      }, 700);

      setTimeout(() => {
        setUploadStatus('Indexing clause embeddings in ChromaDB and linking references...');
      }, 1400);

      const result = await uploadContractPdf(file, isOfflineMode, documentType);
      setIsUploading(false);
      setSuccessResult(result.contract);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Failed to upload and parse contract.');
    }
  };

  const handleComplete = () => {
    if (successResult) {
      onContractUploaded(successResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden p-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-100">Upload PDF Contract</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State Screen */}
        {successResult ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">
                  Parsing & Ingestion Complete
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {successResult.filename} was successfully chunked and indexed.
                </p>
                <p className="mt-1 text-[11px] text-emerald-200/80">
                  Detected type: {(successResult.document_type || 'unknown').replace(/_/g, ' ')} · {successResult.vector_indexed_clauses ?? successResult.total_clauses} vectors stored
                </p>
              </div>
            </div>

            {/* Parsing Telemetry Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <Layers className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-base font-bold font-mono text-slate-100">
                  {successResult.total_clauses}
                </div>
                <div className="text-[11px] text-slate-400">Clauses Extracted</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <GitFork className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <div className="text-base font-bold font-mono text-slate-100">
                  {successResult.dependencies_linked ?? 0}
                </div>
                <div className="text-[11px] text-slate-400">Graph Links</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-base font-bold font-mono text-slate-100">
                  {successResult.parser_time_ms ?? 0}ms
                </div>
                <div className="text-[11px] text-slate-400">Parser Latency</div>
              </div>
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/20 transition-all cursor-pointer mt-4"
            >
              Open in Document Viewer
            </button>
          </div>
        ) : (
          /* Upload Dropzone Form */
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-300">Document type for policy review</label>
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
              <option value="auto">Auto-classify from document text</option>
              <option value="nda">Mutual NDA</option>
              <option value="rental_agreement">Residential Rent Agreement</option>
              <option value="employment_agreement">Employment Agreement</option>
              <option value="service_agreement">Software Service Agreement</option>
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-cyan-400 bg-cyan-950/20 scale-[0.99]'
                  : 'border-slate-700/80 hover:border-cyan-500/50 bg-slate-900/40 hover:bg-slate-900/70'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                Click to browse or drag and drop contract PDF
              </p>
              <p className="text-xs text-slate-400 mt-1">
                PyMuPDF extracts Articles, Sections, Clauses & Cross-References
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Uploading Status Spinner */}
            {isUploading && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-center">
                <div className="w-5 h-5 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto"></div>
                <p className="text-xs font-mono text-cyan-400">{uploadStatus}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
