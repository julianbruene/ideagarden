'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Project, Input } from '@/lib/types'

interface Props {
  project: Project
  notes: Input[]
}

function isImageNote(content: string) { return content.startsWith('[img]') }
function getImageUrl(content: string) { return content.slice(5) }

export default function WriteClient({ project: initialProject, notes }: Props) {
  const [title, setTitle] = useState(initialProject.title ?? '')
  const [content, setContent] = useState(initialProject.writing_content ?? '')
  const [outline, setOutline] = useState(initialProject.outline ?? '')
  const [panelOpen, setPanelOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [notesState, setNotesState] = useState<Input[]>(notes)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteField, setEditingNoteField] = useState<'content' | 'transcript'>('content')
  const [editNoteDraft, setEditNoteDraft] = useState('')

  async function saveNoteEdit(note: Input) {
    const field = editingNoteField
    const current = field === 'content' ? note.content : (note.image_transcript ?? '')
    if (editNoteDraft === current) { setEditingNoteId(null); return }

    const payload = field === 'content'
      ? { content: editNoteDraft }
      : { image_transcript: editNoteDraft || null }

    // Optimistic
    const optimistic: Input = field === 'content'
      ? { ...note, content: editNoteDraft }
      : { ...note, image_transcript: editNoteDraft || null }
    setNotesState((prev) => prev.map((n) => n.id === note.id ? optimistic : n))
    setEditingNoteId(null)
    setEditNoteDraft('')

    const res = await fetch(`/api/inputs/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const { input } = await res.json()
      if (input) setNotesState((prev) => prev.map((n) => n.id === note.id ? input : n))
    }
  }

  // For autosave: track the last saved snapshot to avoid no-op writes
  const lastSaved = useRef({
    title: initialProject.title ?? '',
    content: initialProject.writing_content ?? '',
    outline: initialProject.outline ?? '',
  })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const save = useCallback(async () => {
    if (
      title === lastSaved.current.title &&
      content === lastSaved.current.content &&
      outline === lastSaved.current.outline
    ) return

    const snapshot = { title, content, outline }
    try {
      await fetch(`/api/projects/${initialProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: snapshot.title.trim() || null,
          writing_content: snapshot.content,
          outline: snapshot.outline,
        }),
      })
      lastSaved.current = { ...snapshot }
    } catch (e) {
      console.error('Autosave failed:', e)
    }
  }, [title, content, outline, initialProject.id])

  // Debounced autosave
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [title, content, outline, save])

  // Save on unload
  useEffect(() => {
    const handler = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      save()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [save])

  async function handleDone() {
    if (completing) return
    const confirmed = window.confirm(
      'Projekt als fertig markieren? Wird als Markdown heruntergeladen und ins Archiv verschoben.'
    )
    if (!confirmed) return
    setCompleting(true)

    // Flush any pending save
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await save()

    const mdRes = await fetch(`/api/projects/${initialProject.id}/export`)
    const { markdown } = await mdRes.json()
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(title.trim() || 'projekt').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)

    await fetch(`/api/projects/${initialProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
    })
    router.push('/done')
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ minHeight: '100dvh' }}>
      {/* Top bar — subtle, becomes fully opaque on hover */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 text-garden-muted/50 hover:text-garden-muted transition-colors group">
        <Link
          href={`/projects/${initialProject.id}`}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-bg transition-colors"
          title="Zurück zur Projekt-Übersicht"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <button
          onClick={handleDone}
          disabled={completing}
          className="text-xs px-3 py-1.5 rounded-xl border border-garden-border/60 text-garden-muted hover:text-garden-seed hover:border-garden-seed/40 transition-colors disabled:opacity-40"
        >
          {completing ? '…' : 'Fertig'}
        </button>
      </div>

      {/* Main writing surface — centered, max-width for readability */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-6 md:py-10">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel"
            className="w-full font-display text-3xl md:text-5xl text-garden-text bg-transparent outline-none placeholder:text-garden-muted-soft/50 mb-10 leading-tight"
            style={{ fontWeight: 500 }}
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hier schreiben…"
            className="w-full bg-transparent outline-none resize-none font-serif text-lg md:text-xl text-garden-text placeholder:text-garden-muted-soft/40"
            style={{
              lineHeight: 1.8,
              minHeight: '70vh',
              fontWeight: 400,
            }}
          />
        </div>
      </div>

      {/* Edge tab — always visible, opens side panel */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 items-center gap-1 bg-garden-bg border border-r-0 border-garden-border rounded-l-xl py-4 px-2 text-garden-muted/60 hover:text-garden-accent hover:bg-white transition-colors"
          title="Notizen & Gliederung"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Mobile panel toggle — floating button bottom-right */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="md:hidden fixed right-4 bottom-4 bg-garden-surface border border-garden-border rounded-full p-3 shadow-lg text-garden-muted hover:text-garden-accent transition-colors"
          title="Notizen & Gliederung"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>
      )}

      {/* Side panel (desktop) / bottom sheet (mobile) */}
      {panelOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={() => setPanelOpen(false)}
          />

          <aside className="
            fixed z-50 bg-garden-surface border-garden-border
            md:top-0 md:right-0 md:h-full md:w-80 md:border-l md:shadow-xl
            inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl border-t shadow-2xl
            md:rounded-none md:inset-x-auto
            flex flex-col animate-fade-in
          ">
            {/* Panel header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-garden-border">
              <h3 className="text-xs uppercase tracking-widest text-garden-muted font-semibold">
                Referenz
              </h3>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1 rounded-lg text-garden-muted hover:text-garden-text transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto">

              {/* Outline */}
              <div className="px-4 py-4 border-b border-garden-border/60">
                <p className="text-[10px] uppercase tracking-widest text-garden-muted/70 font-medium mb-2">
                  Gliederung
                </p>
                <textarea
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  placeholder={'1. Einleitung\n2. Hauptteil\n3. Schluss'}
                  className="w-full bg-garden-bg/40 rounded-lg px-3 py-2 text-sm text-garden-text resize-y outline-none focus:ring-2 focus:ring-garden-accent/20 border border-garden-border/50 placeholder:text-garden-muted/40 font-mono leading-relaxed"
                  rows={6}
                  style={{ minHeight: '120px' }}
                />
              </div>

              {/* Notes */}
              <div className="px-4 py-4">
                <p className="text-[10px] uppercase tracking-widest text-garden-muted/70 font-medium mb-3">
                  Notes ({notes.length})
                </p>

                {notesState.length === 0 ? (
                  <p className="text-xs text-garden-muted/50 italic">
                    Keine Notes. Zurück ins Projekt, um welche hinzuzufügen.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {notesState.map((note) => {
                      const expanded = expandedNote === note.id
                      const isImg = isImageNote(note.content)
                      const isEditing = editingNoteId === note.id
                      const preview = isImg
                        ? (note.image_transcript?.slice(0, 60) ?? 'Screenshot')
                        : note.content.slice(0, 60)
                      return (
                        <li key={note.id}>
                          <button
                            onClick={() => setExpandedNote(expanded ? null : note.id)}
                            className={`w-full text-left text-xs px-2.5 py-2 rounded-lg border transition-colors ${
                              expanded
                                ? 'bg-garden-accent-light border-garden-accent/30'
                                : 'bg-garden-bg/60 border-garden-border/50 hover:border-garden-accent/30'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-garden-text">
                              {isImg && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
                                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                                  <circle cx="8.5" cy="8.5" r="1.5"/>
                                  <polyline points="21 15 16 10 5 21"/>
                                </svg>
                              )}
                              {note.starred && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 flex-shrink-0">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                </svg>
                              )}
                              {note.mirror_source_id && (
                                <span className="text-garden-accent flex-shrink-0" title="Spiegel">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                                  </svg>
                                </span>
                              )}
                              <span className="truncate flex-1">{preview}</span>
                            </div>
                          </button>

                          {expanded && (
                            <div className="mt-1.5 ml-1 pl-2 border-l-2 border-garden-accent/30">
                              {isImg && (
                                <Image
                                  src={getImageUrl(note.content)}
                                  alt="Note"
                                  width={300}
                                  height={200}
                                  className="w-full rounded-lg object-cover max-h-40 mb-1.5"
                                  unoptimized
                                />
                              )}

                              {/* Editable content / transcript */}
                              {isEditing ? (
                                <div>
                                  <textarea
                                    autoFocus
                                    value={editNoteDraft}
                                    onChange={(e) => setEditNoteDraft(e.target.value)}
                                    onBlur={() => saveNoteEdit(note)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') { e.preventDefault(); setEditingNoteId(null); setEditNoteDraft('') }
                                      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNoteEdit(note) }
                                    }}
                                    className="w-full bg-white border border-garden-accent/40 rounded-lg px-2 py-1.5 text-xs text-garden-text leading-relaxed resize-y outline-none focus:ring-2 focus:ring-garden-accent/20"
                                    rows={4}
                                  />
                                  <p className="text-[10px] text-garden-muted/50 mt-1">Cmd+Enter speichern · Esc abbrechen</p>
                                </div>
                              ) : isImg ? (
                                note.image_transcript ? (
                                  <p
                                    className="text-xs text-garden-muted leading-relaxed whitespace-pre-wrap break-words cursor-text hover:text-garden-text transition-colors"
                                    onClick={() => {
                                      setEditingNoteId(note.id)
                                      setEditingNoteField('transcript')
                                      setEditNoteDraft(note.image_transcript ?? '')
                                    }}
                                    title="Klick zum Bearbeiten"
                                  >
                                    {note.image_transcript}
                                  </p>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingNoteId(note.id)
                                      setEditingNoteField('transcript')
                                      setEditNoteDraft('')
                                    }}
                                    className="text-xs text-garden-muted/50 hover:text-garden-accent italic"
                                  >
                                    + Text hinzufügen
                                  </button>
                                )
                              ) : (
                                <p
                                  className="text-xs text-garden-text leading-relaxed whitespace-pre-wrap break-words py-1 cursor-text hover:bg-white/40 -mx-1 px-1 rounded transition-colors"
                                  onClick={() => {
                                    setEditingNoteId(note.id)
                                    setEditingNoteField('content')
                                    setEditNoteDraft(note.content)
                                  }}
                                  title="Klick zum Bearbeiten"
                                >
                                  {note.content}
                                </p>
                              )}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
