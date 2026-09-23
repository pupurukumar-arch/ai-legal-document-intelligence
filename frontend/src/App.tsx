import React, { useState, useEffect } from 'react';
import type { Contract, QueryResult } from './types/legal';
import { INITIAL_MOCK_CONTRACT, MOCK_QUERY_RESPONSES } from './data/mockContract';
import { checkBackendHealth, queryContract, type BackendHealthStatus } from './services/api';
import { Header } from './components/Header';
import { DocumentViewer } from './components/DocumentViewer';
import { QueryBox } from './components/QueryBox';
import { EvidenceChain } from './components/EvidenceChain';
import { UploadModal } from './components/UploadModal';

export const App: React.FC = () => {
  // Master Contract State (defaults to rich viva presentation contract)
  const [contract, setContract] = useState<Contract>(INITIAL_MOCK_CONTRACT);

  // Active Query & Chain-of-Evidence Result (pre-loaded with verified exclusions for immediate WOW factor)
  const [queryResult, setQueryResult] = useState<QueryResult | null>(
    MOCK_QUERY_RESPONSES['exclusions']
  );
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);

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

  // Check health on boot
  useEffect(() => {
    checkBackendHealth().then((status) => {
      setHealthStatus(status);
      // If backend is active and online, allow live mode; otherwise stay on presentation safe mode
      if (status.isOnline) {
        setIsOfflineMode(false);
      }
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
    try {
      const res = await queryContract(
        queryText,
        contract.id,
        isMissingEvidenceDemo,
        isOfflineMode
      );
      setQueryResult(res);

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

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080c14] text-slate-100 overflow-hidden font-sans">
      {/* Top Application Header */}
      <Header
        healthStatus={healthStatus}
        isOfflineMode={isOfflineMode}
        onToggleOfflineMode={() => setIsOfflineMode(!isOfflineMode)}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Split-Screen Workspace Layout */}
      <main className="flex-1 overflow-hidden p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Panel: Interactive Document Viewer (50% / 6 columns) */}
        <section className="lg:col-span-6 h-full overflow-hidden flex flex-col">
          <DocumentViewer
            contract={contract}
            activeClauseId={activeClauseId}
            highlightedClauseId={highlightedClauseId}
            seedClauseIds={seedClauseIds}
            hopClauseIds={hopClauseIds}
            onSelectReference={handleSelectReference}
          />
        </section>

        {/* Right Panel: Interactive Query Box + Forensic Chain-of-Evidence (50% / 6 columns) */}
        <section className="lg:col-span-6 h-full overflow-hidden flex flex-col">
          {/* Query Box with presets & missing evidence toggle */}
          <QueryBox onSearch={handleExecuteQuery} isLoading={isLoadingQuery} />

          {/* Forensic Chain-of-Evidence UI */}
          <div className="flex-1 overflow-hidden">
            <EvidenceChain
              result={queryResult}
              isLoading={isLoadingQuery}
              onSelectClause={(cid) => {
                setActiveClauseId(cid);
                triggerHighlight(cid);
              }}
            />
          </div>
        </section>
      </main>

      {/* Upload PDF Contract Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onContractUploaded={(newContract) => {
          setContract(newContract);
          if (newContract.clauses && newContract.clauses.length > 0) {
            setActiveClauseId(newContract.clauses[0].clause_id);
          }
        }}
        isOfflineMode={isOfflineMode}
      />
    </div>
  );
};

export default App;
