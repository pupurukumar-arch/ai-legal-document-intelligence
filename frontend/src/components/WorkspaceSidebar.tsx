import { FileQuestion, FileSearch, FolderOpen, Home, PenLine, Sparkles } from 'lucide-react';

export type WorkspaceView = 'home' | 'document' | 'answer' | 'review' | 'redline';

const items: Array<{ id: WorkspaceView; label: string; hint: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', hint: 'Start here', icon: Home },
  { id: 'document', label: 'Documents', hint: 'Choose a file', icon: FolderOpen },
  { id: 'answer', label: 'Ask', hint: 'Ask about it', icon: FileQuestion },
  { id: 'review', label: 'Review', hint: 'Find risks', icon: FileSearch },
  { id: 'redline', label: 'Draft', hint: 'Suggest changes', icon: PenLine },
];

export function WorkspaceSidebar({ activeView, onSelect, filename }: { activeView: WorkspaceView; onSelect: (view: WorkspaceView) => void; filename: string }) {
  return <aside className="shrink-0 lg:w-64">
    <nav className="flex gap-1 overflow-x-auto border-b border-[#d8c8a8] bg-[#f8efd9] p-2 lg:min-h-full lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:p-4">
      <div className="hidden border-b border-[#dfd0af] px-2 pb-4 pt-1 lg:block"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#806b3c]"><Sparkles className="h-3.5 w-3.5 text-[#28758a]" /> Current document</div><p className="mt-2 truncate text-sm font-medium text-[#455968]" title={filename}>{filename}</p></div>
      <div className="flex gap-1 lg:mt-3 lg:flex-col">{items.map(({ id, label, hint, icon: Icon }) => <button key={id} onClick={() => onSelect(id)} className={`group flex min-w-fit items-center gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200 lg:w-full ${activeView === id ? 'bg-[#d5ece8] text-[#173f50]' : 'text-[#4f5f67] hover:bg-[#efe0ba] hover:text-[#17304e]'}`}><Icon className={`h-[18px] w-[18px] shrink-0 ${activeView === id ? 'text-[#24798a]' : 'text-[#718087]'}`} /><span><span className="block text-sm font-semibold">{label}</span><span className={`hidden text-[11px] lg:block ${activeView === id ? 'text-[#4a7d82]' : 'text-[#8a826f]'}`}>{hint}</span></span></button>)}</div>
    </nav>
  </aside>;
}
