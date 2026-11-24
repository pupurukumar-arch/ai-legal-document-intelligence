import React, { useState, useEffect } from 'react';
import type { Contract, QueryResult } from './types/legal';
import { INITIAL_MOCK_CONTRACT } from './data/mockContract';
import { checkBackendHealth, queryContract, type BackendHealthStatus } from './services/api';
import { Header } from './components/Header';
import { DocumentViewer } from './components/DocumentViewer';
import { QueryBox } from './components/QueryBox';
import { EvidenceChain } from './components/EvidenceChain';
import { UploadModal } from './components/UploadModal';
import { ContractDeck } from './components/ContractDeck';
import { ReviewPanel } from './components/ReviewPanel';
import { RedlinePanel } from './components/RedlinePanel';
import { DocumentLibrary } from './components/DocumentLibrary';
import { WorkspaceSidebar, type WorkspaceView } from './components/WorkspaceSidebar';
import { ConversationHistory, type ConversationTurn } from './components/ConversationHistory';
import { DEMO_WORKSPACES, buildDemoAnswer, type DemoWorkspace } from './data/demoContracts';

export const App: React.FC = () => {
  // Master Contract State (defaults to rich viva presentation contract)
  const [contract, setContract] = useState<Contract>(INITIAL_MOCK_CONTRACT);
  const [selectedDemo, setSelectedDemo] = useState<DemoWorkspace>(DEMO_WORKSPACES[0]);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceView>('home');

  // Keep the workspace quiet until the reviewer asks a question.
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [lastAnswerCitations, setLastAnswerCitations] = useState<string[]>([]);

  // Interactive Highlighting across panels
  const [activeClauseId, setActiveClauseId] = useState<string | null>('SEC-1.2');
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null);

  // Health and Offline Mode Safety
  const [healthStatus, setHealthStatus] = useState<BackendHealthStatus>({
    isOnline: false,
    database: 'probing',
    python_parser: 'probing',
    service: 'probing',
  });
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Check health on boot
  useEffect(() => {
    checkBackendHealth().then((status) => {
      setHealthStatus(status);
      // Stay in the clearly labelled sample-data mode until the presenter
      // deliberately switches to live services and uploads a real document.
    });
  }, []);

  // Compute seed and hop IDs for visual styling in Document Viewer
  const seedClauseIds = queryResult
    ? queryResult.direct_matches.map((c) => c.clause_id)
    : [];
  const hopClauseIds = queryResult
    ? queryResult.multi_hop_references.map((h) => h.clause_id)
    : [];

  // Handle Query Execution
  const handleExecuteQuery = async (
    queryText: string,
    isMissingEvidenceDemo: boolean
  ) => {
    setIsLoadingQuery(true);
    const historyBeforeQuestion = conversation.slice(-4);
    setConversation(turns => [...turns, { role: 'user', content: queryText }]);
    try {
      const res = isOfflineMode && selectedDemo.contract.id === contract.id && !isMissingEvidenceDemo
        ? buildDemoAnswer(selectedDemo, queryText)
        : await queryContract(queryText, contract.id, isMissingEvidenceDemo, isOfflineMode, historyBeforeQuestion, lastAnswerCitations);
      setQueryResult(res);
      const assistantText = res.is_abstain ? (res.abstain_reason || 'I cannot answer safely from the available contract evidence.') : (res.verdict_summary || 'I found relevant contract evidence.');
      setConversation(turns => [...turns, { role: 'assistant', content: assistantText, citations: res.answer_citations }]);
      setLastAnswerCitations(res.answer_citations || []);

      // Auto-focus seed clause if present
      if (res.direct_matches && res.direct_matches.length > 0) {
        const seedId = res.direct_matches[0].clause_id;
        setActiveClauseId(seedId);
        triggerHighlight(seedId);
      }
    } catch (err) {
      console.error('Query execution error:', err);
    } finally {
      setIsLoadingQuery(false);
    }
  };

  // Helper to trigger pulse animation on target clause
  const triggerHighlight = (clauseId: string) => {
    setHighlightedClauseId(null);
    setTimeout(() => {
      setHighlightedClauseId(clauseId);
    }, 50);
  };

  // Handle Cross-Reference click in Document Viewer
  const handleSelectReference = (reference: string) => {
    console.log('[Document Viewer] User clicked cross-reference:', reference);
    // Normalize reference (e.g. "Section 1.1" -> "SEC-1.1", "Schedule A" -> "SCHED-A")
    const clean = reference.trim();
    let targetCid = clean;

    if (/section\s*1\.1/i.test(clean)) targetCid = 'SEC-1.1';
    else if (/section\s*1\.2/i.test(clean)) targetCid = 'SEC-1.2';
    else if (/section\s*2\.1/i.test(clean)) targetCid = 'SEC-2.1';
    else if (/schedule\s*a/i.test(clean)) targetCid = 'SCHED-A';
    else if (/clause\s*3\.1/i.test(clean)) targetCid = 'CLAUSE-3.1';
    else if (/article\s*2/i.test(clean)) targetCid = 'ART-2';

    // Verify if clause exists in contract
    const match = contract.clauses.find(
      (c) =>
        c.clause_id.toLowerCase() === targetCid.toLowerCase() ||
        c.section_title.toLowerCase().includes(clean.toLowerCase())
    );

    if (match) {
      setActiveClauseId(match.clause_id);
      triggerHighlight(match.clause_id);
    } else {
      // Missing reference scenario
      triggerHighlight(targetCid);
    }
  };

  const selectDemo = (demo: DemoWorkspace) => {
    setSelectedDemo(demo);
    setContract(demo.contract);
    setQueryResult(null);
    setConversation([]); setLastAnswerCitations([]);
    setActiveClauseId(demo.contract.clauses[0]?.clause_id || null);
    setWorkspaceTab('document');
  };
  const supportedTypes = new Set(DEMO_WORKSPACES.map(item => item.kind));
  const activeWorkspace: DemoWorkspace = contract.id === selectedDemo.contract.id
    ? selectedDemo
    : {
        kind: (supportedTypes.has(contract.document_type as DemoWorkspace['kind']) ? contract.document_type : selectedDemo.kind) as DemoWorkspace['kind'],
        label: contract.document_type ? `${contract.document_type.replace(/_/g, ' ')} document` : 'Uploaded document',
        shortLabel: 'Upload', description: 'Live uploaded contract', accent: 'border-cyan-400', contract, question: '', review: []
      };

  return (
    <div className="flex flex-col min-h-screen lg:h-screen w-full bg-[#f7f0df] text-slate-900 overflow-y-auto lg:overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        healthStatus={healthStatus}
        isOfflineMode={isOfflineMode}
        onToggleOfflineMode={() => setIsOfflineMode(!isOfflineMode)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
      />

      <main className="w-full flex-1 lg:overflow-hidden flex gap-0">
        <WorkspaceSidebar activeView={workspaceTab} onSelect={setWorkspaceTab} filename={contract.filename} />
        <div className="min-w-0 flex-1 flex flex-col gap-4 p-4 sm:p-6 lg:overflow-hidden">
        {workspaceTab === 'home' && <section className="rise-in relative overflow-hidden rounded-2xl border border-[#c9b781] bg-gradient-to-br from-[#fffdf7] via-[#f5e8cb] to-[#ddc38b] px-5 py-6 sm:px-7 shadow-[0_16px_40px_rgba(37,43,47,0.18)]">
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#d7b467]/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#88703d]">Legal document intelligence</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#142846]">Review contracts with clear evidence.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#5d6470]">Choose a sample agreement or upload your own PDF. Ask a question, review flagged clauses, or prepare a negotiation draft.</p></div><div className="flex flex-wrap gap-2 text-[11px] font-medium"><span className="rounded-full border border-[#d8c79f] bg-white/70 px-3 py-1.5 text-[#334155]">{contract.filename}</span><span className="rounded-full border border-[#a9c8d4] bg-[#e3f1f1] px-3 py-1.5 capitalize text-[#1c6171]">{(contract.document_type || activeWorkspace.kind).replace(/_/g, ' ')}</span>{!isOfflineMode && <span className="rounded-full border border-[#b9d3bb] bg-[#edf7eb] px-3 py-1.5 text-[#386443]">{contract.vector_indexed_clauses || contract.total_clauses} clauses indexed</span>}</div></div>
        </section>}
        {workspaceTab === 'home' && <><ContractDeck demos={DEMO_WORKSPACES} activeId={contract.id} onSelect={selectDemo} /><section className="rise-in grid gap-3 md:grid-cols-3">{[{ title: 'Ask about it', detail: 'Get an answer with the supporting clauses.', view: 'answer' as const }, { title: 'Review key risks', detail: 'Surface policy checks and missing terms.', view: 'review' as const }, { title: 'Draft a change', detail: 'Prepare a controlled negotiation alternative.', view: 'redline' as const }].map(action => <button key={action.view} onClick={() => setWorkspaceTab(action.view)} className="rounded-2xl border border-[#ded2b6] bg-[#fffdf8] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#6faeb8]"><p className="text-sm font-semibold text-[#17304e]">{action.title}</p><p className="mt-1 text-xs leading-5 text-[#737b7b]">{action.detail}</p><p className="mt-4 text-xs font-semibold text-[#28758a]">Open tool →</p></button>)}</section></>}
        {workspaceTab === 'document' && <section className="rise-in flex min-h-[620px] flex-1 flex-col gap-4"><div className="flex items-center justify-between rounded-xl border border-[#ded2b6] bg-[#fffaf0] px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-[#837a67]">Document workspace</p><h2 className="mt-1 text-lg font-semibold text-[#17304e]">Choose or inspect an agreement</h2></div></div><ContractDeck demos={DEMO_WORKSPACES} activeId={contract.id} onSelect={selectDemo} /><div className="min-h-[480px] flex-1 overflow-hidden"><DocumentViewer contract={contract} activeClauseId={activeClauseId} highlightedClauseId={highlightedClauseId} seedClauseIds={seedClauseIds} hopClauseIds={hopClauseIds} onSelectReference={handleSelectReference} /></div></section>}
        {(['answer', 'review', 'redline'] as const).includes(workspaceTab as 'answer' | 'review' | 'redline') && <div className="rise-in grid grid-cols-1 gap-5 lg:grid-cols-12 lg:min-h-0 lg:flex-1"><section className="order-2 flex h-[520px] flex-col overflow-hidden lg:order-1 lg:col-span-5 lg:h-full"><DocumentViewer contract={contract} activeClauseId={activeClauseId} highlightedClauseId={highlightedClauseId} seedClauseIds={seedClauseIds} hopClauseIds={hopClauseIds} onSelectReference={handleSelectReference} /></section><section className="order-1 flex min-h-[480px] flex-col lg:order-2 lg:col-span-7 lg:h-full">{workspaceTab === 'review' ? <ReviewPanel demo={activeWorkspace} isOfflineMode={isOfflineMode} onOpenClause={(id) => { setActiveClauseId(id); triggerHighlight(id); }} /> : workspaceTab === 'redline' ? <RedlinePanel key={contract.id} demo={activeWorkspace} isOfflineMode={isOfflineMode} /> : <><ConversationHistory turns={conversation} /><QueryBox onSearch={handleExecuteQuery} isLoading={isLoadingQuery} /><div className="flex-1 overflow-hidden"><EvidenceChain result={queryResult} isLoading={isLoadingQuery} onSelectClause={(cid) => { setActiveClauseId(cid); triggerHighlight(cid); }} /></div></>}</section></div>}
        </div></main>

      {/* Upload PDF Contract Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onContractUploaded={(newContract) => {
          setContract(newContract);
          setQueryResult(null);
          setConversation([]); setLastAnswerCitations([]);
          setWorkspaceTab('document');
          if (newContract.clauses && newContract.clauses.length > 0) {
            setActiveClauseId(newContract.clauses[0].clause_id);
          }
        }}
        isOfflineMode={isOfflineMode}
      />
      <DocumentLibrary
        isOpen={isLibraryOpen}
        isOfflineMode={isOfflineMode}
        onClose={() => setIsLibraryOpen(false)}
        onOpenContract={(storedContract) => {
          setContract(storedContract);
          setQueryResult(null);
          setConversation([]); setLastAnswerCitations([]);
          setActiveClauseId(storedContract.clauses[0]?.clause_id || null);
          setWorkspaceTab('document');
        }}
      />
    </div>
  );
};

export default App;
