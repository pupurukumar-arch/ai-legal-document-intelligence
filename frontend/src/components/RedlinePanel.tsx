import { Copy, PenLine, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DemoWorkspace } from '../data/demoContracts';

type RedlineResult = { replacement_clause?: string; policy_label?: string };
type PolicySource = { title?: string; source?: string; section?: string };
const localDrafts: Record<string, string> = {
  'rental_agreement:SEC-4.1': 'The Landlord may deduct documented unpaid rent, utility charges, or repair costs for damage beyond normal wear and tear. The Landlord shall provide an itemised written statement and return any remaining balance within thirty (30) days after handover.',
  'employment_agreement:SEC-5.1': 'Either party may end employment by giving thirty (30) days’ written notice, subject to lawful payment in lieu of notice and completion of an orderly handover.',
  'service_agreement:SEC-5.1': 'Except for liabilities that cannot lawfully be limited, each party’s aggregate liability arising from this Agreement shall not exceed the fees paid or payable under the applicable Statement of Work in the twelve months preceding the event.',
  'nda:SEC-2.1': 'The Receiving Party shall protect Confidential Information using reasonable care and may disclose it only to personnel with a need to know who are bound by equivalent confidentiality obligations.'
};

export function RedlinePanel({ demo, isOfflineMode }: { demo: DemoWorkspace; isOfflineMode: boolean }) {
  const initialTarget = demo.review[0]?.clauseId || demo.contract.clauses.find(clause => /deposit|liability|notice|confidential/i.test(`${clause.section_title} ${clause.content}`))?.clause_id || demo.contract.clauses[0]?.clause_id;
  const [target, setTarget] = useState(initialTarget);
  const [objective, setObjective] = useState<'balanced' | 'protective'>('balanced');
  const [result, setResult] = useState<RedlineResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [policySources, setPolicySources] = useState<PolicySource[]>([]);
  const clause = useMemo(() => demo.contract.clauses.find(item => item.clause_id === target) || demo.contract.clauses[0], [demo.contract.clauses, target]);
  const replacement = result?.replacement_clause || localDrafts[`${demo.kind}:${target}`] || 'No matching policy template is available for this clause. Escalate for human review.';
  const generate = async () => {
    if (!clause || isOfflineMode) return;
    setIsLoading(true); setResult(null); setPolicySources([]);
    try {
      const response = await fetch('http://localhost:3050/api/redline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document_type: demo.kind, clause_text: `${clause.section_title}\n${clause.content}`, objective: objective === 'protective' ? 'tenant_friendly' : 'balanced' }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Redline unavailable'); setResult(data.redline); setPolicySources(data.retrieved_policy_sources || []);
    } finally { setIsLoading(false); }
  };
  const copy = async () => { await navigator.clipboard?.writeText(replacement); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return <div className="rounded-xl border border-[#ded2b6] bg-[#fffdf8] p-5 h-full overflow-auto shadow-[0_8px_22px_rgba(83,60,20,0.08)]">
    <div className="flex justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.18em] text-[#837a67]">Controlled redlining</p><h2 className="mt-1 text-base font-semibold text-[#17304e]">Draft a negotiation alternative</h2></div><PenLine className="w-5 h-5 text-[#2b7790]"/></div>
    <p className="mt-2 text-xs leading-5 text-[#737b7b]">{isOfflineMode ? 'Prepared policy-template preview.' : 'Live policy-source retrieval and controlled drafting.'} Every output requires human review.</p>
    <select value={target} onChange={event => { setTarget(event.target.value); setResult(null); }} className="mt-4 w-full rounded-lg border border-[#d6c7a7] bg-[#fffaf0] px-3 py-2 text-xs text-[#263b52] focus:border-[#2696a8] focus:outline-none">{demo.contract.clauses.map(item => <option key={item.id} value={item.clause_id}>{item.clause_id} - {item.section_title}</option>)}</select>
    <div className="mt-3 flex gap-2"><button onClick={() => setObjective('balanced')} className={`rounded-md px-3 py-2 text-xs font-medium cursor-pointer ${objective === 'balanced' ? 'bg-[#17304e] text-white shadow-sm' : 'bg-[#fffaf0] border border-[#d6c7a7] text-[#617080]'}`}>Balanced</button><button onClick={() => setObjective('protective')} className={`rounded-md px-3 py-2 text-xs font-medium cursor-pointer ${objective === 'protective' ? 'bg-[#17304e] text-white shadow-sm' : 'bg-[#fffaf0] border border-[#d6c7a7] text-[#617080]'}`}>More protective</button>{!isOfflineMode && <button onClick={generate} disabled={isLoading} className="ml-auto rounded-md bg-gradient-to-r from-[#1f5f8b] to-[#2696a8] px-3 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer disabled:opacity-50">{isLoading ? 'Retrieving policy...' : 'Generate live draft'}</button>}</div>
    <Block title={`Original · ${target}`} text={clause?.content || ''} tone="muted" />
    <Block title={result?.policy_label ? `Suggested replacement · ${result.policy_label}` : 'Suggested replacement'} text={replacement} tone="draft" />
    {!isOfflineMode && policySources.length > 0 && <div className="mt-3 rounded-lg border border-[#b9d8d9] bg-[#eef8f7] p-3"><p className="text-[10px] uppercase tracking-widest text-[#2a7886]">Policy source retrieval · {policySources.length} source{policySources.length === 1 ? '' : 's'}</p><p className="mt-1 text-[11px] leading-5 text-[#5f7076]">Draft constrained using retrieved internal policy material. Human review remains required.</p></div>}
    <button onClick={copy} className="mt-3 flex w-full justify-center items-center gap-2 rounded-lg bg-[#17304e] hover:bg-[#24496d] px-3 py-2.5 text-xs font-semibold text-white cursor-pointer shadow-sm"><Copy className="w-4 h-4"/>{copied ? 'Copied to clipboard' : 'Copy draft for negotiation'}</button>
    <div className="mt-4 flex gap-2 text-[11px] leading-4 text-[#8a6b27]"><Sparkles className="w-4 h-4 shrink-0"/>AI-assisted draft only. It is not a validity or enforceability determination.</div>
  </div>;
}
function Block({ title, text, tone }: { title: string; text: string; tone: 'muted' | 'draft' }) { return <div className={`mt-5 rounded-lg border p-3 ${tone === 'draft' ? 'border-[#9fcfc8] bg-[#edf8f4]' : 'border-[#e5d7ba] bg-[#f9f0dc]'}`}><div className="text-[10px] uppercase tracking-widest text-[#837a67]">{title}</div><p className="mt-2 text-xs leading-5 text-[#455968]">{text}</p></div>; }
