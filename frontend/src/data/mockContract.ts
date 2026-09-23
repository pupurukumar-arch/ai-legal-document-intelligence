import type { Contract, QueryResult } from '../types/legal';

export const INITIAL_MOCK_CONTRACT: Contract = {
  id: "contract-viva-demo-2025",
  filename: "Master_Services_and_NDA_Agreement.pdf",
  total_pages: 2,
  total_clauses: 7,
  dependencies_linked: 6,
  parser_time_ms: 18.4,
  clauses: [
    {
      id: "c-preamble",
      clause_id: "PREAMBLE",
      section_title: "Preamble & Recitals",
      page_number: 1,
      content: "This Master Services and Confidentiality Agreement is entered into on October 1, 2025, between Alpha Corp (\"Discloser\") and Beta LLC (\"Recipient\"). WHEREAS, Discloser possesses proprietary intellectual property; and WHEREAS, the parties desire to explore commercial collaboration.",
      cross_references: []
    },
    {
      id: "c-sec-1.1",
      clause_id: "SEC-1.1",
      section_title: "Confidential Information",
      page_number: 1,
      content: "\"Confidential Information\" refers to all proprietary data disclosed under this Agreement, whether oral or written, including technical diagrams, source code, algorithm weights, and non-public business plans.",
      cross_references: []
    },
    {
      id: "c-sec-1.2",
      clause_id: "SEC-1.2",
      section_title: "Exclusions from Protection",
      page_number: 1,
      content: "The confidentiality obligations under Section 1.1 shall not apply to information that is publicly known or materials explicitly cataloged in Schedule A attached hereto.",
      cross_references: ["Section 1.1", "Schedule A"]
    },
    {
      id: "c-sec-2.1",
      clause_id: "SEC-2.1",
      section_title: "Non-Disclosure Duty & Schedule B Governance",
      page_number: 2,
      content: "The Recipient agrees to hold all Confidential Information in strict confidence and shall not disclose it to third parties without prior written consent, subject to specialized protocols set forth in Schedule B and Section 1.1.",
      cross_references: ["Section 1.1", "Schedule B"]
    },
    {
      id: "c-sec-2.2",
      clause_id: "SEC-2.2",
      section_title: "Standard of Care",
      page_number: 2,
      content: "Recipient shall use the same degree of care it employs to protect its own sensitive data, but no less than reasonable care, as further outlined in Clause 3.1.",
      cross_references: ["Clause 3.1"]
    },
    {
      id: "c-clause-3.1",
      clause_id: "CLAUSE-3.1",
      section_title: "Duration & Termination",
      page_number: 2,
      content: "This Agreement continues in full force for a period of two (2) years, unless terminated earlier pursuant to Section 2.1 or Article 2.",
      cross_references: ["Section 2.1", "Article 2"]
    },
    {
      id: "c-sched-a",
      clause_id: "SCHED-A",
      section_title: "SCHEDULE A - EXCLUDED ASSETS",
      page_number: 2,
      content: "1. Public domain specifications and open-source documentation.\n2. Independent third-party audit reports dated prior to October 2025.\n3. General commercial marketing collateral.",
      cross_references: []
    }
  ]
};

export const MOCK_QUERY_RESPONSES: Record<string, QueryResult> = {
  // Scenario 1: Multi-hop retrieval for exclusions
  "exclusions": {
    query: "What are the exclusions to confidential information?",
    contract_id: "contract-viva-demo-2025",
    direct_matches: [
      {
        ...INITIAL_MOCK_CONTRACT.clauses[2], // SEC-1.2
        relevance_score: 12,
        hop_level: 0
      }
    ],
    multi_hop_references: [
      {
        clause_id: "SEC-1.1",
        section_title: "Confidential Information",
        page_number: 1,
        content: INITIAL_MOCK_CONTRACT.clauses[1].content,
        hop_level: 1,
        relation_type: "DEFINITION_DEPENDENCY",
        referenced_by: "SEC-1.2",
        target_code: "Section 1.1"
      },
      {
        clause_id: "SCHED-A",
        section_title: "SCHEDULE A - EXCLUDED ASSETS",
        page_number: 2,
        content: INITIAL_MOCK_CONTRACT.clauses[6].content,
        hop_level: 1,
        relation_type: "ATTACHMENT_REFERENCE",
        referenced_by: "SEC-1.2",
        target_code: "Schedule A"
      }
    ],
    total_context_clauses: 3,
    is_abstain: false,
    verdict_summary: "Exclusions encompass publicly known data and the 3 asset classes enumerated in Schedule A (open-source docs, pre-dated third-party audits, and marketing collateral).",
    full_context: "=== DIRECT RETRIEVAL MATCHES (HOP 0) ===\n[SEC-1.2] Exclusions from Protection...\n\n=== MULTI-HOP DEPENDENCY CONTEXT (HOPS 1-2) ===\n[SEC-1.1] Confidential Information...\n[SCHED-A] SCHEDULE A - EXCLUDED ASSETS...",
    evidence_steps: [
      {
        step_number: 1,
        title: "Seed Clause Retrieval",
        badge: "Hop 0: Semantic Match",
        type: "retrieval",
        status: "verified",
        details: "Direct vector similarity and lexical match identified Section 1.2 ('Exclusions from Protection') as the primary candidate clause.",
        source_citation: "SEC-1.2 (Page 1)",
        confidence_score: 0.96
      },
      {
        step_number: 2,
        title: "Dependency Graph Traversal",
        badge: "Hop 1: Relational Expansion",
        type: "traversal",
        status: "verified",
        details: "Traversed clause_dependencies edges: Discovered companion definition Section 1.1 and mandatory schedule attachment Schedule A.",
        source_citation: "SEC-1.2 → SEC-1.1 & SCHED-A",
        confidence_score: 0.98
      },
      {
        step_number: 3,
        title: "Forensic Schedule Verification",
        badge: "Verification: Document Exists",
        type: "verification",
        status: "verified",
        details: "Verified that Schedule A is physically present in the PDF contract on Page 2 and contains 3 explicit asset exclusions.",
        source_citation: "SCHED-A (Page 2)",
        confidence_score: 1.00
      },
      {
        step_number: 4,
        title: "Synthesized Legal Verdict",
        badge: "Verdict: 100% Provenance",
        type: "verdict",
        status: "verified",
        details: "The confidentiality scope excludes public domain items and materials explicitly cataloged under Schedule A (open-source materials, historical audit reports, and marketing brochures).",
        source_citation: "SEC-1.2 + SEC-1.1 + SCHED-A",
        confidence_score: 0.97
      }
    ]
  },

  // Scenario 2: Missing Evidence Query (ABSTAIN)
  "missing_evidence": {
    query: "Is Schedule B attached to this agreement, and what protocols does it dictate?",
    contract_id: "contract-viva-demo-2025",
    direct_matches: [
      {
        ...INITIAL_MOCK_CONTRACT.clauses[3], // SEC-2.1
        relevance_score: 14,
        hop_level: 0
      }
    ],
    multi_hop_references: [
      {
        clause_id: "SCHED-B (OMITTED)",
        section_title: "Schedule B [MISSING ATTACHMENT]",
        page_number: 0,
        content: "[ERROR: TARGET ATTACHMENT 'Schedule B' CITED IN SEC-2.1 DOES NOT EXIST IN DOCUMENT BUNDLE]",
        hop_level: 1,
        relation_type: "UNRESOLVED_ATTACHMENT",
        referenced_by: "SEC-2.1",
        target_code: "Schedule B"
      }
    ],
    total_context_clauses: 1,
    is_abstain: true,
    abstain_reason: "Critical Contract Attachment 'Schedule B' is cited in Section 2.1 ('subject to specialized protocols set forth in Schedule B') but was OMITTED from the uploaded PDF document.",
    verdict_summary: "The platform refuses to generate speculative obligations because Schedule B was not appended to the contract.",
    full_context: "=== ABSTAIN: MISSING EVIDENCE ===\nSection 2.1 cites Schedule B. No schedule matching 'Schedule B' exists in the document hierarchy.",
    evidence_steps: [
      {
        step_number: 1,
        title: "Seed Clause Retrieval",
        badge: "Hop 0: Reference Detected",
        type: "retrieval",
        status: "verified",
        details: "Section 2.1 ('Non-Disclosure Duty & Schedule B Governance') was identified with explicit reference to 'Schedule B'.",
        source_citation: "SEC-2.1 (Page 2)",
        confidence_score: 0.98
      },
      {
        step_number: 2,
        title: "Dependency Graph Traversal",
        badge: "Hop 1: Dependency Lookup",
        type: "traversal",
        status: "active",
        details: "Attempted to traverse directed edge (SEC-2.1 → target_clause_code: 'Schedule B'). Target UUID resolved to NULL.",
        source_citation: "SEC-2.1 → Schedule B (Unresolved)",
        confidence_score: 0.45
      },
      {
        step_number: 3,
        title: "Forensic Integrity Audit",
        badge: "Audit: Attachment Missing",
        type: "verification",
        status: "abstain",
        details: "Full document layout traversal completed across Pages 1-2. No section or division matches 'Schedule B'. Contract integrity compromised.",
        source_citation: "Missing Annexure: Schedule B",
        confidence_score: 0.00
      },
      {
        step_number: 4,
        title: "Forensic AI Abstention",
        badge: "ABSTAIN: Missing Evidence",
        type: "verdict",
        status: "abstain",
        details: "ABSTAIN: Missing Evidence. The system deliberately abstains from synthesizing hypothetical protocols to prevent legal liability and contractual hallucination.",
        source_citation: "Contract Integrity Guardrail Triggered",
        confidence_score: 0.00
      }
    ]
  }
};
