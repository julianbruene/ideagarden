'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import IdeaNotes from '@/components/IdeaNotes'
import IdeaChat from '@/components/IdeaChat'
import type { Project, Input } from '@/lib/types'

interface Props {
  project: Project
  initialInputs: Input[]
}

type ActiveTab = 'notes' | 'chat'

export default function ProjectDetailClient({ project: initialProject, initialInputs }: Props) {
  const [project, setProject] = useState<Project>(initialProject)
  const [inputs, setInputs] = useState<Input[]>(initialInputs)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.title ?? '')
  const [completing, setCompleting] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes')
  const [synthLoading, setSynthLoading] = useState(false)
  const [synthOpen, setSynthOpen] = useState(!!project.synthesis)
  const titleRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function saveTitle() {
    setEditingTitle(false)
    const trimmed = titleDraft.trim() || null
    if (trimmed === project.title) return
    setProject((p) => ({ ...p, title: trimmed }))
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    })
  }

  async function handleGenerateSynthesis() {
    if (synthLoading) return
    setSynthLoading(true)
    const res = await fetch(`/api/projects/${project.id}/synthesis`, { method: 'POST' })
    const { synthesis } = await res.json()
    if (synthesis) {
      setProject((p) => ({ ...p, synthesis }))
      setSynthOpen(true)
    }
    setSynthLoading(false)
  }

  async function handleMarkDone() {
    if (completing) return
    const confirmed = window.confirm(
      'Projekt als fertig markieren? Es wird ins Archiv verschoben und als Markdown heruntergeladen.'
    )
    if (!confirmed) return
    setCompleting(true)

    const mdRes = await fetch(`/api/projects/${project.id}/export`)
    const { markdown } = await mdRes.json()
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(project.title ?? 'projekt').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)

    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
    })
    router.push('/done')
  }

  return (
    <div className="flex flex-col bg-garden-bg" style={{ height: '100dvh', paddingBottom: '56px' }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-garden-surface border-b border-garden-border px-4 py-3 flex items-center gap-3">
        <Link
          href="/projects"
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-border/40 text-garden-muted transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] uppercase tracking-widest text-garden-seed font-semibold">
              Projekt
            </span>
          </div>
          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') { setTitleDraft(project.title ?? ''); setEditingTitle(false) }
              }}
              className="w-full bg-transparent text-sm font-semibold text-garden-text outline-none border-b border-garden-accent"
              placeholder="Titel hinzufügen…"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.select(), 10) }}
              className="text-sm font-semibold text-garden-text hover:text-garden-accent transition-colors truncate block max-w-full text-left"
            >
              {project.title || 'Unbenanntes Projekt'}
            </button>
          )}
        </div>

        <Link
          href={`/projects/${project.id}/write`}
          className="text-xs px-3 py-1.5 rounded-xl bg-garden-accent text-white font-medium hover:bg-garden-accent-dark transition-colors whitespace-nowrap flex items-center gap-1"
          title="Text schreiben"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Schreiben
        </Link>

        <button
          onClick={handleMarkDone}
          disabled={completing || project.status === 'done'}
          className="text-xs px-3 py-1.5 rounded-xl bg-garden-seed-light text-garden-seed border border-garden-seed/30 font-medium hover:bg-garden-seed/10 transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          {completing ? '…' : 'Fertig'}
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

      {/* ── Main panels ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Left: Notes */}
        <div className={`flex flex-col w-full md:w-1/2 md:border-r border-garden-border min-h-0 ${
          activeTab === 'notes' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="flex-shrink-0 px-4 py-2 border-b border-garden-border/50 bg-garden-surface/60">
            <p className="text-[10px] uppercase tracking-widest text-garden-muted font-medium">Notes</p>
          </div>
          <IdeaNotes
            ideaId={project.id}
            notesEndpoint={`/api/projects/${project.id}/notes`}
            notes={inputs}
            onNoteAdded={(note) => setInputs((prev) => [...prev, note])}
            onNoteRemoved={(id) => setInputs((prev) => prev.filter((i) => i.id !== id))}
            onNoteUpdated={(updated) => setInputs((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
          />
        </div>

        {/* Right: Chat */}
        <div className={`flex flex-col w-full md:w-1/2 min-h-0 ${
          activeTab === 'chat' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="flex-shrink-0 px-4 py-2 border-b border-garden-border/50 bg-garden-surface/60">
            <p className="text-[10px] uppercase tracking-widest text-garden-muted font-medium">KI-Chat</p>
          </div>
          <IdeaChat
            ideaId={project.id}
            chatEndpoint={`/api/projects/${project.id}/chat`}
            allInputs={inputs}
            onMessageAdded={setInputs}
          />
        </div>
      </div>

      {/* ── Synthesis bar ── */}
      <div className="flex-shrink-0 border-t border-garden-border bg-garden-surface">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button
            onClick={handleGenerateSynthesis}
            disabled={synthLoading}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-garden-accent-light text-garden-accent border border-garden-accent/20 font-medium hover:bg-garden-accent/10 transition-colors disabled:opacity-50"
          >
            {synthLoading ? (
              <span className="w-3 h-3 border-2 border-garden-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            )}
            Synthese
          </button>

          {project.synthesis && (
            <button
              onClick={() => setSynthOpen((v) => !v)}
              className="flex items-center gap-1.5 flex-1 min-w-0 text-left group"
            >
              {!synthOpen && (
                <p className="text-xs text-garden-muted truncate flex-1">
                  {project.synthesis}
                </p>
              )}
              {synthOpen && (
                <p className="text-xs text-garden-muted flex-1">Synthese verbergen</p>
              )}
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                className={`flex-shrink-0 text-garden-muted transition-transform ${synthOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          )}

          {!project.synthesis && (
            <p className="text-xs text-garden-muted/50 italic">
              Noch keine Synthese.
            </p>
          )}
        </div>

        {synthOpen && project.synthesis && (
          <div className="px-4 pb-3">
            <p className="text-sm text-garden-text leading-relaxed bg-garden-accent-light rounded-xl px-4 py-3">
              {project.synthesis}
            </p>
          </div>
        )}
      </div>

      <NavBar />
    </div>
  )
}
