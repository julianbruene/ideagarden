'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import type { Source, SourceNote, SourceStatus, SourceType } from '@/lib/types'

export interface LinkedConceptLite {
  id: string
  title: string | null
  summary: string | null
}

interface Props {
  initialSource: Source
  initialNotes: SourceNote[]
  initialConcepts: LinkedConceptLite[]
}

const TYPES: { value: SourceType; label: string }[] = [
  { value: 'book', label: 'Buch' },
  { value: 'article', label: 'Artikel' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'course', label: 'Kurs' },
  { value: 'conversation', label: 'Gespräch' },
  { value: 'other', label: 'Sonstiges' },
]
const STATUSES: { value: SourceStatus; label: string }[] = [
  { value: 'want', label: 'Will ich lesen' },
  { value: 'reading', label: 'Lese gerade' },
  { value: 'done', label: 'Gelesen' },
]

type SaveState = 'saved' | 'dirty' | 'saving'

export default function SourceClient({ initialSource, initialNotes, initialConcepts }: Props) {
  const [source, setSource] = useState<Source>(initialSource)
  const [title, setTitle] = useState(source.title ?? '')
  const [author, setAuthor] = useState(source.author ?? '')
  const [notes, setNotes] = useState<SourceNote[]>(initialNotes)
  const [concepts] = useState<LinkedConceptLite[]>(initialConcepts)

  // Reading-note input
  const [noteDraft, setNoteDraft] = useState('')
  const [locDraft, setLocDraft] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteDraft, setEditNoteDraft] = useState('')
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // ── Metadata save (debounce + blur + Cmd-S + unmount flush) ────
  const dirty = title !== (source.title ?? '') || author !== (source.author ?? '')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const draftRef = useRef({ title, author })
  draftRef.current = { title, author }
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const savingRef = useRef(false)

  async function saveNow() {
    if (savingRef.current || !dirtyRef.current) return
    savingRef.current = true
    setSaveState('saving')
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: draftRef.current.title.trim() || null, author: draftRef.current.author.trim() || null }),
      })
      if (res.ok) { const { source: s } = await res.json(); setSource(s); setSaveState('saved') }
      else { setSaveState('dirty') }
    } catch { setSaveState('dirty') }
    finally { savingRef.current = false }
  }

  useEffect(() => { setSaveState(dirty ? 'dirty' : 'saved') }, [dirty])
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => saveNow(), 800)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, author])
  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return
      try {
        fetch(`/api/sources/${source.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: draftRef.current.title.trim() || null, author: draftRef.current.author.trim() || null }),
          keepalive: true,
        })
      } catch { /* best effort */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function patchMeta(updates: Partial<Source>) {
    const res = await fetch(`/api/sources/${source.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) { const { source: s } = await res.json(); setSource(s) }
  }

  async function deleteSource() {
    if (!window.confirm('Quelle löschen? Lesenotizen werden mit entfernt. Verknüpfte Konzepte bleiben (nur ihre Quelle wird gelöst).')) return
    await fetch(`/api/sources/${source.id}`, { method: 'DELETE' })
    router.push('/lernen/quellen')
  }

  // ── Reading notes ──────────────────────────────────────────────
  async function addNote(e?: React.FormEvent) {
    e?.preventDefault()
    const content = noteDraft.trim()
    if (!content || addingNote) return
    setAddingNote(true)
    try {
      const res = await fetch(`/api/sources/${source.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, location: locDraft.trim() || null }),
      })
      if (res.ok) {
        const { note } = await res.json()
        setNotes((prev) => [note, ...prev])
        setNoteDraft(''); setLocDraft('')
        noteRef.current?.focus()
      }
    } finally { setAddingNote(false) }
  }

  async function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    await fetch(`/api/sources/${source.id}/notes/${id}`, { method: 'DELETE' })
  }

  async function saveEditNote() {
    if (!editingNoteId) return
    const id = editingNoteId
    const next = editNoteDraft.trim()
    setEditingNoteId(null)
    if (!next) { deleteNote(id); return }
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, content: next } : n))
    await fetch(`/api/sources/${source.id}/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: next }),
    })
  }

  // Distill a reading note into a Concept, prefilled + linked to this source.
  async function distill(note: SourceNote) {
    const res = await fetch('/api/concepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: note.content, source_id: source.id }),
    })
    const data = await res.json()
    if (!res.ok || !data.concept?.id) {
      alert(`Destillieren fehlgeschlagen: ${data?.error ?? res.status}`)
      return
    }
    router.push(`/lernen/${data.concept.id}`)
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="sticky top-0 z-30 bg-garden-bg/92 backdrop-blur-md border-b border-garden-hairline pt-safe">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <Link
            href="/lernen/quellen"
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-hairline-soft text-garden-muted hover:text-garden-ink transition-colors"
            title="Zurück zu Quellen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="font-mono micro-caps text-garden-accent">Quelle</span>
          <span className="h-px flex-1 bg-garden-hairline" />
          {saveState === 'saving' ? (
            <span className="font-mono micro-caps text-garden-muted-soft flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-garden-accent animate-pulse" />speichert…
            </span>
          ) : saveState === 'dirty' ? (
            <button onClick={saveNow} className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-garden-accent" />Speichern
            </button>
          ) : (
            <span className="font-mono micro-caps text-garden-muted-soft flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              gespeichert
            </span>
          )}
          <button onClick={deleteSource} className="font-mono micro-caps text-garden-muted hover:text-garden-accent transition-colors">Löschen</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        {/* Title + author */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveNow}
          placeholder="Titel der Quelle"
          className="w-full bg-transparent font-display text-garden-ink outline-none border-b border-transparent focus:border-garden-accent/40 placeholder:text-garden-muted-soft/70 transition-colors pb-2"
          style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 500, lineHeight: 1.15 }}
        />
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          onBlur={saveNow}
          placeholder="Autor / Urheber"
          className="w-full bg-transparent font-display italic text-garden-muted outline-none placeholder:text-garden-muted-soft/70 mt-1"
          style={{ fontSize: 16 }}
        />

        {/* Type + status */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <select
            value={source.type}
            onChange={(e) => patchMeta({ type: e.target.value as SourceType })}
            className="font-mono micro-caps bg-garden-surface border border-garden-hairline rounded-full px-3 py-1 text-garden-ink outline-none focus:border-garden-accent/40"
          >
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={source.status}
            onChange={(e) => patchMeta({ status: e.target.value as SourceStatus })}
            className="font-mono micro-caps bg-garden-surface border border-garden-hairline rounded-full px-3 py-1 text-garden-ink outline-none focus:border-garden-accent/40"
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Reading notes */}
        <div className="mt-10 pt-6 border-t border-garden-hairline">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-accent">Lesenotizen</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <span className="font-mono micro-caps text-garden-muted-soft tabnums">
              {notes.length === 0 ? '—' : notes.length}
            </span>
          </div>

          <form onSubmit={addNote} className="bg-garden-surface rounded-xl border border-garden-hairline focus-within:border-garden-accent/50 focus-within:ring-2 focus-within:ring-garden-accent/10 transition-all mb-4">
            <textarea
              ref={noteRef}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote() } }}
              placeholder="Zitat, Gedanke, Reaktion beim Lesen…"
              rows={2}
              disabled={addingNote}
              className="w-full bg-transparent resize-none outline-none px-3 py-2 text-garden-ink placeholder:text-garden-muted-soft/70 font-serif leading-relaxed"
              style={{ fontSize: 14 }}
            />
            <div className="flex items-center justify-between px-2 pb-1.5 gap-2">
              <input
                type="text"
                value={locDraft}
                onChange={(e) => setLocDraft(e.target.value)}
                placeholder="S. 42 (optional)"
                className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[11px] text-garden-muted placeholder:text-garden-muted-soft/70 px-1"
                maxLength={24}
              />
              <button
                type="submit"
                disabled={!noteDraft.trim() || addingNote}
                title="Notiz speichern"
                className="w-6 h-6 rounded-full flex items-center justify-center bg-garden-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-garden-accent-deep transition-colors flex-shrink-0"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </div>
          </form>

          {notes.length === 0 ? (
            <p className="font-display italic text-garden-muted-soft text-[14px] py-1">Noch keine Lesenotizen.</p>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => {
                const isEditing = editingNoteId === n.id
                return (
                  <div key={n.id} className="group relative bg-garden-surface rounded-xl border border-garden-hairline hover:border-garden-accent/30 transition-all overflow-hidden">
                    {isEditing ? (
                      <textarea
                        value={editNoteDraft}
                        onChange={(e) => setEditNoteDraft(e.target.value)}
                        onBlur={saveEditNote}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { e.preventDefault(); setEditingNoteId(null) }
                          else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEditNote() }
                        }}
                        autoFocus
                        rows={Math.max(2, Math.min(10, editNoteDraft.split('\n').length + 1))}
                        className="w-full bg-white border-b border-garden-accent/30 px-3 py-2.5 text-garden-ink leading-relaxed resize-y outline-none focus:ring-2 focus:ring-garden-accent/10"
                        style={{ fontSize: 14 }}
                      />
                    ) : (
                      <div className="px-3 py-2.5">
                        <button
                          onClick={() => { setEditingNoteId(n.id); setEditNoteDraft(n.content) }}
                          className="block w-full text-left"
                          title="Klick zum Bearbeiten"
                        >
                          <p className="font-serif text-garden-ink leading-relaxed whitespace-pre-wrap break-words" style={{ fontSize: 14 }}>
                            {n.content}
                          </p>
                        </button>
                        <div className="flex items-center gap-3 mt-1.5">
                          {n.location && <span className="font-mono micro-caps text-garden-muted-soft">{n.location}</span>}
                          <span className="flex-1" />
                          <button
                            onClick={() => distill(n)}
                            className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors opacity-0 group-hover:opacity-100"
                            title="Zu einem Konzept destillieren"
                          >
                            → Konzept
                          </button>
                          <button
                            onClick={() => deleteNote(n.id)}
                            className="font-mono micro-caps text-garden-muted-soft hover:text-garden-accent transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Concepts from this source */}
        <div className="mt-10 pt-6 border-t border-garden-hairline">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-accent">Konzepte aus dieser Quelle</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <span className="font-mono micro-caps text-garden-muted-soft tabnums">
              {concepts.length === 0 ? '—' : concepts.length}
            </span>
          </div>
          {concepts.length === 0 ? (
            <p className="font-display italic text-garden-muted-soft text-[14px] py-1">
              Noch keine. Destilliere eine Lesenotiz oder wähle diese Quelle in einem Konzept.
            </p>
          ) : (
            <div className="space-y-1">
              {concepts.map((c) => (
                <Link key={c.id} href={`/lernen/${c.id}`} className="block py-2 group">
                  <p className="font-display text-garden-ink group-hover:text-garden-accent transition-colors" style={{ fontSize: 15, fontWeight: 500 }}>
                    {c.title || 'Unbenanntes Konzept'}
                  </p>
                  {c.summary && <p className="font-display italic text-garden-muted text-[13px] line-clamp-1">{c.summary}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="h-32" />
      </main>

      <Sidebar />
      <NavBar />
    </div>
  )
}
