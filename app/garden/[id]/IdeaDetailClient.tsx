'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import IdeaNotes from '@/components/IdeaNotes'
import IdeaChat from '@/components/IdeaChat'
import type { Idea, Input } from '@/lib/types'

interface Props {
  idea: Idea
  initialInputs: Input[]
}

type ActiveTab = 'notes' | 'chat'

export default function IdeaDetailClient({ idea: initialIdea, initialInputs }: Props) {
  const [idea, setIdea] = useState<Idea>(initialIdea)
  const [inputs, setInputs] = useState<Input[]>(initialInputs)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(idea.title ?? '')
  const [completing, setCompleting] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes')
  const [synthLoading, setSynthLoading] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function saveTitle() {
    setEditingTitle(false)
    const trimmed = titleDraft.trim() || null
    if (trimmed === idea.title) return
    setIdea((i) => ({ ...i, title: trimmed }))
    await fetch(`/api/ideas/${idea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    })
  }

  async function handleGenerateSynthesis() {
    if (synthLoading) return
    setSynthLoading(true)
    const res = await fetch(`/api/ideas/${idea.id}/synthesis`, { method: 'POST' })
    const { synthesis } = await res.json()
    if (synthesis) setIdea((i) => ({ ...i, synthesis }))
    setSynthLoading(false)
  }

  async function handleMarkDone() {
    if (completing) return
    const confirmed = window.confirm(
      'Idee als fertig markieren? Sie wird ins Archiv verschoben und als Markdown heruntergeladen.'
    )
    if (!confirmed) return

    setCompleting(true)

    const mdRes = await fetch(`/api/export/${idea.id}`)
    const { markdown } = await mdRes.json()
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(idea.title ?? 'idea').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)

    await fetch(`/api/ideas/${idea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
    })

    router.push('/done')
  }

  return (
    <div className="flex flex-col bg-garden-bg" style={{ height: '100dvh' }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-garden-surface border-b border-garden-border px-4 py-3 flex items-center gap-3 pt-safe">
        <Link
          href="/garden"
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-border/40 text-garden-muted transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') { setTitleDraft(idea.title ?? ''); setEditingTitle(false) }
              }}
              className="w-full bg-transparent text-sm font-semibold text-garden-text outline-none border-b border-garden-accent"
              placeholder="Titel hinzufügen…"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.select(), 10) }}
              className="text-sm font-semibold text-garden-text hover:text-garden-accent transition-colors truncate block max-w-full text-left"
              title="Titel bearbeiten"
            >
              {idea.title || 'Unbenannte Idee'}
            </button>
          )}
        </div>

        <button
          onClick={handleMarkDone}
          disabled={completing || idea.status === 'done'}
          className="text-xs px-3 py-1.5 rounded-xl bg-garden-seed-light text-garden-seed border border-garden-seed/30 font-medium hover:bg-garden-seed/10 transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          {completing ? '...' : 'Fertig'}
        </button>
      </header>

      {/* ── Mobile tabs ── */}
      <div className="flex-shrink-0 flex md:hidden border-b border-garden-border bg-garden-surface">
        {(['notes', 'chat'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-garden-accent border-b-2 border-garden-accent'
                : 'text-garden-muted'
            }`}
          >
            {tab === 'notes' ? 'Notes' : 'KI-Chat'}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Left: Notes — always visible on desktop, tab-controlled on mobile */}
        <div className={`flex flex-col w-full md:w-1/2 md:border-r border-garden-border min-h-0 ${
          activeTab === 'notes' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Panel header */}
          <div className="flex-shrink-0 px-4 py-2.5 border-b border-garden-border/50 bg-garden-surface/50">
            <p className="text-[11px] uppercase tracking-widest text-garden-muted font-medium">Notes</p>
          </div>
          <IdeaNotes
            ideaId={idea.id}
            notes={inputs}
            onNoteAdded={(note) => setInputs((prev) => [...prev, note])}
          />
        </div>

        {/* Right: Chat */}
        <div className={`flex flex-col w-full md:w-1/2 min-h-0 ${
          activeTab === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          {/* Panel header */}
          <div className="flex-shrink-0 px-4 py-2.5 border-b border-garden-border/50 bg-garden-surface/50">
            <p className="text-[11px] uppercase tracking-widest text-garden-muted font-medium">KI-Chat</p>
          </div>
          <IdeaChat
            ideaId={idea.id}
            allInputs={inputs}
            onMessageAdded={setInputs}
          />
        </div>
      </div>

      {/* ── Synthesis bar (bottom) ── */}
      <div className="flex-shrink-0 border-t border-garden-border bg-garden-surface px-4 py-3">
        <div className="flex items-start gap-3 max-w-3xl mx-auto">
          <button
            onClick={handleGenerateSynthesis}
            disabled={synthLoading}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-garden-accent-light text-garden-accent border border-garden-accent/20 font-medium hover:bg-garden-accent/10 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {synthLoading ? (
              <span className="w-3 h-3 border-2 border-garden-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            )}
            Synthese
          </button>

          <div className="flex-1 min-w-0">
            {idea.synthesis ? (
              <p className="text-xs text-garden-text leading-relaxed">{idea.synthesis}</p>
            ) : (
              <p className="text-xs text-garden-muted/50 italic">
                Noch keine Synthese — klick den Knopf wenn du bereit bist.
              </p>
            )}
          </div>
        </div>
      </div>

      <NavBar />
    </div>
  )
}
