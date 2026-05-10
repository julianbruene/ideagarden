'use client'

import { useState, useRef, useMemo } from 'react'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import type { CraftSnippet } from '@/lib/types'

interface Props {
  initialSnippets: CraftSnippet[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// Highlight query matches within a snippet
function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const q = query.toLowerCase()
  const lower = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let i = 0
  let start = lower.indexOf(q, i)
  while (start >= 0) {
    if (start > i) parts.push(text.slice(i, start))
    parts.push(
      <mark key={`m-${start}`} className="bg-amber-100 text-garden-text rounded px-0.5">
        {text.slice(start, start + query.length)}
      </mark>
    )
    i = start + query.length
    start = lower.indexOf(q, i)
  }
  if (i < text.length) parts.push(text.slice(i))
  return parts
}

export default function HandwerkClient({ initialSnippets }: Props) {
  const [snippets, setSnippets] = useState<CraftSnippet[]>(initialSnippets)
  const [text, setText] = useState('')
  const [mood, setMood] = useState('')
  const [kniff, setKniff] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editMood, setEditMood] = useState('')
  const [editKniff, setEditKniff] = useState('')
  const [query, setQuery] = useState('')
  const [activeMood, setActiveMood] = useState<string | null>(null)
  const [activeKniff, setActiveKniff] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Collect existing tag values for filter chips
  const moods = useMemo(() => {
    const set = new Set<string>()
    for (const s of snippets) if (s.mood) set.add(s.mood)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'))
  }, [snippets])

  const kniffe = useMemo(() => {
    const set = new Set<string>()
    for (const s of snippets) if (s.kniff) set.add(s.kniff)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'))
  }, [snippets])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return snippets.filter((s) => {
      if (activeMood && s.mood !== activeMood) return false
      if (activeKniff && s.kniff !== activeKniff) return false
      if (!q) return true
      return (
        s.content.toLowerCase().includes(q) ||
        (s.mood ?? '').toLowerCase().includes(q) ||
        (s.kniff ?? '').toLowerCase().includes(q)
      )
    })
  }, [snippets, query, activeMood, activeKniff])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmed,
          mood: mood.trim() || null,
          kniff: kniff.trim() || null,
        }),
      })
      if (!res.ok) return
      const { snippet } = await res.json()
      setSnippets((prev) => [snippet, ...prev])
      setText('')
      setMood('')
      setKniff('')
      textareaRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function handleDelete(id: string) {
    setSnippets((prev) => prev.filter((s) => s.id !== id))
    await fetch(`/api/craft/${id}`, { method: 'DELETE' })
  }

  function startEdit(s: CraftSnippet) {
    setEditingId(s.id)
    setEditText(s.content)
    setEditMood(s.mood ?? '')
    setEditKniff(s.kniff ?? '')
  }

  async function saveEdit() {
    if (!editingId) return
    const trimmed = editText.trim()
    if (!trimmed) {
      setEditingId(null)
      return
    }
    const res = await fetch(`/api/craft/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: trimmed,
        mood: editMood.trim() || null,
        kniff: editKniff.trim() || null,
      }),
    })
    if (res.ok) {
      const { snippet } = await res.json()
      setSnippets((prev) => prev.map((s) => s.id === snippet.id ? snippet : s))
    }
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
    setEditMood('')
    setEditKniff('')
  }

  const filterActive = !!(activeMood || activeKniff || query)

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      {/* Header — editorial */}
      <header className="px-6 md:px-12 page-header-pt pb-6 md:pb-8 border-b border-garden-hairline">
        <div className="max-w-2xl md:max-w-3xl mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-muted-soft">05 · Handwerk</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <span className="font-mono micro-caps text-garden-muted-soft">
              {snippets.length === 1 ? '1 Schnipsel' : `${snippets.length} Schnipsel`}
            </span>
          </div>
          <h1
            className="font-display display-tight balance text-garden-ink"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
          >
            Schöne <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>Sätze</em>, die bleiben.
          </h1>
          <p className="font-display italic text-garden-muted mt-3 text-[15px] leading-relaxed">
            Metaphern, Wendungen, Rhythmen — nichts wandert weiter, alles inspiriert.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 pt-6 md:pt-10">
        {/* Input — flat, mirrors Dump */}
        <form
          onSubmit={handleSubmit}
          className="relative pb-5"
          style={{ borderBottom: '1px solid #E8E3D8' }}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ein Satz, der dich nicht losließ…"
            className="w-full bg-transparent resize-none outline-none text-garden-ink placeholder:text-garden-muted/70 font-display pretty"
            rows={2}
            disabled={submitting}
            style={{ fontSize: 18, lineHeight: 1.5, fontWeight: 400 }}
          />

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-mono micro-caps text-garden-muted-soft flex-shrink-0">Stimmung</span>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="ruhig, scharf…"
                className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[12px] text-garden-muted placeholder:text-garden-muted-soft/70"
                maxLength={32}
                disabled={submitting}
              />
            </div>
            <span className="text-garden-muted-soft font-mono text-[10px]">·</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-mono micro-caps text-garden-muted-soft flex-shrink-0">Kniff</span>
              <input
                type="text"
                value={kniff}
                onChange={(e) => setKniff(e.target.value)}
                placeholder="Anfang, Dialog…"
                className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[12px] text-garden-muted placeholder:text-garden-muted-soft/70"
                maxLength={32}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-3">
            <span className="font-mono text-[10px] text-garden-muted-soft hidden sm:inline">
              ⌘↵ speichern
            </span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              title="Speichern"
              className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center bg-garden-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-garden-accent-deep transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </form>

        {/* Search + filter chips */}
        {snippets.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="relative">
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
                className="absolute left-0 top-1/2 -translate-y-1/2 text-garden-muted-soft pointer-events-none"
              >
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen…"
                className="w-full bg-transparent pl-6 pr-2 py-1 text-[14px] text-garden-ink placeholder:text-garden-muted-soft outline-none"
              />
            </div>

            {moods.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono micro-caps text-garden-muted-soft w-16 flex-shrink-0">Stimmung</span>
                {moods.map((m) => {
                  const isActive = activeMood === m
                  return (
                    <button
                      key={`mood-${m}`}
                      onClick={() => setActiveMood(isActive ? null : m)}
                      className={`font-mono micro-caps px-2 py-0.5 rounded-full border transition-colors ${
                        isActive
                          ? 'bg-garden-accent-soft text-garden-accent-deep border-garden-accent/30'
                          : 'border-garden-hairline text-garden-muted hover:text-garden-ink hover:border-garden-muted-soft'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            )}

            {kniffe.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono micro-caps text-garden-muted-soft w-16 flex-shrink-0">Kniff</span>
                {kniffe.map((k) => {
                  const isActive = activeKniff === k
                  return (
                    <button
                      key={`kniff-${k}`}
                      onClick={() => setActiveKniff(isActive ? null : k)}
                      className={`font-mono micro-caps px-2 py-0.5 rounded-full border transition-colors ${
                        isActive
                          ? 'bg-garden-accent-soft text-garden-accent-deep border-garden-accent/30'
                          : 'border-garden-hairline text-garden-muted hover:text-garden-ink hover:border-garden-muted-soft'
                      }`}
                    >
                      {k}
                    </button>
                  )
                })}
              </div>
            )}

            {filterActive && (
              <button
                onClick={() => { setActiveMood(null); setActiveKniff(null); setQuery('') }}
                className="font-mono micro-caps text-garden-muted-soft hover:text-garden-ink transition-colors"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {snippets.length === 0 && (
          <div className="text-center py-16">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">Noch leer.</p>
            <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
              Was hat dich beim Lesen gestoppt?
            </p>
          </div>
        )}

        {/* Result count */}
        {snippets.length > 0 && filterActive && (
          <p className="font-mono micro-caps text-garden-muted-soft mt-4">
            {filtered.length === 0
              ? 'Keine Treffer'
              : filtered.length === 1
                ? '1 Treffer'
                : `${filtered.length} Treffer`}
          </p>
        )}

        {/* Snippet list */}
        <div className="mt-6 pb-24 md:pb-12">
          {filtered.map((s, i) => {
            const isEditing = editingId === s.id
            return (
              <div
                key={s.id}
                className="group relative py-5 animate-fade-in"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #E8E3D8' }}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                      rows={3}
                      className="w-full bg-transparent resize-none outline-none text-garden-ink font-display pretty"
                      style={{ fontSize: 17, lineHeight: 1.55, fontWeight: 400 }}
                    />
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-mono micro-caps text-garden-muted-soft flex-shrink-0">Stimmung</span>
                        <input
                          type="text"
                          value={editMood}
                          onChange={(e) => setEditMood(e.target.value)}
                          className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[12px] text-garden-muted"
                          maxLength={32}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-mono micro-caps text-garden-muted-soft flex-shrink-0">Kniff</span>
                        <input
                          type="text"
                          value={editKniff}
                          onChange={(e) => setEditKniff(e.target.value)}
                          className="flex-1 min-w-0 bg-transparent outline-none font-mono text-[12px] text-garden-muted"
                          maxLength={32}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={cancelEdit}
                        className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={saveEdit}
                        className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
                      >
                        Speichern
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className="font-display pretty text-garden-ink whitespace-pre-wrap"
                      style={{ fontSize: 17, lineHeight: 1.55, fontWeight: 400 }}
                    >
                      {highlight(s.content, query)}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {s.mood && (
                        <button
                          onClick={() => setActiveMood(activeMood === s.mood ? null : s.mood)}
                          className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
                          title="Nach Stimmung filtern"
                        >
                          {s.mood}
                        </button>
                      )}
                      {s.kniff && (
                        <button
                          onClick={() => setActiveKniff(activeKniff === s.kniff ? null : s.kniff)}
                          className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                          title="Nach Kniff filtern"
                        >
                          · {s.kniff}
                        </button>
                      )}
                      <span className="font-mono micro-caps text-garden-muted-soft">
                        {formatDate(s.created_at)}
                      </span>
                      <span className="flex-1" />
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3">
                        <button
                          onClick={() => startEdit(s)}
                          className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="font-mono micro-caps text-garden-muted hover:text-garden-accent transition-colors"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <Sidebar />
      <NavBar />
    </div>
  )
}
