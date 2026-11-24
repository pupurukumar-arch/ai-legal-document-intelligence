import { AlertTriangle, CheckCircle2, GitBranch, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DemoWorkspace } from '../data/demoContracts';

type Snapshot = { evidence_completeness: number; clause_clarity: number; risk_flags: number; high_risk_flags: number; negotiation_readiness: 'READY' | 'LIMITED'; references: { total: number; resolved: number }; methodology: string };
type Readiness = { status: string; summary: string; required_checks: { requirement: string; status: string }[]; policy_findings: { clause_id: string; risk_patterns_found?: string[] }[] };

export function ReviewPanel({ demo, onOpenClause, isOfflineMode }: { demo: DemoWorkspace; onOpenClause: (id: string) => void; isOfflineMode: boolean }) {
  const [liveReadiness, setLiveReadiness] = useState<Readiness | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<Snapshot | null>(null);
  const clauses = demo.contract.clauses;
  const documentType = demo.kind;
  const contractId = demo.contract.id;
  useEffect(() => {
    if (isOfflineMode) return;
    fetch('http://localhost:3050/api/readiness-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document_type: documentType, clauses }) })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Readiness service unavailable')))
      .then(data => { setLiveReadiness(data.readiness); setLiveSnapshot(data.snapshot || null); })
      .catch(() => { setLiveReadiness(null); setLiveSnapshot(null); });
  }, [clauses, contractId, documentType, isOfflineMode]);
  return <div className="rounded-xl border border-[#ded2b6] bg-[#fffdf8] p-5 h-full overflow-auto shadow-[0_8px_22px_rgba(83,60,20,0.08)]">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.18em] text-[#837a67]">Policy graph review</p><h2 className="mt-1 text-base font-semibold text-[#17304e]">Readiness checks</h2></div><ShieldCheck className="w-5 h-5 text-[#31816b]"/></div>
    <p className="mt-2 text-xs leading-5 text-[#737b7b]">Checks are mapped to a versioned document-type policy graph. Findings are review prompts, not legal conclusions.</p>
    <div className="mt-5 grid grid-cols-3 gap-2"><Metric value={`${demo.contract.total_clauses}`} label="clauses"/><Metric value={`${demo.contract.dependencies_linked ?? 0}`} label="links"/><Metric value={`${liveReadiness?.policy_findings.length ?? demo.review.length}`} label="finding"/></div>
    <ContractReviewSnapshot snapshot={liveSnapshot || preparedSnapshot(demo)} live={!isOfflineMode && Boolean(liveSnapshot)} />
    {!isOfflineMode && liveReadiness && <div className="mt-4 rounded-lg border border-[#b9d8d9] bg-[#eef8f7] p-3"><div className="text-[10px] uppercase tracking-widest text-[#2a7886]">Live readiness result · {liveReadiness.status.replace(/_/g, ' ')}</div><p className="mt-1 text-xs leading-5 text-[#44586b]">{liveReadiness.summary}</p><p className="mt-1.5 text-[11px] text-[#71808a]">{liveReadiness.required_checks.filter(item => item.status === 'MISSING').length} required item(s) missing · {liveReadiness.policy_findings.length} policy finding(s)</p></div>}
    <div className="mt-5 space-y-3">{(liveReadiness?.policy_findings.length ? liveReadiness.policy_findings.map(item => ({ severity: 'High', title: item.risk_patterns_found?.join(', ') || 'Policy review finding', detail: `Review ${item.clause_id} against its policy checks.`, clauseId: item.clause_id })) : demo.review).map((item) => <button key={item.title} onClick={() => onOpenClause(item.clauseId)} className="w-full text-left rounded-lg border border-[#e5b6a8] bg-[#fff0e9] p-3 cursor-pointer hover:border-[#c97d6b]"><div className="flex gap-2"><AlertTriangle className="w-4 h-4 text-[#b85a45] shrink-0 mt-0.5"/><div><div className="text-xs font-semibold text-[#8f402f]">{item.severity} · {item.title}</div><p className="mt-1 text-xs leading-5 text-[#6e625e]">{item.detail}</p></div></div></button>)}</div>
    <div className="mt-5 rounded-lg bg-[#f8f1e1] border border-[#e5d7ba] p-3 text-xs text-[#66717a]"><div className="flex items-center gap-2 text-[#34475c]"><GitBranch className="w-4 h-4"/>Review path</div><p className="mt-2 leading-5">Document type → clause type → review rules → approved draft template → human review</p></div>
    <div className="mt-4 flex gap-2 text-xs text-[#31816b]"><CheckCircle2 className="w-4 h-4"/> Dependency-completeness guardrail enabled</div>
  </div>;
}
function Metric({ value, label }: { value: string | number; label: string }) { return <div className="rounded-lg bg-[#f8f1e1] border border-[#e5d7ba] px-2 py-3 text-center"><div className="text-base font-semibold text-[#17304e]">{value}</div><div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#837a67]">{label}</div></div>; }

function preparedSnapshot(demo: DemoWorkspace): Snapshot {
  const refs = demo.contract.clauses.flatMap(clause => clause.cross_references || []);
  const codeSet = new Set(demo.contract.clauses.map(clause => clause.clause_id));
  const resolved = refs.filter(reference => demo.contract.clauses.some(clause => clause.section_title.toLowerCase().includes(reference.toLowerCase()) || codeSet.has(reference.replace(/section\s*/i, 'SEC-').replace(/\s/g, '').toUpperCase())));
  return { evidence_completeness: refs.length ? Math.round(resolved.length / refs.length * 100) : 100, clause_clarity: Math.max(55, 100 - demo.review.length * 25), risk_flags: demo.review.length, high_risk_flags: demo.review.filter(item => item.severity === 'High').length, negotiation_readiness: demo.review.length ? 'READY' : 'LIMITED', references: { total: refs.length, resolved: resolved.length }, methodology: 'Prepared demo indicators based on the current sample agreement.' };
}

function ContractReviewSnapshot({ snapshot, live }: { snapshot: Snapshot; live: boolean }) {
  const bars = [{ label: 'Evidence completeness', value: snapshot.evidence_completeness, detail: `${snapshot.references.resolved}/${snapshot.references.total} references resolved` }, { label: 'Clause clarity', value: snapshot.clause_clarity, detail: 'Coverage and policy-pattern indicator' }];
  return <section className="mt-5 rounded-xl border border-[#d8c8a8] bg-[#fffaf0] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#806b3c]">Contract review snapshot</p><h3 className="mt-1 text-sm font-semibold text-[#17304e]">Prototype risk indicators</h3></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${live ? 'bg-[#d9f0ed] text-[#24798a]' : 'bg-[#f5ead1] text-[#806b3c]'}`}>{live ? 'Live analysis' : 'Sample analysis'}</span></div><div className="mt-4 space-y-3">{bars.map(bar => <div key={bar.label}><div className="flex items-baseline justify-between gap-3"><span className="text-xs font-medium text-[#455968]">{bar.label}</span><span className="text-xs font-semibold text-[#17304e]">{bar.value}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eadfc7]"><div className="h-full rounded-full bg-gradient-to-r from-[#28758a] to-[#4aa79a] transition-all duration-500" style={{ width: `${bar.value}%` }} /></div><p className="mt-1 text-[10px] text-[#837a67]">{bar.detail}</p></div>)}</div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg bg-[#fffdf8] p-3"><p className="text-[10px] uppercase tracking-wider text-[#837a67]">Risk flags</p><p className="mt-1 text-lg font-semibold text-[#b85a45]">{snapshot.high_risk_flags ? `${snapshot.high_risk_flags} high` : `${snapshot.risk_flags} review`}</p></div><div className="rounded-lg bg-[#fffdf8] p-3"><p className="text-[10px] uppercase tracking-wider text-[#837a67]">Negotiation readiness</p><p className="mt-1 text-lg font-semibold text-[#24798a]">{snapshot.negotiation_readiness === 'READY' ? 'Ready' : 'Limited'}</p></div></div><p className="mt-3 text-[10px] leading-4 text-[#837a67]">{snapshot.methodology}</p></section>;
}
