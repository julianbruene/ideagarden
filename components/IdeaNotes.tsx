'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Input } from '@/lib/types'

interface Props {
  ideaId: string
  notes: Input[]
  onNoteAdded: (note: Input) => void
  onNoteRemoved: (id: string) => void
  onNoteUpdated: (note: Input) => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
  if (diffH < 1) return 'gerade eben'
  if (diffH < 24) return `vor ${Math.floor(diffH)}h`
  if (diffH < 48) return 'gestern'
  return d.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
}

function isImageNote(content: string) { return content.startsWith('[img]') }
function getImageUrl(content: string) { return content.slice(5) }

export default function IdeaNotes({ ideaId, notes, onNoteAdded, onNoteRemoved, onNoteUpdated }: Props) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [transcribing, setTranscribing] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  // Show notes (is_note !== false), starred ones first then chronological
  const userNotes = notes
    .filter((n) => n.role === 'user' && n.is_note !== false)
    .sort((a, b) => {
      if (a.starred && !b.starred) return -1
      if (!a.starred && b.starred) return 1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  async function uploadImage(file: File): Promise<string | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('node-images').upload(path, file, { upsert: false })
    if (error) return null
    const { data } = supabase.storage.from('node-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveNote(content: string): Promise<Input | null> {
    const res = await fetch(`/api/ideas/${ideaId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const { input } = await res.json()
      onNoteAdded(input)
      return input
    }
    return null
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    await saveNote(trimmed)
    setText('')
    textareaRef.current?.focus()
    setSubmitting(false)
  }


  async function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const url = await uploadImage(file)
    if (url) {
      const note = await saveNote(`[img]${url}`)
      // Kick off transcription in background — update note when done
      if (note) {
        setTranscribing((prev) => new Set(prev).add(note.id))
        fetch(`/api/inputs/${note.id}/transcribe`, { method: 'POST' })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.input) onNoteUpdated(data.input) })
          .catch(() => null)
          .finally(() => setTranscribing((prev) => { const s = new Set(prev); s.delete(note.id); return s }))
      }
    }
    setUploading(false)
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await handleImageFile(file)
    e.target.value = ''
  }

  async function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (blob) await handleImageFile(blob)
        return
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function handleDelete(id: string) {
    onNoteRemoved(id)
    await fetch(`/api/inputs/${id}`, { method: 'DELETE' })
  }

  async function handleSendToDump(id: string) {
    onNoteRemoved(id)
    await fetch(`/api/inputs/${id}`, { method: 'POST' })
  }

  async function handleToggleStar(note: Input) {
    const next = !note.starred
    // Optimistic update
    onNoteUpdated({ ...note, starred: next })
    await fetch(`/api/inputs/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: next }),
    })
  }

  const busy = submitting || uploading

  return (
    <div className="flex flex-col h-full min-h-0">
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
            className="bg-garden-bg rounded-xl border border-garden-border overflow-hidden animate-fade-in"
          >
            {/* Star button — top right */}
            <div className="relative">
              <button
                onClick={() => handleToggleStar(note)}
                title={note.starred ? 'Stern entfernen' : 'Als Key-Idee markieren'}
                className={`absolute top-2.5 right-2.5 p-1 rounded-lg transition-colors z-10 ${
                  note.starred
                    ? 'text-amber-400 hover:text-amber-300'
                    : 'text-garden-muted/30 hover:text-amber-400'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24"
                  fill={note.starred ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth={1.8}
                  strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>

              {/* Content */}
              {isImageNote(note.content) ? (
                <div>
                  <Image
                    src={getImageUrl(note.content)}
                    alt="Note image"
                    width={400}
                    height={300}
                    className="w-full object-cover max-h-56"
                    unoptimized
                  />
                  {/* Transcript */}
                  {note.image_transcript ? (
                    <div className="px-3.5 pt-2 pb-1">
                      <p className="text-xs text-garden-muted leading-relaxed whitespace-pre-wrap break-words">
                        {note.image_transcript}
                      </p>
                    </div>
                  ) : transcribing.has(note.id) ? (
                    <div className="px-3.5 pt-2 pb-1 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 border-2 border-garden-muted/30 border-t-garden-muted rounded-full animate-spin block flex-shrink-0" />
                      <p className="text-xs text-garden-muted/40 italic">Text wird extrahiert…</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="px-3.5 pt-3 pb-2 pr-9">
                  <p className="text-sm text-garden-text leading-relaxed whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                </div>
              )}
            </div>

            {/* Footer: date + actions */}
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-garden-muted/60">{formatDate(note.created_at)}</span>
                {note.starred && (
                  <span className="text-[9px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                    Key
                  </span>
                )}
              </div>

              {/* Action buttons */}
              {actionId === note.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { handleSendToDump(note.id); setActionId(null) }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-garden-accent-light text-garden-accent hover:bg-garden-accent/20 transition-colors font-medium"
                    title="Zurück in den Dump"
                  >
                    → Dump
                  </button>
                  <button
                    onClick={() => { handleDelete(note.id); setActionId(null) }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors font-medium"
                  >
                    Löschen
                  </button>
                  <button
                    onClick={() => setActionId(null)}
                    className="p-1 rounded-lg text-garden-muted hover:text-garden-text"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActionId(note.id)}
                  className="p-1 rounded-lg text-garden-muted/40 hover:text-garden-muted transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-garden-border bg-garden-surface px-3 py-3">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
        <form onSubmit={handleSubmit}>
          <div className="bg-garden-bg rounded-xl border border-garden-border focus-within:border-garden-accent/50 focus-within:ring-2 focus-within:ring-garden-accent/10 transition-all">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Note hinzufügen… ⏎ zum Speichern"
              disabled={busy}
              className="w-full px-3.5 pt-3 pb-2 bg-transparent resize-none outline-none text-garden-text placeholder:text-garden-muted/50 text-sm leading-relaxed disabled:opacity-50"
              rows={1}
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="p-1.5 rounded-lg text-garden-muted hover:text-garden-text hover:bg-garden-border/40 transition-colors disabled:opacity-40"
              >
                {uploading ? (
                  <span className="w-4 h-4 border-2 border-garden-muted border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                )}
              </button>
              <button
                type="submit"
                disabled={!text.trim() || busy}
                className="p-1.5 rounded-lg bg-garden-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-garden-accent-dark transition-colors"
              >
                {submitting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
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
