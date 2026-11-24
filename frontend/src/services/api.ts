/**
 * API Client Service for AI Legal Document Intelligence Platform
 * Connects to http://localhost:3050 with seamless offline presentation safety.
 */

import type { Contract, QueryResult } from '../types/legal';
import { INITIAL_MOCK_CONTRACT, MOCK_QUERY_RESPONSES } from '../data/mockContract';

const API_BASE_URL = 'http://localhost:3050';

export interface PersistedContractSummary {
  id: string;
  filename: string;
  document_type?: string;
  total_clauses?: number;
  total_pages?: number;
  vector_indexed_clauses?: number;
}

export interface BackendHealthStatus {
  isOnline: boolean;
  database: string;
  python_parser: string;
  service: string;
}

/**
 * Checks connectivity to the Node.js Express API Bridge & Python parser.
 */
export async function checkBackendHealth(): Promise<BackendHealthStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2s quick probe
    });
    if (res.ok) {
      const data = await res.json();
      return {
        isOnline: true,
        database: data.database || 'connected',
        python_parser: data.python_parser || 'reachable',
        service: data.service || 'backend-api'
      };
    }
  } catch {
    // Offline mode
  }
  return {
    isOnline: false,
    database: 'offline',
    python_parser: 'offline',
    service: 'offline-presentation-mode'
  };
}

/**
 * Uploads a PDF contract to http://localhost:3050/api/contracts/upload.
 * Falls back to offline presentation mode if backend is unreachable.
 */
export async function uploadContractPdf(
  file: File,
  forceOffline: boolean = false,
  documentType: string = 'unknown'
): Promise<{ contract: Contract; isMockFallback: boolean }> {
  if (forceOffline) {
    console.log('[API] Offline Presentation Mode active. Using simulated parser.');
    return {
      contract: {
        ...INITIAL_MOCK_CONTRACT,
        id: `mock-${Date.now()}`,
        filename: file.name,
      },
      isMockFallback: true
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    const response = await fetch(`${API_BASE_URL}/api/contracts/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      contract: {
        id: data.contract_id,
        filename: data.filename || file.name,
        total_pages: data.total_pages || 1,
        total_clauses: data.total_clauses || (data.clauses ? data.clauses.length : 0),
        dependencies_linked: data.dependencies_linked ?? 0,
        parser_time_ms: data.parser_time_ms ?? 0,
        document_type: data.document_type || documentType,
        vector_indexed_clauses: data.vector_indexed_clauses ?? 0,
        clauses: data.clauses || []
      },
      isMockFallback: false
    };
  } catch (err: any) {
    throw new Error(`Live upload failed: ${err.message}`);
  }
}

export async function listPersistedContracts(): Promise<PersistedContractSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/contracts`, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Could not load the document library.');
  const data = await response.json();
  return data.contracts || [];
}

export async function loadPersistedContract(contractId: string): Promise<Contract> {
  const response = await fetch(`${API_BASE_URL}/api/contracts/${encodeURIComponent(contractId)}`, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Could not open this contract.');
  const data = await response.json();
  const contract = data.contract || {};
  const clauses = data.clauses || contract.clauses || [];
  return {
    id: contract.id || contractId,
    filename: contract.filename || 'Stored contract',
    total_pages: contract.total_pages || 1,
    total_clauses: contract.total_clauses || clauses.length,
    dependencies_linked: contract.dependencies_linked || 0,
    document_type: contract.document_type || 'unknown',
    vector_indexed_clauses: contract.vector_indexed_clauses || clauses.length,
    clauses,
  };
}

export async function deletePersistedContract(contractId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/contracts/${encodeURIComponent(contractId)}`, { method: 'DELETE', signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error('Could not remove this contract.');
}

/**
 * Executes a Multi-Hop Legal Query.
 * Handles the special Missing Evidence forensic scenario ("Is Schedule B attached?")
 * and formats the 4-step Chain-of-Evidence.
 */
export async function queryContract(
  query: string,
  contractId?: string,
  forceMissingEvidence: boolean = false,
  forceOffline: boolean = false,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  priorClauseIds: string[] = []
): Promise<QueryResult> {
  // Offline mode is explicitly labelled and is the only path that uses demo data.
  if (forceOffline) {
    const demoKey = forceMissingEvidence ? "missing_evidence" : "exclusions";
    return {
      ...MOCK_QUERY_RESPONSES[demoKey],
      query,
      contract_id: contractId || MOCK_QUERY_RESPONSES[demoKey].contract_id
    };
  }

  // Live API failures are surfaced instead of silently returning mock evidence.
  try {
    const res = await fetch(`${API_BASE_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        contract_id: contractId,
        top_k: 2,
        hops: 2,
        conversation_history: conversationHistory.slice(-4),
        prior_clause_ids: priorClauseIds.slice(-4)
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      
      // Synthesize 4-step Chain-of-Evidence from live multi-hop backend response
      const seed = data.direct_matches && data.direct_matches.length > 0 ? data.direct_matches[0] : null;
      const hops = data.multi_hop_references || [];
      const missing = data.missing_references || [];
      const generated = data.generated_answer;
      const isAbstain = Boolean(
        data.is_abstain || generated?.status === 'INSUFFICIENT_EVIDENCE'
      );

      return {
        query: data.query || query,
        contract_id: data.contract_id,
        direct_matches: data.direct_matches || [],
        multi_hop_references: hops,
        total_context_clauses: data.total_context_clauses || (data.direct_matches?.length || 0) + hops.length,
        full_context: data.full_context || '',
        is_abstain: isAbstain,
        abstain_reason: data.abstain_reason || (isAbstain ? generated?.answer : undefined),
        missing_references: missing,
        answer_provider: generated?.answer_provider,
        answer_model: generated?.answer_model,
        answer_status: generated?.status,
        answer_citations: generated?.citations || [],
        evidence_verification: data.evidence_verification,
        guardrail_summary: data.guardrail_summary,
        verdict_summary: isAbstain
          ? undefined
          : generated?.answer || (seed
            ? `Evidence retrieved from ${seed.clause_id} (${seed.section_title}) with ${hops.length} resolved cross-reference${hops.length === 1 ? '' : 's'}.`
            : "No relevant contractual evidence was retrieved."),
        evidence_steps: [
          {
            step_number: 1,
            title: "Seed Clause Retrieval",
            badge: "Hop 0: Lexical Match",
            type: "retrieval",
            status: "verified",
            details: seed 
              ? `Lexical retrieval selected ${seed.clause_id} ('${seed.section_title}') on Page ${seed.page_number}.`
              : "Direct keyword search identified initial candidate section.",
            source_citation: seed ? `${seed.clause_id} (Page ${seed.page_number})` : undefined
          },
          {
            step_number: 2,
            title: "Dependency Graph Traversal",
            badge: `Hop 1-2: ${hops.length} Dependencies Expanded`,
            type: "traversal",
            status: "verified",
            details: hops.length > 0
              ? `Traversed directed relations in clause_dependencies table: ${hops.map((h: any) => `${h.clause_id} [${h.relation_type}]`).join(', ')}.`
              : "No secondary cross-references registered for this clause.",
            source_citation: hops.map((h: any) => h.clause_id).join(' + ')
          },
          {
            step_number: 3,
            title: "Reference Integrity Verification",
            badge: isAbstain ? `${missing.length} Missing Reference${missing.length === 1 ? '' : 's'}` : "All Queried References Resolved",
            type: "verification",
            status: isAbstain ? "abstain" : "verified",
            details: isAbstain
              ? data.abstain_reason
              : "No unresolved attachment or clause reference relevant to this query was found.",
            source_citation: isAbstain
              ? missing.map((ref: any) => `${ref.reference} via ${ref.referenced_by}`).join(', ')
              : "Parsed dependency graph"
          },
          {
            step_number: 4,
            title: isAbstain ? "Safe Refusal" : "Retrieved Evidence",
            badge: isAbstain ? "ABSTAIN" : "Evidence Ready",
            type: "verdict",
            status: isAbstain ? "abstain" : "verified",
            details: isAbstain
              ? "Answer generation was stopped because the required evidence is absent."
              : data.full_context
                ? data.full_context.split('\n\n')[0].replace(/===.*?===/g, '').trim()
                : "Relevant clauses were retrieved for review.",
            source_citation: isAbstain ? undefined : "Retrieved clause set"
          }
        ]
      };
    }
    const errorText = await res.text();
    throw new Error(`Query failed HTTP ${res.status}: ${errorText}`);
  } catch (err: any) {
    throw new Error(`Live query failed: ${err.message}`);
  }
}
