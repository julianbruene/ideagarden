'use client'

import { useState, useRef, useEffect } from 'react'
import type { Input } from '@/lib/types'

interface Props {
  ideaId: string
  notes: Input[]
  onNoteAdded: (note: Input) => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
  if (diffH < 1) return 'just now'
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  if (diffH < 48) return 'yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function IdeaNotes({ ideaId, notes, onNoteAdded }: Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    const res = await fetch(`/api/ideas/${ideaId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed }),
    })
    if (res.ok) {
      const { input } = await res.json()
      onNoteAdded(input)
      setText('')
      textareaRef.current?.focus()
    }
    setSubmitting(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // User notes only (no AI responses)
  const userNotes = notes.filter((n) => n.role === 'user')

  return (
    <div className="flex flex-col h-full">
      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
        {userNotes.length === 0 && (
          <p className="text-xs text-garden-muted/60 text-center py-8 italic">
            Noch keine Notes. Dump deine ersten Gedanken.
          </p>
        )}
        {userNotes.map((note) => (
          <div
            key={note.id}
            className="bg-garden-bg rounded-xl border border-garden-border px-4 py-3 animate-fade-in"
          >
            <p className="text-sm text-garden-text leading-relaxed whitespace-pre-wrap break-words">
              {note.content}
            </p>
            <p className="text-[10px] text-garden-muted/60 mt-2">
              {formatDate(note.created_at)}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input — Dump-Stil */}
      <div className="border-t border-garden-border bg-garden-surface px-3 py-3">
        <form onSubmit={handleSubmit}>
          <div className="bg-garden-bg rounded-xl border border-garden-border focus-within:border-garden-accent/50 focus-within:ring-2 focus-within:ring-garden-accent/10 transition-all">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Note hinzufügen… ⏎ zum Speichern"
              disabled={submitting}
              className="w-full px-3.5 pt-3 pb-2 bg-transparent resize-none outline-none text-garden-text placeholder:text-garden-muted/50 text-sm leading-relaxed disabled:opacity-50"
              rows={1}
            />
            <div className="flex justify-end px-2 pb-2">
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="p-1.5 rounded-lg bg-garden-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-garden-accent-dark transition-colors"
              >
                {submitting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
