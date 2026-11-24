/**
 * TypeScript definitions for Legal Document Intelligence Platform
 */

export interface Clause {
  id: string;
  clause_id: string; // e.g. "SEC-1.1", "SEC-1.2", "SCHED-A", "CLAUSE-3.1"
  section_title: string;
  page_number: number;
  content: string;
  cross_references: string[];
}

export interface Contract {
  id: string;
  filename: string;
  total_pages: number;
  total_clauses: number;
  dependencies_linked?: number;
  parser_time_ms?: number;
  document_type?: string;
  vector_indexed_clauses?: number;
  clauses: Clause[];
}

export interface DependencyHop {
  id?: string;
  clause_id: string;
  section_title: string;
  page_number: number;
  content?: string;
  hop_level: number;
  relation_type: string;
  referenced_by?: string;
  target_code?: string;
}

export interface EvidenceStep {
  step_number: number;
  title: string;
  badge: string;
  type: 'retrieval' | 'traversal' | 'verification' | 'verdict';
  status: 'verified' | 'abstain' | 'active';
  details: string;
  source_citation?: string;
  target_citation?: string;
  confidence_score?: number;
}

export interface QueryResult {
  query: string;
  contract_id?: string;
  direct_matches: (Clause & { relevance_score?: number; hop_level?: number })[];
  multi_hop_references: DependencyHop[];
  total_context_clauses: number;
  full_context: string;
  is_abstain?: boolean;
  abstain_reason?: string;
  missing_references?: Array<{
    reference: string;
    normalized_reference: string;
    relation_type: string;
    referenced_by?: string;
    source_page?: number;
  }>;
  answer_provider?: 'gemini' | 'extractive-fallback' | 'deterministic-verifier' | 'safe-fallback';
  answer_status?: 'ANSWERED' | 'INSUFFICIENT_EVIDENCE' | 'CLARIFICATION_NEEDED' | 'DOCUMENT_TYPE_REVIEW_NEEDED' | 'GENERATION_FAILED';
  answer_model?: string | null;
  answer_citations?: string[];
  evidence_verification?: {
    status?: string;
    citation_ids_valid?: boolean;
    sentence_checks?: Array<{
      sentence: string;
      lexical_support?: number;
      status?: string;
    }>;
    evidence_support_score?: number | null;
    review_recommended?: boolean;
  };
  guardrail_summary?: {
    citation_valid: boolean;
    evidence_support_score?: number | null;
    required_references_complete: boolean;
    human_review_recommended: boolean;
    scope: string;
  };
  verdict_summary?: string;
  evidence_steps: EvidenceStep[];
}
