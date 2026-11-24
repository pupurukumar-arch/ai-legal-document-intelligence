import { BriefcaseBusiness, FileKey2, FileText, Home, LaptopMinimalCheck } from 'lucide-react';
import type { DemoWorkspace } from '../data/demoContracts';

export function ContractDeck({ demos, activeId, onSelect }: { demos: DemoWorkspace[]; activeId: string; onSelect: (demo: DemoWorkspace) => void }) {
  const icons = { nda: FileKey2, rental_agreement: Home, employment_agreement: BriefcaseBusiness, service_agreement: LaptopMinimalCheck };
  return <section className="rounded-2xl border border-[#ded2b6] bg-[#fffaf0]/80 p-3 sm:p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold text-[#243b53]">Try a sample agreement</p><p className="mt-0.5 text-[11px] text-[#7a7b70]">Choose a case to instantly change the workspace.</p></div><FileText className="h-4 w-4 text-[#2b7790]" /></div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{demos.map((demo) => { const Icon = icons[demo.kind]; const selected = activeId === demo.contract.id; return <button key={demo.kind} onClick={() => onSelect(demo)} className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all cursor-pointer ${selected ? 'border-[#71b9c7] bg-gradient-to-br from-[#e1f3f1] to-[#f5ead1] shadow-sm' : 'border-[#e1d6bb] bg-[#fffdf8] hover:border-[#80a9b4] hover:bg-[#f9f0dc]'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-[#1f7182] text-white' : 'bg-[#edf2ed] text-[#2b7790] group-hover:text-[#1b6172]'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className={`block truncate text-xs font-semibold ${selected ? 'text-[#17304e]' : 'text-[#34475c]'}`}>{demo.label}</span><span className={`mt-0.5 block truncate text-[10px] ${selected ? 'text-[#3f6972]' : 'text-[#85806d]'}`}>{selected ? 'Currently open' : 'Open sample'}</span></span></button>; })}</div>
  </section>;
}
