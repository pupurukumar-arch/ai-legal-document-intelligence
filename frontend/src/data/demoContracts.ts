import type { Contract, QueryResult } from '../types/legal';

export type DemoKind = 'nda' | 'rental_agreement' | 'employment_agreement' | 'service_agreement';

export interface DemoWorkspace {
  kind: DemoKind;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  contract: Contract;
  question: string;
  review: { severity: 'High' | 'Medium' | 'Clear'; title: string; detail: string; clauseId: string }[];
}

const clause = (id: string, title: string, content: string, refs: string[] = []) => ({
  id, clause_id: id, section_title: title, page_number: 1, content, cross_references: refs
});

export const DEMO_WORKSPACES: DemoWorkspace[] = [
  {
    kind: 'nda', label: 'Mutual NDA', shortLabel: 'NDA', description: 'Confidentiality scope and missing-attachment abstention.', accent: 'border-violet-400',
    question: 'What information is excluded from confidentiality?',
    review: [{ severity: 'Medium', title: 'Survival period should be explicit', detail: 'The confidentiality obligation needs a defined duration after termination.', clauseId: 'SEC-2.1' }],
    contract: { id: 'demo-nda', filename: 'Mutual_NDA_Demo.pdf', total_pages: 2, total_clauses: 6, dependencies_linked: 4, clauses: [
      clause('SEC-1.1', 'Confidential Information', 'Confidential Information means non-public technical, business, product and customer information disclosed by either party.'),
      clause('SEC-1.2', 'Exclusions', 'The obligations do not apply to information that is publicly available, independently developed, lawfully received from a third party, or identified in Schedule A.', ['Section 1.1', 'Schedule A']),
      clause('SEC-2.1', 'Non-Disclosure Duty', 'The Receiving Party shall use reasonable care and shall not disclose Confidential Information except as permitted in Schedule B.', ['Section 1.1', 'Schedule B']),
      clause('SEC-3.1', 'Term', 'This Agreement continues for two years. Confidentiality obligations survive as stated in Section 2.1.', ['Section 2.1']),
      clause('SCHED-A', 'Schedule A — Excluded Information', 'Public marketing material, open-source documentation, and pre-existing audit reports are excluded.'),
      clause('SCHED-B', 'Schedule B — Permitted Recipients', 'Disclosure is permitted only to personnel with a need to know who are bound by equivalent confidentiality obligations.')
    ] }
  },
  {
    kind: 'rental_agreement', label: 'Residential Rent Agreement', shortLabel: 'Rent', description: 'Deposit deductions, notice and handover review.', accent: 'border-amber-400',
    question: 'Under what conditions can the security deposit be deducted?',
    review: [{ severity: 'High', title: 'Open-ended deposit deduction', detail: '“Sole discretion” does not state deduction grounds, proof, or return timeline.', clauseId: 'SEC-4.1' }],
    contract: { id: 'demo-rent', filename: 'Residential_Rent_Agreement_Demo.pdf', total_pages: 2, total_clauses: 6, dependencies_linked: 2, clauses: [
      clause('SEC-1.1', 'Premises and Term', 'The Landlord lets the residential premises at 12 Lake Road to the Tenant for eleven months.'),
      clause('SEC-2.1', 'Monthly Rent', 'The Tenant shall pay monthly rent on or before the fifth day of each calendar month.'),
      clause('SEC-3.1', 'Maintenance', 'The Tenant shall keep the premises reasonably clean. Structural repairs remain the Landlord’s responsibility.'),
      clause('SEC-4.1', 'Security Deposit', 'The Landlord may deduct any amount from the security deposit at the Landlord’s sole discretion after handover.', ['Section 5.1']),
      clause('SEC-5.1', 'Termination', 'Either party may terminate by thirty days’ written notice. A material breach must first be notified in writing.'),
      clause('SEC-6.1', 'Handover', 'At termination, the parties shall record meter readings and hand over keys and possession.')
    ] }
  },
  {
    kind: 'employment_agreement', label: 'Employment Agreement', shortLabel: 'Employment', description: 'Notice, IP and confidentiality terms.', accent: 'border-sky-400',
    question: 'What notice is required if the employee resigns?',
    review: [{ severity: 'Medium', title: 'Notice term is incomplete', detail: 'The agreement should specify the notice period, waiver conditions and final handover process.', clauseId: 'SEC-5.1' }],
    contract: { id: 'demo-employment', filename: 'Employment_Agreement_Demo.pdf', total_pages: 2, total_clauses: 6, dependencies_linked: 2, clauses: [
      clause('SEC-1.1', 'Role and Start Date', 'The Employee joins as Software Engineer from the stated start date.'),
      clause('SEC-2.1', 'Compensation', 'Compensation and statutory deductions are described in Schedule A.', ['Schedule A']),
      clause('SEC-3.1', 'Confidentiality', 'The Employee shall protect confidential business information during employment and after separation.'),
      clause('SEC-4.1', 'Intellectual Property', 'Work product created in the course of employment shall be assigned as permitted by applicable law.'),
      clause('SEC-5.1', 'Resignation and Notice', 'The Employee may resign by providing written notice to the Employer.'),
      clause('SCHED-A', 'Schedule A — Compensation', 'Monthly gross compensation, reimbursement rules and payroll date are recorded here.')
    ] }
  },
  {
    kind: 'service_agreement', label: 'Software Service Agreement', shortLabel: 'Service', description: 'Scope, acceptance, payment and liability exposure.', accent: 'border-emerald-400',
    question: 'What is the supplier’s liability limit?',
    review: [{ severity: 'High', title: 'Unlimited liability exposure', detail: 'The clause lacks a cap and excludes no indirect or consequential loss.', clauseId: 'SEC-5.1' }],
    contract: { id: 'demo-service', filename: 'Software_Service_Agreement_Demo.pdf', total_pages: 3, total_clauses: 6, dependencies_linked: 3, clauses: [
      clause('SEC-1.1', 'Scope of Services', 'The Supplier shall deliver the implementation services described in Statement of Work A.', ['SOW-A']),
      clause('SEC-2.1', 'Milestones and Acceptance', 'Deliverables are accepted after written confirmation or after the review period in Statement of Work A.', ['SOW-A']),
      clause('SEC-3.1', 'Fees and Payment', 'The Customer shall pay undisputed invoices within thirty days of receipt.'),
      clause('SEC-4.1', 'Confidentiality', 'Each party shall protect the other party’s confidential information using reasonable care.'),
      clause('SEC-5.1', 'Liability', 'Supplier shall be liable for all losses, damages and claims arising from this Agreement.'),
      clause('SOW-A', 'Statement of Work A', 'The project includes discovery, implementation, user acceptance testing and deployment.')
    ] }
  }
];

export function buildDemoAnswer(demo: DemoWorkspace, query: string): QueryResult {
  const matching = demo.contract.clauses.find(c => {
    const source = `${c.section_title} ${c.content}`.toLowerCase();
    return demo.kind === 'rental_agreement' ? /security deposit|deduct|deposit/.test(source)
      : demo.kind === 'employment_agreement' ? /notice|resign/.test(source)
      : demo.kind === 'service_agreement' ? /liability/.test(source)
      : /exclusion|confidential/.test(source);
  }) || demo.contract.clauses[0];
  const refs = matching.cross_references.map(reference => {
    const target = demo.contract.clauses.find(c => c.clause_id.toLowerCase() === reference.replace(/section\s*/i, 'SEC-').replace(/\s/g, '').toLowerCase() || c.section_title.toLowerCase().includes(reference.toLowerCase()));
    return target ? { clause_id: target.clause_id, section_title: target.section_title, page_number: target.page_number, content: target.content, hop_level: 1, relation_type: 'CROSS_REFERENCE', referenced_by: matching.clause_id, target_code: reference } : null;
  }).filter(Boolean) as QueryResult['multi_hop_references'];
  return {
    query, contract_id: demo.contract.id, direct_matches: [{ ...matching, relevance_score: 0.92, hop_level: 0 }], multi_hop_references: refs,
    total_context_clauses: refs.length + 1, full_context: matching.content, is_abstain: false,
    verdict_summary: `The strongest evidence is ${matching.clause_id} (${matching.section_title}). ${matching.content}`,
    answer_provider: 'extractive-fallback', answer_model: null, answer_citations: [matching.clause_id],
    evidence_steps: [
      { step_number: 1, title: 'Seed clause retrieval', badge: 'Hop 0: evidence match', type: 'retrieval', status: 'verified', details: `Selected ${matching.clause_id} because it directly addresses the question.`, source_citation: `${matching.clause_id} (Page ${matching.page_number})`, confidence_score: 0.92 },
      { step_number: 2, title: 'Dependency traversal', badge: `Hop 1: ${refs.length} linked item${refs.length === 1 ? '' : 's'}`, type: 'traversal', status: 'verified', details: refs.length ? 'Expanded the clause references required for context.' : 'No linked clause is required for this answer.', source_citation: refs.map(r => r.clause_id).join(', ') || undefined, confidence_score: 0.95 },
      { step_number: 3, title: 'Evidence completeness', badge: 'Guardrail passed', type: 'verification', status: 'verified', details: 'All required references available in this prepared document bundle.', source_citation: 'Contract graph', confidence_score: 1 },
      { step_number: 4, title: 'Grounded response', badge: 'Cited answer', type: 'verdict', status: 'verified', details: `Answer constrained to ${matching.clause_id}; the application does not make an enforceability determination.`, source_citation: matching.clause_id, confidence_score: 0.92 }
    ]
  };
}
