'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavBar from '@/components/NavBar'
import type { Idea, Input } from '@/lib/types'

interface Props {
  idea: Idea
  initialInputs: Input[]
}

type SaveState = 'saved' | 'dirty' | 'saving'

// Optional platform targets for the character counter.
const PLATFORMS: { value: string; label: string; limit: number | null }[] = [
  { value: '', label: 'Kein Ziel', limit: null },
  { value: 'x', label: 'X', limit: 280 },
  { value: 'threads', label: 'Threads', limit: 500 },
  { value: 'bluesky', label: 'Bluesky', limit: 300 },
  { value: 'instagram', label: 'Instagram', limit: 2200 },
  { value: 'linkedin', label: 'LinkedIn', limit: 3000 },
]

function isImageNote(content: string) { return content.startsWith('[img]') }
function imageUrl(content: string) { return content.slice(5) }

export default function IdeaDetailClient({ idea: initialIdea, initialInputs }: Props) {
  const [idea, setIdea] = useState<Idea>(initialIdea)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(idea.title ?? '')
  const [post, setPost] = useState(idea.synthesis ?? '')
  const [platform, setPlatform] = useState(idea.platform ?? '')
  const [completing, setCompleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(true)
  const titleRef = useRef<HTMLInputElement>(null)
  const postRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Source material = the note inputs seeded from the Dump / Idea Sex.
  const sources = initialInputs.filter((i) => i.is_note)

  // ── Post autosave (debounce + blur + Cmd-S + unmount flush) ────
  const dirty = post !== (idea.synthesis ?? '')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const postRefVal = useRef(post)
  postRefVal.current = post
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  const savingRef = useRef(false)

  async function saveNow() {
    if (savingRef.current || !dirtyRef.current) return
    savingRef.current = true
    setSaveState('saving')
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synthesis: postRefVal.current.trim() || null }),
      })
      if (res.ok) { const { idea: u } = await res.json(); setIdea(u); setSaveState('saved') }
      else setSaveState('dirty')
    } catch { setSaveState('dirty') }
    finally { savingRef.current = false }
  }

  useEffect(() => { setSaveState(dirty ? 'dirty' : 'saved') }, [dirty])
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => saveNow(), 800)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post])
  useEffect(() => {
    return () => {
      if (!dirtyRef.current) return
      try {
        fetch(`/api/ideas/${idea.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ synthesis: postRefVal.current.trim() || null }), keepalive: true,
        })
      } catch { /* best effort */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveNow() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveTitle() {
    setEditingTitle(false)
    const trimmed = titleDraft.trim() || null
    if (trimmed === idea.title) return
    setIdea((i) => ({ ...i, title: trimmed }))
    await fetch(`/api/ideas/${idea.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    })
  }

  async function changePlatform(value: string) {
    setPlatform(value)
    setIdea((i) => ({ ...i, platform: value || null }))
    await fetch(`/api/ideas/${idea.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: value || null }),
    })
  }

  async function copyPost() {
    try {
      await navigator.clipboard.writeText(post)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('Kopieren nicht möglich — bitte manuell markieren.')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Post löschen? Das kann nicht rückgängig gemacht werden.')) return
    const res = await fetch(`/api/ideas/${idea.id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(`Löschen fehlgeschlagen: ${d.error ?? res.status}`); return }
    router.push('/garden')
  }

  async function handleMarkDone() {
    if (completing) return
    if (!window.confirm('Post als fertig markieren? Wandert ins Kompost-Archiv.')) return
    setCompleting(true)
    try {
      // Flush any pending edit first so the archived post is current.
      if (dirtyRef.current) await saveNow()
      const res = await fetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(`Fehlgeschlagen: ${d.error ?? res.status}`); setCompleting(false); return }
      router.push('/done')
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
      setCompleting(false)
    }
  }

  const chars = post.length
  const limit = PLATFORMS.find((p) => p.value === platform)?.limit ?? null
  const over = limit !== null && chars > limit

  return (
    <div className="flex flex-col bg-garden-bg" style={{ height: '100dvh', paddingBottom: '56px' }}>
      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-garden-surface border-b border-garden-hairline px-4 md:px-6 py-3 flex items-center gap-3">
        <Link href="/garden" className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-hairline-soft text-garden-muted hover:text-garden-ink transition-colors" title="Zurück zum Garden">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="font-mono micro-caps text-garden-accent mb-0.5">Post</div>
          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleDraft(idea.title ?? ''); setEditingTitle(false) } }}
              className="w-full bg-transparent font-display text-base md:text-xl text-garden-ink outline-none border-b border-garden-accent"
              placeholder="Titel (nur für dich)…"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.select(), 10) }}
              className="font-display text-base md:text-xl text-garden-ink hover:text-garden-accent transition-colors truncate block max-w-full text-left"
              style={{ fontWeight: 500 }}
            >
              {idea.title || 'Unbenannter Post'}
            </button>
          )}
        </div>

        {/* Save state */}
        {saveState === 'saving' ? (
          <span className="hidden sm:flex font-mono micro-caps text-garden-muted-soft items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-garden-accent animate-pulse" />speichert…</span>
        ) : saveState === 'dirty' ? (
          <button onClick={saveNow} className="hidden sm:flex font-mono micro-caps text-garden-accent items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-garden-accent" />Speichern</button>
        ) : (
          <span className="hidden sm:flex font-mono micro-caps text-garden-muted-soft items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>gespeichert
          </span>
        )}

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="p-1.5 rounded-lg text-garden-muted/70 hover:text-garden-ink hover:bg-garden-hairline-soft transition-colors" title="Weitere Aktionen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1 z-30 bg-garden-surface border border-garden-hairline rounded-xl shadow-paper-lg overflow-hidden min-w-52 animate-fade-in">
                <button onClick={() => { setMenuOpen(false); handleMarkDone() }} disabled={completing} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-accent hover:bg-garden-accent-soft transition-colors text-left disabled:opacity-40">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Fertig — ins Kompost
                </button>
                <div className="h-px bg-garden-hairline" />
                <button onClick={() => { setMenuOpen(false); handleDelete() }} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-muted hover:bg-garden-hairline-soft hover:text-garden-accent transition-colors text-left">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                  Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden max-w-6xl w-full mx-auto">

        {/* Left: source material (read-only) */}
        <div className="flex-shrink-0 md:flex-shrink md:w-2/5 md:border-r border-garden-hairline flex flex-col min-h-0 bg-garden-surface/40">
          <button
            onClick={() => setSourceOpen((v) => !v)}
            className="flex-shrink-0 px-4 md:px-6 py-2.5 border-b border-garden-hairline flex items-center gap-2 group md:cursor-default"
          >
            <span className="font-mono micro-caps text-garden-muted">Quelle{sources.length === 1 ? '' : 'n'}</span>
            <span className="font-mono micro-caps text-garden-muted-soft">{sources.length}</span>
            <span className="flex-1" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
              className={`md:hidden text-garden-muted-soft transition-transform ${sourceOpen ? '' : '-rotate-90'}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div className={`flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 ${sourceOpen ? 'block' : 'hidden md:block'}`}
               style={{ maxHeight: sourceOpen ? undefined : 0 }}>
            {sources.length === 0 ? (
              <p className="font-display italic text-garden-muted-soft text-[14px]">Kein Quellmaterial.</p>
            ) : (
              sources.map((s) => (
                <div key={s.id} className="rounded-xl border border-garden-hairline bg-garden-surface p-3">
                  {isImageNote(s.content) ? (
                    <Image src={imageUrl(s.content)} alt="Quelle" width={400} height={300} unoptimized className="w-full object-cover max-h-48 rounded-lg" />
                  ) : (
                    <p className="font-serif text-garden-ink leading-relaxed whitespace-pre-wrap break-words" style={{ fontSize: 14 }}>{s.content}</p>
                  )}
                  {s.image_transcript && (
                    <p className="mt-1.5 text-[12px] text-garden-muted leading-relaxed whitespace-pre-wrap">{s.image_transcript}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: post editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 px-4 md:px-6 py-2.5 border-b border-garden-hairline flex items-center gap-3">
            <span className="font-mono micro-caps text-garden-accent">Dein Post</span>
            <span className="flex-1" />
            <select
              value={platform}
              onChange={(e) => changePlatform(e.target.value)}
              className="font-mono micro-caps bg-garden-surface border border-garden-hairline rounded-full px-2.5 py-1 text-garden-ink outline-none focus:border-garden-accent/40"
            >
              {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <span className={`font-mono micro-caps tabnums ${over ? 'text-garden-accent' : 'text-garden-muted-soft'}`}>
              {chars}{limit !== null ? ` / ${limit}` : ''}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <textarea
              ref={postRef}
              value={post}
              onChange={(e) => setPost(e.target.value)}
              onBlur={saveNow}
              placeholder="Schreib es in deinen eigenen Worten…"
              className="w-full h-full min-h-[300px] bg-transparent resize-none outline-none px-4 md:px-6 py-4 text-garden-ink placeholder:text-garden-muted-soft/60 leading-relaxed"
              style={{ fontSize: 16, lineHeight: 1.6 }}
            />
          </div>

          <div className="flex-shrink-0 px-4 md:px-6 py-3 border-t border-garden-hairline flex items-center gap-3">
            <button
              onClick={copyPost}
              disabled={!post.trim()}
              className="font-mono micro-caps flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-garden-hairline text-garden-ink hover:border-garden-accent/40 hover:bg-garden-accent-soft/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {copied ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Kopiert</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Kopieren</>
              )}
            </button>
            <span className="flex-1" />
            <button
              onClick={handleMarkDone}
              disabled={completing}
              className="font-mono micro-caps flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-garden-accent text-white hover:bg-garden-accent-deep transition-colors disabled:opacity-40"
            >
              Fertig
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </div>
        </div>
      </div>

      <NavBar />
    </div>
  )
}
