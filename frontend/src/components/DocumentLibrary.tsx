import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { BookOpen, Database, FileText, LoaderCircle, RefreshCw, Trash2, X } from 'lucide-react';
import type { Contract } from '../types/legal';
import { deletePersistedContract, listPersistedContracts, loadPersistedContract, type PersistedContractSummary } from '../services/api';

interface DocumentLibraryProps {
  isOpen: boolean;
  isOfflineMode: boolean;
  onClose: () => void;
  onOpenContract: (contract: Contract) => void;
}

const prettyType = (value?: string) => (value || 'Unclassified').replace(/_/g, ' ');

export function DocumentLibrary({ isOpen, isOfflineMode, onClose, onOpenContract }: DocumentLibraryProps) {
  const [documents, setDocuments] = useState<PersistedContractSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isOfflineMode) return;
    setIsLoading(true); setError(null);
    try { setDocuments(await listPersistedContracts()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load the document library.'); }
    finally { setIsLoading(false); }
  }, [isOfflineMode]);

  useEffect(() => { if (isOpen) void refresh(); }, [isOpen, refresh]);

  const openDocument = async (id: string) => {
    setOpeningId(id); setError(null);
    try { onOpenContract(await loadPersistedContract(id)); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not open this contract.'); }
    finally { setOpeningId(null); }
  };
  const removeDocument = async (document: PersistedContractSummary) => {
    const label = document.filename || `${prettyType(document.document_type)} contract`;
    if (!window.confirm(`Remove “${label}” from the local ChromaDB library? This cannot be undone.`)) return;
    setDeletingId(document.id); setError(null);
    try { await deletePersistedContract(document.id); setDocuments(items => items.filter(item => item.id !== document.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not remove this contract.'); }
    finally { setDeletingId(null); }
  };

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#342a18]/35 p-4 backdrop-blur-sm">
    <div role="dialog" aria-modal="true" aria-label="Document library" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#d9c8a4] bg-[#fffdf8] shadow-2xl shadow-[#6f5524]/20">
      <div className="flex items-center justify-between border-b border-[#e6dac0] px-5 py-4">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#a9cfd2] bg-[#e8f5f3]"><BookOpen className="h-4 w-4 text-[#267787]" /></div><div><h2 className="text-sm font-semibold text-[#17304e]">Document library</h2><p className="text-[11px] text-[#7a7b70]">Contracts saved in the local workspace</p></div></div>
        <div className="flex items-center gap-2"><button onClick={refresh} disabled={isLoading || isOfflineMode} className="rounded-lg border border-[#ded2b6] bg-[#fffaf0] p-2 text-[#65727a] hover:border-[#80a9b4] hover:text-[#17304e] disabled:opacity-40" title="Refresh library"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></button><button onClick={onClose} className="rounded-lg p-2 text-[#65727a] hover:bg-[#f5ead1] hover:text-[#17304e]" title="Close library"><X className="h-5 w-5" /></button></div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-5">
        {isOfflineMode ? <Empty icon={<Database className="h-7 w-7" />} title="Switch to Live backend" detail="The document library is available when live services are enabled." />
          : isLoading && !documents.length ? <Empty icon={<LoaderCircle className="h-7 w-7 animate-spin" />} title="Loading library" detail="Reading stored contract metadata." />
          : error ? <div className="rounded-xl border border-[#e5b6a8] bg-[#fff0e9] p-4 text-sm text-[#8f402f]">{error}</div>
          : !documents.length ? <Empty icon={<FileText className="h-7 w-7" />} title="No saved contracts yet" detail="Upload one or open a demo document to begin." />
          : <div className="space-y-2">{documents.map(document => <div key={document.id} className="flex items-center gap-3 rounded-xl border border-[#e5d7ba] bg-[#fffaf0] p-3.5 hover:border-[#b6a26e]"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf4f1] text-[#2b7790]"><FileText className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#243b53]">{document.filename || `${prettyType(document.document_type)} contract`}</p><p className="mt-1 text-[11px] capitalize text-[#837a67]">{prettyType(document.document_type)} · {document.total_clauses || document.vector_indexed_clauses || 0} clauses</p></div><button onClick={() => removeDocument(document)} disabled={Boolean(deletingId || openingId)} className="rounded-lg border border-[#decda7] p-2 text-[#8a7b63] hover:border-[#d9917d] hover:bg-[#fff0e9] hover:text-[#b85a45] disabled:opacity-50" title="Remove from local library">{deletingId === document.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button><button onClick={() => openDocument(document.id)} disabled={Boolean(openingId || deletingId)} className="rounded-lg bg-[#17304e] px-3 py-2 text-xs font-semibold text-white hover:bg-[#24496d] disabled:opacity-60">{openingId === document.id ? 'Opening…' : 'Open'}</button></div>)}</div>}
      </div>
      <div className="border-t border-[#e6dac0] bg-[#f9f0dc] px-5 py-3 text-[11px] text-[#7a745f]">The library stores document clauses and embeddings. It is not a legal record-management system.</div>
    </div>
  </div>;
}

function Empty({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="flex min-h-48 flex-col items-center justify-center text-center text-[#737b7b]"><div className="mb-3 text-[#76919b]">{icon}</div><p className="text-sm font-medium text-[#243b53]">{title}</p><p className="mt-1 max-w-sm text-xs leading-5">{detail}</p></div>;
}
