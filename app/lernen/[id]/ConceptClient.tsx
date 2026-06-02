'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useMemo } from 'react'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import type { Concept } from '@/lib/types'

export interface LinkedConcept {
  id: string
  title: string | null
  summary: string | null
  // Why this link exists — written when the connection is made,
  // editable from either side of the pair.
  note?: string | null
}

interface Props {
  initialConcept: Concept
  initialLinked: LinkedConcept[]
  allOthers: LinkedConcept[]
}

// Auto-resizing textarea — grows with content, no scrollbars
function useAutoSize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [ref, value])
}

type SaveState = 'saved' | 'dirty' | 'saving'

export default function ConceptClient({ initialConcept, initialLinked, allOthers }: Props) {
  const [concept, setConcept] = useState<Concept>(initialConcept)
  const [linked, setLinked] = useState<LinkedConcept[]>(initialLinked)
  const [title, setTitle] = useState(concept.title ?? '')
  const [summary, setSummary] = useState(concept.summary ?? '')
  const [ownExample, setOwnExample] = useState(concept.own_example ?? '')
  const [body, setBody] = useState(concept.body ?? '')
  const [source, setSource] = useState(concept.source ?? '')
  const [picking, setPicking] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  // Picker flow: select target first, then write the connection note
  const [pickerStep, setPickerStep] = useState<'select' | 'note'>('select')
  const [pickerTarget, setPickerTarget] = useState<LinkedConcept | null>(null)
  const [pickerNote, setPickerNote] = useState('')
  // Inline-edit state for an existing link's note
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null)
  const [editNoteDraft, setEditNoteDraft] = useState('')

  const summaryRef = useRef<HTMLTextAreaElement>(null)
  const exampleRef = useRef<HTMLTextAreaElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useAutoSize(summaryRef, summary)
  useAutoSize(exampleRef, ownExample)
  useAutoSize(bodyRef, body)
  useAutoSize(sourceRef, source)

  // ── Save mechanism ────────────────────────────────────────────
  // Goal: never lose a keystroke, even when navigating away mid-typing.
  // Three save triggers:
  //   • debounce (800ms after last change) — invisible auto-save
  //   • blur on any field — flush immediately when the user moves on
  //   • Cmd/Ctrl-S or the Speichern button — manual flush
  // Plus an unmount flush using fetch keepalive so navigating away
  // mid-typing doesn't drop the pending change.
  const dirty: boolean =
    title !== (concept.title ?? '') ||
    summary !== (concept.summary ?? '') ||
    ownExample !== (concept.own_example ?? '') ||
    body !== (concept.body ?? '') ||
    source !== (concept.source ?? '')

  const [saveState, setSaveState] = useState<SaveState>('saved')

  // Keep the very latest draft accessible from unmount/keepalive paths
  // without re-binding the cleanup on every keystroke.
  const draftRef = useRef({ title, summary, ownExample, body, source })
  draftRef.current = { title, summary, ownExample, body, source }
  const conceptIdRef = useRef(concept.id)
  conceptIdRef.current = concept.id
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  function currentUpdates() {
    const d = draftRef.current
    return {
      title: d.title.trim() || null,
      summary: d.summary.trim() || null,
      own_example: d.ownExample.trim() || null,
      body: d.body.trim() || null,
      source: d.source.trim() || null,
    }
  }

  const savingRef = useRef(false)
  async function saveNow() {
    if (savingRef.current) return
    if (!dirtyRef.current) return
    savingRef.current = true
    setSaveState('saving')
    const updates = currentUpdates()
    try {
      const res = await fetch(`/api/concepts/${conceptIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const { concept: updated } = await res.json()
        setConcept(updated)
        setSaveState('saved')
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Speichern fehlgeschlagen: ${err.error ?? res.status}`)
        setSaveState('dirty')
      }
    } catch (e) {
      alert(`Netzwerkfehler beim Speichern: ${e instanceof Error ? e.message : 'unbekannt'}`)
      setSaveState('dirty')
    } finally {
      savingRef.current = false
    }
  }

  // Mark dirty on any change (visible feedback)
  useEffect(() => {
    if (dirty) setSaveState((s) => s === 'saving' ? s : 'dirty')
    else setSaveState('saved')
  }, [dirty])

  // Debounced auto-save (typing pause)
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => { saveNow() }, 800)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, summary, ownExample, body, source])

  // Cmd/Ctrl-S manual save
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        saveNow()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Unmount flush — keepalive lets the browser finish the request
  // even after the page is replaced.
  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return
      const updates = currentUpdates()
      try {
        fetch(`/api/concepts/${conceptIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
          keepalive: true,
        })
      } catch { /* best effort */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Warn on tab close if dirty
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  async function deleteConcept() {
    if (!window.confirm('Konzept löschen? Verbindungen werden mit entfernt.')) return
    await fetch(`/api/concepts/${concept.id}`, { method: 'DELETE' })
    router.push('/lernen')
  }

  function closePicker() {
    setPicking(false)
    setPickerStep('select')
    setPickerTarget(null)
    setPickerQuery('')
    setPickerNote('')
  }

  function pickTarget(otherId: string) {
    const other = allOthers.find((c) => c.id === otherId)
    if (!other) return
    if (linked.some((l) => l.id === otherId)) { closePicker(); return }
    setPickerTarget(other)
    setPickerNote('')
    setPickerStep('note')
  }

  async function confirmLink() {
    if (!pickerTarget) return
    const target = pickerTarget
    const noteText = pickerNote.trim() || null
    // Optimistic update — revert if the server rejects.
    setLinked((prev) => [...prev, { ...target, note: noteText }])
    closePicker()
    try {
      const res = await fetch(`/api/concepts/${concept.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ other_id: target.id, note: noteText }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setLinked((prev) => prev.filter((l) => l.id !== target.id))
        alert(
          `Verbindung konnte nicht gespeichert werden: ${err.error ?? res.status}\n\n` +
          `Falls die Fehlermeldung 'note' erwähnt: Migration 014 noch nicht im Supabase SQL Editor laufen lassen?`
        )
      }
    } catch (e) {
      setLinked((prev) => prev.filter((l) => l.id !== target.id))
      alert(`Netzwerkfehler beim Verbinden: ${e instanceof Error ? e.message : 'unbekannt'}`)
    }
  }

  async function removeLink(otherId: string) {
    const previous = linked
    setLinked((prev) => prev.filter((l) => l.id !== otherId))
    try {
      const res = await fetch(`/api/concepts/${concept.id}/links?other_id=${otherId}`, { method: 'DELETE' })
      if (!res.ok) {
        setLinked(previous)
        const err = await res.json().catch(() => ({}))
        alert(`Trennen fehlgeschlagen: ${err.error ?? res.status}`)
      }
    } catch (e) {
      setLinked(previous)
      alert(`Netzwerkfehler: ${e instanceof Error ? e.message : 'unbekannt'}`)
    }
  }

  function startEditNote(linkId: string, current: string | null) {
    setEditingNoteFor(linkId)
    setEditNoteDraft(current ?? '')
  }

  async function saveEditNote() {
    if (!editingNoteFor) return
    const otherId = editingNoteFor
    const next = editNoteDraft.trim() || null
    const previous = linked
    setEditingNoteFor(null)
    setLinked((prev) => prev.map((l) => l.id === otherId ? { ...l, note: next } : l))
    try {
      const res = await fetch(`/api/concepts/${concept.id}/links`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ other_id: otherId, note: next }),
      })
      if (!res.ok) {
        setLinked(previous)
        const err = await res.json().catch(() => ({}))
        alert(`Notiz speichern fehlgeschlagen: ${err.error ?? res.status}`)
      }
    } catch (e) {
      setLinked(previous)
      alert(`Netzwerkfehler: ${e instanceof Error ? e.message : 'unbekannt'}`)
    }
  }

  const linkedIds = useMemo(() => new Set(linked.map((l) => l.id)), [linked])
  const pickerFiltered = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    return allOthers
      .filter((c) => !linkedIds.has(c.id))
      .filter((c) => {
        if (!q) return true
        return (c.title ?? '').toLowerCase().includes(q) || (c.summary ?? '').toLowerCase().includes(q)
      })
  }, [allOthers, linkedIds, pickerQuery])

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="sticky top-0 z-30 bg-garden-bg/92 backdrop-blur-md border-b border-garden-hairline pt-safe">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <Link
            href="/lernen"
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-hairline-soft text-garden-muted hover:text-garden-ink transition-colors"
            title="Zurück zu Konzepten"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="font-mono micro-caps text-garden-accent">Konzept</span>
          <span className="h-px flex-1 bg-garden-hairline" />
          {/* Save status + button */}
          {saveState === 'saving' ? (
            <span className="font-mono micro-caps text-garden-muted-soft flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-garden-accent animate-pulse" />
              speichert…
            </span>
          ) : saveState === 'dirty' ? (
            <button
              onClick={saveNow}
              className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors flex items-center gap-1.5"
              title="Speichern (⌘S)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-garden-accent" />
              Speichern
            </button>
          ) : (
            <span className="font-mono micro-caps text-garden-muted-soft flex items-center gap-1.5" title="Alles gespeichert">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              gespeichert
            </span>
          )}
          <button
            onClick={deleteConcept}
            className="font-mono micro-caps text-garden-muted hover:text-garden-accent transition-colors"
          >
            Löschen
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveNow}
          placeholder="Konzept-Name"
          className="w-full bg-transparent font-display text-garden-ink outline-none border-b border-transparent focus:border-garden-accent/40 placeholder:text-garden-muted-soft/70 transition-colors pb-2"
          style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 500, lineHeight: 1.15 }}
        />

        {/* Sections */}
        <div className="mt-8 space-y-7">
          <Section label="In einem Satz">
            <textarea
              ref={summaryRef}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={saveNow}
              placeholder="Wenn du es jetzt jemandem erklären müsstest…"
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-garden-ink placeholder:text-garden-muted-soft/70 font-display italic leading-relaxed"
              style={{ fontSize: 17 }}
            />
          </Section>

          <Section label="Eigenes Beispiel">
            <textarea
              ref={exampleRef}
              value={ownExample}
              onChange={(e) => setOwnExample(e.target.value)}
              onBlur={saveNow}
              placeholder="Etwas Konkretes — eigenes Erlebnis, eigene Analogie, eigene Erfindung."
              rows={2}
              className="w-full bg-transparent resize-none outline-none text-garden-ink placeholder:text-garden-muted-soft/70 font-serif pretty leading-relaxed"
              style={{ fontSize: 15 }}
            />
          </Section>

          <Section label="Hintergrund">
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={saveNow}
              placeholder="Definition, Modell, Quellenbezug, weiterführende Gedanken…"
              rows={4}
              className="w-full bg-transparent resize-none outline-none text-garden-ink placeholder:text-garden-muted-soft/70 font-serif pretty leading-relaxed"
              style={{ fontSize: 15 }}
            />
          </Section>

          <Section label="Quelle">
            <textarea
              ref={sourceRef}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onBlur={saveNow}
              placeholder="Buchtitel, Artikel, Podcast, Gespräch…"
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-garden-ink placeholder:text-garden-muted-soft/70 font-mono text-[13px] leading-relaxed"
            />
          </Section>
        </div>

        {/* Connections */}
        <div className="mt-10 pt-6 border-t border-garden-hairline">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-accent">Verbunden mit</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <button
              onClick={() => setPicking(true)}
              className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors flex items-center gap-1.5"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Verbinden
            </button>
          </div>

          {linked.length === 0 ? (
            <p className="font-display italic text-garden-muted-soft text-[14px] py-2">
              Noch keine Verbindungen.
            </p>
          ) : (
            <div className="space-y-3">
              {linked.map((l) => {
                const isEditing = editingNoteFor === l.id
                return (
                  <div key={l.id} className="group flex items-start gap-3 py-1">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/lernen/${l.id}`}
                        className="block hover:text-garden-accent transition-colors"
                      >
                        <p className="font-display text-garden-ink truncate" style={{ fontSize: 15, fontWeight: 500 }}>
                          {l.title || 'Unbenanntes Konzept'}
                        </p>
                        {l.summary && (
                          <p className="font-display italic text-garden-muted text-[13px] line-clamp-1">{l.summary}</p>
                        )}
                      </Link>

                      {/* Connection note — italic, soft, click to edit */}
                      {isEditing ? (
                        <textarea
                          value={editNoteDraft}
                          onChange={(e) => setEditNoteDraft(e.target.value)}
                          onBlur={saveEditNote}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.preventDefault(); setEditingNoteFor(null) }
                            else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEditNote() }
                          }}
                          autoFocus
                          rows={2}
                          placeholder="Warum gehören sie zusammen?"
                          className="w-full mt-1.5 bg-transparent border-l-2 border-garden-accent/40 pl-2 py-1 resize-none outline-none text-garden-muted text-[13px] font-display italic leading-relaxed placeholder:text-garden-muted-soft/70"
                        />
                      ) : l.note ? (
                        <button
                          onClick={() => startEditNote(l.id, l.note ?? null)}
                          className="block w-full text-left mt-1.5 border-l-2 border-garden-hairline pl-2 py-0.5 hover:border-garden-accent/40 transition-colors"
                          title="Klick zum Bearbeiten"
                        >
                          <p className="font-display italic text-garden-muted text-[13px] leading-relaxed whitespace-pre-wrap">
                            {l.note}
                          </p>
                        </button>
                      ) : (
                        <button
                          onClick={() => startEditNote(l.id, null)}
                          className="font-mono micro-caps text-garden-muted-soft hover:text-garden-accent transition-colors mt-1.5 opacity-0 group-hover:opacity-100"
                        >
                          + Notiz, warum
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => removeLink(l.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-garden-muted-soft hover:text-garden-accent flex-shrink-0 mt-1"
                      title="Verbindung trennen"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="h-32" />
      </main>

      {/* Link picker modal — two steps: select target, then write note */}
      {picking && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-20 p-4 animate-fade-in" onClick={closePicker}>
          <div
            className="w-full max-w-md bg-garden-surface rounded-2xl border border-garden-hairline shadow-paper-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {pickerStep === 'select' ? (
              <>
                <div className="px-5 py-4 border-b border-garden-hairline">
                  <h3 className="font-display text-garden-ink mb-2" style={{ fontSize: 17, fontWeight: 500 }}>Mit welchem Konzept verbinden?</h3>
                  <input
                    type="text"
                    autoFocus
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Suchen…"
                    className="w-full bg-garden-bg border border-garden-hairline rounded-lg px-3 py-1.5 text-[14px] text-garden-ink outline-none focus:border-garden-accent/40"
                  />
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {pickerFiltered.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <p className="font-display italic text-garden-muted">
                        {allOthers.length === 0 ? 'Noch keine anderen Konzepte.' : 'Keine Treffer.'}
                      </p>
                    </div>
                  ) : (
                    pickerFiltered.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => pickTarget(c.id)}
                        className="w-full text-left px-5 py-2.5 hover:bg-garden-hairline-soft/40 transition-colors"
                      >
                        <p className="font-display text-garden-ink truncate" style={{ fontSize: 15, fontWeight: 500 }}>
                          {c.title || 'Unbenanntes Konzept'}
                        </p>
                        {c.summary && (
                          <p className="font-display italic text-garden-muted text-[13px] line-clamp-1">{c.summary}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
                <div className="px-5 py-3 border-t border-garden-hairline flex justify-end">
                  <button
                    onClick={closePicker}
                    className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </>
            ) : pickerTarget && (
              <>
                <div className="px-5 py-4 border-b border-garden-hairline">
                  <p className="font-mono micro-caps text-garden-muted-soft mb-2">Verbinden mit</p>
                  <p className="font-display text-garden-ink" style={{ fontSize: 17, fontWeight: 500 }}>
                    {pickerTarget.title || 'Unbenanntes Konzept'}
                  </p>
                  {pickerTarget.summary && (
                    <p className="font-display italic text-garden-muted text-[13px] line-clamp-2 mt-1">{pickerTarget.summary}</p>
                  )}
                </div>
                <div className="px-5 py-4">
                  <label className="font-mono micro-caps text-garden-accent block mb-2">Warum gehören sie zusammen?</label>
                  <textarea
                    autoFocus
                    value={pickerNote}
                    onChange={(e) => setPickerNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); confirmLink() }
                      if (e.key === 'Escape') { e.preventDefault(); closePicker() }
                    }}
                    placeholder="Optional. Aber gerade jetzt fällt es dir am leichtesten."
                    rows={3}
                    className="w-full bg-garden-bg border border-garden-hairline rounded-lg px-3 py-2 text-[14px] text-garden-ink outline-none focus:border-garden-accent/40 resize-none font-serif leading-relaxed placeholder:text-garden-muted-soft/70"
                  />
                </div>
                <div className="px-5 py-3 border-t border-garden-hairline flex items-center justify-between">
                  <button
                    onClick={() => { setPickerStep('select'); setPickerTarget(null); setPickerNote('') }}
                    className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                  >
                    ← Zurück
                  </button>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[10px] text-garden-muted-soft hidden sm:inline">⌘↵</span>
                    <button
                      onClick={confirmLink}
                      className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
                    >
                      Verbinden
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Sidebar />
      <NavBar />
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono micro-caps text-garden-accent block mb-1">{label}</label>
      {children}
    </div>
  )
}
