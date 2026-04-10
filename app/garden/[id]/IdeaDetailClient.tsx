'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import IdeaChat from '@/components/IdeaChat'
import type { Idea, Input } from '@/lib/types'

interface Props {
  idea: Idea
  initialInputs: Input[]
}

export default function IdeaDetailClient({ idea: initialIdea, initialInputs }: Props) {
  const [idea, setIdea] = useState<Idea>(initialIdea)
  const [inputs, setInputs] = useState<Input[]>(initialInputs)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(idea.title ?? '')
  const [completing, setCompleting] = useState(false)
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

  async function handleMarkDone() {
    if (completing) return
    const confirmed = window.confirm(
      'Mark this idea as done? It will move to the archive (read-only) and a Markdown file will download.'
    )
    if (!confirmed) return

    setCompleting(true)

    // Download markdown first
    const mdRes = await fetch(`/api/export/${idea.id}`)
    const { markdown } = await mdRes.json()
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(idea.title ?? 'idea').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)

    // Mark as done
    await fetch(`/api/ideas/${idea.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
    })

    router.push('/done')
  }

  const displayTitle = idea.title || 'Untitled idea'

  return (
    <div className="min-h-screen bg-garden-bg flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-sm border-b border-garden-border/50 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
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
                  if (e.key === 'Escape') {
                    setTitleDraft(idea.title ?? '')
                    setEditingTitle(false)
                  }
                }}
                className="w-full bg-transparent text-sm font-semibold text-garden-text outline-none border-b border-garden-accent"
                placeholder="Add a title…"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setEditingTitle(true)
                  setTimeout(() => titleRef.current?.select(), 10)
                }}
                className="text-sm font-semibold text-garden-text hover:text-garden-accent transition-colors truncate block max-w-full text-left"
                title="Tap to edit title"
              >
                {displayTitle}
              </button>
            )}
          </div>

          {/* Done button */}
          <button
            onClick={handleMarkDone}
            disabled={completing || idea.status === 'done'}
            className="text-xs px-3 py-1.5 rounded-xl bg-garden-seed-light text-garden-seed border border-garden-seed/30 font-medium hover:bg-garden-seed/10 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {completing ? '...' : 'Ready to use'}
          </button>
        </div>
      </header>

      {/* Synthesis banner */}
      <div className="max-w-lg mx-auto w-full px-4 pt-4">
        <div className="bg-garden-accent-light border border-garden-accent/20 rounded-2xl p-4 mb-3">
          <p className="text-[10px] uppercase tracking-widest text-garden-accent/70 font-medium mb-2">
            Synthesis
          </p>
          {idea.synthesis ? (
            <p className="text-sm text-garden-text leading-relaxed">{idea.synthesis}</p>
          ) : (
            <p className="text-sm text-garden-muted/60 italic">
              Add a few thoughts — the AI will synthesise as you go.
            </p>
          )}
        </div>
      </div>

      {/* Chat — flex-grow fills remaining space */}
      <div className="flex-1 max-w-lg mx-auto w-full flex flex-col min-h-0" style={{ minHeight: '60vh' }}>
        <IdeaChat
          ideaId={idea.id}
          initialInputs={inputs}
          onInputsChange={setInputs}
          onSynthesisUpdate={(s) => setIdea((i) => ({ ...i, synthesis: s }))}
        />
      </div>

      <NavBar />
    </div>
  )
}
