'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Project, Input } from '@/lib/types'

interface Props {
  project: Project
  notes: Input[]
}

function isImageNote(content: string) { return content.startsWith('[img]') }
function getImageUrl(content: string) { return content.slice(5) }

function sortByOutline(a: Input, b: Input) {
  const ao = a.outline_order ?? Number.MAX_SAFE_INTEGER
  const bo = b.outline_order ?? Number.MAX_SAFE_INTEGER
  if (ao !== bo) return ao - bo
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

export default function WriteClient({ project: initialProject, notes }: Props) {
  const [title, setTitle] = useState(initialProject.title ?? '')
  const [content, setContent] = useState(initialProject.writing_content ?? '')
  const [kernidee, setKernidee] = useState(initialProject.kernidee ?? '')
  const [panelOpen, setPanelOpen] = useState(false)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle')
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

  async function toggleUsed(note: Input) {
    const next = !note.used
    setNotesState((prev) => prev.map((n) => n.id === note.id ? { ...n, used: next } : n))
    await fetch(`/api/inputs/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ used: next }),
    })
  }

  const lastSaved = useRef({
    title: initialProject.title ?? '',
    content: initialProject.writing_content ?? '',
    kernidee: initialProject.kernidee ?? '',
  })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async () => {
    if (
      title === lastSaved.current.title &&
      content === lastSaved.current.content &&
      kernidee === lastSaved.current.kernidee
    ) return

    const snapshot = { title, content, kernidee }
    try {
      await fetch(`/api/projects/${initialProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: snapshot.title.trim() || null,
          writing_content: snapshot.content,
          kernidee: snapshot.kernidee.trim() || null,
        }),
      })
      lastSaved.current = { ...snapshot }
    } catch (e) {
      console.error('Autosave failed:', e)
    }
  }, [title, content, kernidee, initialProject.id])

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [title, content, kernidee, save])

  useEffect(() => {
    const handler = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      save()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [save])

  async function handleManualSave() {
    if (savingState === 'saving') return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSavingState('saving')
    try {
      // Force-save by clearing the snapshot cache so save() fires even if
      // the autosave already wrote the same value.
      lastSaved.current = { title: '__force', content: '__force', kernidee: '__force' }
      await save()
      setSavingState('saved')
      setTimeout(() => setSavingState('idle'), 2000)
    } catch (e) {
      console.error('Manual save failed:', e)
      setSavingState('idle')
    }
  }

  const sortedNotes = [...notesState].filter((n) => n.role === 'user' && n.is_note !== false).sort(sortByOutline)
  const backHref = initialProject.parent_project_id
    ? `/projects/${initialProject.parent_project_id}`
    : `/projects/${initialProject.id}`

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ minHeight: '100dvh' }}>
      <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3">
        <Link
          href={backHref}
          className="p-1.5 -ml-1.5 rounded-lg text-garden-muted/50 hover:text-garden-muted hover:bg-garden-bg transition-colors flex items-center gap-1.5"
          title="Zurück"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-xs hidden md:inline">Zurück</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 md:px-12 lg:px-16 py-6 md:py-12 lg:py-16">
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

      {/* Edge tab — desktop */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 items-center gap-1 bg-garden-bg border border-r-0 border-garden-border rounded-l-xl py-4 px-2 text-garden-muted/60 hover:text-garden-accent hover:bg-white transition-colors"
          title="Kernidee & Notes"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Mobile panel toggle */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="md:hidden fixed right-4 bottom-4 bg-garden-surface border border-garden-border rounded-full p-3 shadow-paper-lg text-garden-muted hover:text-garden-accent transition-colors"
          title="Kernidee & Notes"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </button>
      )}

      {/* Side panel / bottom sheet */}
      {panelOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={() => setPanelOpen(false)}
          />

          <aside className="
            fixed z-50 bg-garden-surface border-garden-border
            md:top-0 md:right-0 md:h-full md:w-80 md:border-l md:shadow-paper-lg
            inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t shadow-paper-lg
            md:rounded-none md:inset-x-auto
            flex flex-col animate-fade-in
          ">
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

            <div className="flex-1 overflow-y-auto">

              {/* Kernidee — always at top, always editable */}
              <div className="px-4 py-4 border-b border-garden-border/60 bg-garden-bg/30">
                <p className="text-[10px] uppercase tracking-widest text-garden-muted-soft font-medium mb-2">
                  Kernidee
                </p>
                <textarea
                  value={kernidee}
                  onChange={(e) => setKernidee(e.target.value)}
                  placeholder="Welcher eine Gedanke trägt diesen Text?"
                  rows={2}
                  className="w-full bg-transparent font-serif text-sm text-garden-text outline-none placeholder:text-garden-muted-soft/60 resize-none leading-relaxed"
                  style={{ fontStyle: kernidee ? 'normal' : 'italic' }}
                />
              </div>

              {/* Notes — outline order */}
              <div className="px-4 py-4">
                <p className="text-[10px] uppercase tracking-widest text-garden-muted-soft font-medium mb-3">
                  Notes ({sortedNotes.length})
                </p>

                {sortedNotes.length === 0 ? (
                  <p className="text-xs text-garden-muted-soft italic">
                    Keine Notes. Im Projekt anlegen.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {sortedNotes.map((note, i) => {
                      const expanded = expandedNote === note.id
                      const isImg = isImageNote(note.content)
                      const isEditing = editingNoteId === note.id
                      const preview = isImg
                        ? (note.image_transcript?.slice(0, 60) ?? 'Screenshot')
                        : note.content.slice(0, 60)
                      return (
                        <li key={note.id}>
                          <div className={`rounded-lg border transition-colors ${
                            note.used
                              ? 'bg-garden-accent-light/40 border-garden-accent/30'
                              : expanded
                                ? 'bg-garden-bg/60 border-garden-accent/30'
                                : 'bg-garden-bg/60 border-garden-border/50 hover:border-garden-accent/30'
                          }`}>
                            <div className="flex items-stretch">
                              <button
                                onClick={() => setExpandedNote(expanded ? null : note.id)}
                                className="flex-1 text-left text-xs px-2.5 py-2 min-w-0"
                              >
                                <div className="flex items-center gap-1.5 text-garden-text">
                                  <span className="text-[9px] tabular-nums text-garden-muted-soft font-medium flex-shrink-0">
                                    {String(i + 1).padStart(2, '0')}
                                  </span>
                                  {note.starred && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-garden-star flex-shrink-0">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                  )}
                                  <span className={`truncate flex-1 ${note.used ? 'text-garden-muted line-through decoration-garden-muted/40' : ''}`}>
                                    {preview}
                                  </span>
                                </div>
                              </button>
                              {/* Used toggle */}
                              <button
                                onClick={() => toggleUsed(note)}
                                title={note.used ? 'Als unverwendet markieren' : 'Als verwendet markieren'}
                                className={`flex-shrink-0 px-2 transition-colors ${
                                  note.used
                                    ? 'text-garden-accent'
                                    : 'text-garden-muted-soft hover:text-garden-accent'
                                }`}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </button>
                            </div>
                          </div>

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
                                  <p className="text-[10px] text-garden-muted-soft mt-1">Cmd+Enter speichern · Esc abbrechen</p>
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
                                    className="text-xs text-garden-muted-soft hover:text-garden-accent italic"
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

            {/* Footer — word count + finish action */}
            <div className="flex-shrink-0 border-t border-garden-hairline px-4 py-3 bg-garden-bg/40">
              {/* Word count */}
              {(() => {
                const trimmed = content.trim()
                const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length
                const chars = content.length
                const minutes = Math.max(1, Math.round(words / 220))
                return (
                  <div className="flex items-center justify-between font-mono text-[10px] text-garden-muted-soft mb-3 pb-3 border-b border-garden-hairline-soft">
                    <span><span className="tabnums text-garden-ink">{words}</span> {words === 1 ? 'Wort' : 'Wörter'}</span>
                    <span><span className="tabnums">{chars}</span> Zeichen</span>
                    {words > 0 && (
                      <span><span className="tabnums">~{minutes}</span> min Lesezeit</span>
                    )}
                  </div>
                )
              })()}

              <button
                onClick={handleManualSave}
                disabled={savingState === 'saving'}
                className={`w-full text-xs transition-colors flex items-center justify-center gap-1.5 py-2 rounded-lg disabled:opacity-40 ${
                  savingState === 'saved'
                    ? 'text-garden-accent bg-garden-accent-soft'
                    : 'text-garden-muted hover:text-garden-ink hover:bg-garden-hairline-soft'
                }`}
              >
                {savingState === 'saving' ? (
                  <>
                    <span className="w-3 h-3 border-2 border-garden-muted border-t-transparent rounded-full animate-spin" />
                    Speichere…
                  </>
                ) : savingState === 'saved' ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Gespeichert
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Speichern
                  </>
                )}
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
