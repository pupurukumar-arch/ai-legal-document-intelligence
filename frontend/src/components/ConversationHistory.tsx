import { Bot, MessageCircleMore, User } from 'lucide-react';

export interface ConversationTurn { role: 'user' | 'assistant'; content: string; citations?: string[]; }

export function ConversationHistory({ turns }: { turns: ConversationTurn[] }) {
  if (!turns.length) return <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-[#d9c8a4] bg-[#fffaf0] p-4 text-sm text-[#737b7b]"><MessageCircleMore className="h-5 w-5 text-[#28758a]" /><span>Ask a first question, then use follow-ups such as “What about the notice period?”</span></div>;
  return <section className="mb-4 max-h-64 space-y-3 overflow-y-auto rounded-xl border border-[#ded2b6] bg-[#fffaf0] p-4">
    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#837a67]">Conversation</p>
    {turns.map((turn, index) => <div key={`${turn.role}-${index}`} className={`flex gap-2.5 ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {turn.role === 'assistant' && <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d9f0ed] text-[#28758a]"><Bot className="h-3.5 w-3.5" /></span>}
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${turn.role === 'user' ? 'bg-[#17304e] text-white' : 'border border-[#d9e4dc] bg-white text-[#435767]'}`}><p>{turn.content}</p>{turn.citations?.length ? <p className="mt-1.5 text-[10px] font-semibold text-[#28758a]">Evidence: {turn.citations.join(', ')}</p> : null}</div>
      {turn.role === 'user' && <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#efe0ba] text-[#806b3c]"><User className="h-3.5 w-3.5" /></span>}
    </div>)}
  </section>;
}
