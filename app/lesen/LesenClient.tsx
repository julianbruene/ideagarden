'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import type { FeedPost } from '@/lib/types'
import RewritePanel from './RewritePanel'

interface SourceLite { id: string; title: string | null; author: string | null }

interface Props {
  initialPosts: FeedPost[]
  sources: SourceLite[]
}

const TYPE_LABEL: Record<FeedPost['post_type'], string> = {
  reel: 'Reel',
  carousel: 'Karussell',
  post: 'Post',
}

const SOURCE_LABEL: Record<FeedPost['main_source'], string> = {
  transcript: 'Transkript',
  slides: 'Slides',
  onscreen: 'Text im Video',
  caption: 'Caption',
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Text the user has selected inside this post, if any.
function selectionIn(postId: string): string {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null
  if (!sel || sel.isCollapsed) return ''
  const el = document.getElementById(`post-${postId}`)
  if (!el || !sel.anchorNode || !el.contains(sel.anchorNode)) return ''
  return sel.toString().trim()
}

export default function LesenClient({ initialPosts, sources: initialSources }: Props) {
  const router = useRouter()
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts)
  const [sources, setSources] = useState<SourceLite[]>(initialSources)
  const [view, setView] = useState<'unread' | 'all' | 'drafts'>('unread')
  const [rewritingId, setRewritingId] = useState<string | null>(null)
  const [activeAuthor, setActiveAuthor] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [flash, setFlash] = useState<{ id: string; msg: string } | null>(null)
  const [sourcePickerFor, setSourcePickerFor] = useState<{ id: string; text: string } | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const authors = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of posts) map.set(p.author_username, p.author_name || p.author_username)
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'de'))
  }, [posts])

  const visible = useMemo(() => posts.filter((p) => {
    if (view === 'drafts') {
      if (p.draft_status === 'none' && !(p.draft ?? '').trim()) return false
    } else {
      if (p.status === 'archived') return false
      if (view === 'unread' && p.status === 'read') return false
    }
    if (activeAuthor && p.author_username !== activeAuthor) return false
    return true
  }), [posts, view, activeAuthor])

  const newCount = posts.filter((p) => p.status === 'new').length
  const draftCount = posts.filter((p) => p.draft_status !== 'none' || (p.draft ?? '').trim()).length
  const rewriting = rewritingId ? posts.find((p) => p.id === rewritingId) ?? null : null

  function patchLocal(id: string, patch: Partial<FeedPost>) {
    setPosts((ps) => ps.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function showFlash(id: string, msg: string) {
    setFlash({ id, msg })
    setTimeout(() => setFlash((f) => (f?.id === id ? null : f)), 2200)
  }

  async function setStatus(p: FeedPost, status: FeedPost['status']) {
    const prev = posts
    setPosts((ps) => ps.map((x) => (x.id === p.id ? { ...x, status } : x)))
    const res = await fetch(`/api/feed/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      setPosts(prev)
      alert('Status ändern fehlgeschlagen.')
    }
  }

  async function toHandwerk(p: FeedPost) {
    const sel = selectionIn(p.id)
    if (!sel) {
      showFlash(p.id, 'Erst einen Satz markieren')
      return
    }
    const res = await fetch('/api/craft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `${sel}\n— ${p.author_name || '@' + p.author_username}` }),
    })
    if (res.ok) showFlash(p.id, 'In Handwerk gespeichert')
    else alert('In Handwerk speichern fehlgeschlagen.')
  }

  function openSourcePicker(p: FeedPost) {
    const sel = selectionIn(p.id)
    setSourcePickerFor({ id: p.id, text: sel || p.main_text })
  }

  async function addToSource(p: FeedPost, sourceId: string | 'new') {
    if (!sourcePickerFor) return
    let sid = sourceId
    if (sid === 'new') {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'other',
          title: p.author_name || p.author_username,
          author: '@' + p.author_username,
          status: 'reading',
        }),
      })
      if (!res.ok) { alert('Quelle anlegen fehlgeschlagen.'); return }
      const { source } = await res.json()
      setSources((s) => [{ id: source.id, title: source.title, author: source.author }, ...s])
      sid = source.id
    }
    const res = await fetch(`/api/sources/${sid}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: sourcePickerFor.text,
        location: [TYPE_LABEL[p.post_type], formatDate(p.published_at), p.url].filter(Boolean).join(' · '),
      }),
    })
    setSourcePickerFor(null)
    if (res.ok) showFlash(p.id, 'Als Lesenotiz gespeichert')
    else alert('Lesenotiz speichern fehlgeschlagen.')
  }

  async function handleImport(file: File) {
    setImporting(true)
    setImportMsg(null)
    try {
      const json = JSON.parse(await file.text())
      const res = await fetch('/api/feed/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportMsg(`Import fehlgeschlagen: ${data.error ?? res.status}`)
        return
      }
      const skipped = data.skippedExisting + data.skippedDuplicate + data.skippedEmpty
      setImportMsg(
        `${data.imported} neu importiert` +
        (skipped ? ` · ${skipped} übersprungen (schon da, doppelt oder ohne Text)` : '')
      )
      router.refresh()
      const list = await fetch('/api/feed').then((r) => r.ok ? r.json() : null)
      if (list?.posts) setPosts(list.posts)
    } catch {
      setImportMsg('Datei konnte nicht gelesen werden (kein gültiges JSON).')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const keepSelection = (e: React.MouseEvent) => e.preventDefault()

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="px-6 md:px-12 page-header-pt pb-6 md:pb-8 border-b border-garden-hairline">
        <div className="max-w-2xl md:max-w-3xl mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-muted-soft">01 · Lesen</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <span className="font-mono micro-caps text-garden-muted-soft">
              {newCount === 1 ? '1 ungelesen' : `${newCount} ungelesen`}
            </span>
          </div>
          <h1
            className="font-display display-tight balance text-garden-ink"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
          >
            Nur der <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>Text</em>.
          </h1>
          <p className="font-display italic text-garden-muted mt-3 text-[15px] leading-relaxed">
            Was deine Creator sagen — ohne Feed, ohne Zahlen, ohne Scrollen.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 pt-6 md:pt-8">
        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap pb-4" style={{ borderBottom: '1px solid #E8E3D8' }}>
          {([
            ['unread', 'Ungelesen'],
            ['all', 'Alle'],
            ['drafts', `Entwürfe${draftCount ? ` · ${draftCount}` : ''}`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`font-mono micro-caps px-2 py-0.5 rounded-full border transition-colors ${
                view === key
                  ? 'bg-garden-accent-soft text-garden-accent-deep border-garden-accent/30'
                  : 'border-garden-hairline text-garden-muted hover:text-garden-ink'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="flex-1" />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors disabled:opacity-40"
          >
            {importing ? 'importiert…' : '+ Import (JSON)'}
          </button>
        </div>
        {importMsg && (
          <p className="font-mono text-[11px] text-garden-muted mt-3">{importMsg}</p>
        )}

        {authors.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {authors.map(([username, name]) => {
              const isActive = activeAuthor === username
              return (
                <button
                  key={username}
                  onClick={() => setActiveAuthor(isActive ? null : username)}
                  className={`font-mono micro-caps px-2 py-0.5 rounded-full border transition-colors ${
                    isActive
                      ? 'bg-garden-accent-soft text-garden-accent-deep border-garden-accent/30'
                      : 'border-garden-hairline text-garden-muted hover:text-garden-ink hover:border-garden-muted-soft'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        )}

        {visible.length === 0 && (
          <div className="text-center py-16">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">
              {view === 'drafts' ? 'Noch keine Entwürfe.' : posts.length === 0 ? 'Noch nichts zu lesen.' : 'Alles gelesen.'}
            </p>
            <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
              {view === 'drafts'
                ? 'Bei einem Post auf „Umschreiben“ klicken.'
                : 'Sag Claude „hol mir neue Posts“.'}
            </p>
          </div>
        )}

        <div className="mt-4 pb-24 md:pb-12">
          {visible.map((p, i) => {
            const isOpen = expanded.has(p.id)
            const long = p.main_text.length > 900
            const showCaption = p.main_source !== 'caption' && (p.caption ?? '').trim().length > 0
            return (
              <article
                key={p.id}
                id={`post-${p.id}`}
                className={`group py-7 animate-fade-in ${p.status === 'read' ? 'opacity-60' : ''}`}
                style={{ borderTop: i === 0 ? 'none' : '1px solid #E8E3D8' }}
              >
                <div className="flex items-baseline gap-3 mb-3 flex-wrap">
                  <span className="font-display italic text-garden-ink text-[16px]" style={{ fontWeight: 500 }}>
                    {p.author_name || '@' + p.author_username}
                  </span>
                  <span className="font-mono micro-caps text-garden-muted-soft">
                    {TYPE_LABEL[p.post_type]} · {formatDate(p.published_at)}
                  </span>
                  {p.status === 'new' && <span className="w-1.5 h-1.5 rounded-full bg-garden-accent self-center" />}
                  {p.draft_status !== 'none' && (
                    <span className="font-mono micro-caps text-garden-accent">
                      {p.draft_status === 'sent' ? 'in Eden' : p.draft_status === 'ready' ? 'Entwurf bereit' : 'Entwurf'}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <p
                    className={`font-serif pretty text-garden-ink whitespace-pre-wrap ${
                      long && !isOpen ? 'max-h-[19rem] overflow-hidden' : ''
                    }`}
                    style={{ fontSize: 17, lineHeight: 1.65 }}
                  >
                    {p.main_text}
                  </p>
                  {long && !isOpen && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-garden-bg to-transparent pointer-events-none" />
                  )}
                </div>
                {long && (
                  <button
                    onClick={() => toggleExpanded(p.id)}
                    className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep mt-2"
                  >
                    {isOpen ? 'weniger' : 'weiterlesen'}
                  </button>
                )}

                {p.truncated && (isOpen || !long) && (
                  <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
                    gekürzt —{' '}
                    {p.url
                      ? <a href={p.url} target="_blank" rel="noreferrer" className="underline hover:text-garden-ink">Original ansehen ↗</a>
                      : 'Original ist länger'}
                  </p>
                )}

                {showCaption && (
                  <p className="font-serif text-garden-muted whitespace-pre-wrap mt-4 pl-3 border-l-2 border-garden-hairline text-[14px] leading-relaxed">
                    {p.caption}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-4 flex-wrap">
                  <span className="font-mono micro-caps text-garden-muted-soft">aus {SOURCE_LABEL[p.main_source]}</span>
                  <span className="flex-1" />
                  {flash?.id === p.id && (
                    <span className="font-mono micro-caps text-garden-accent">{flash.msg}</span>
                  )}
                  <button onClick={() => setRewritingId(p.id)}
                    className="font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
                    title="In deinen Worten umschreiben">
                    Umschreiben
                  </button>
                  <button onMouseDown={keepSelection} onClick={() => toHandwerk(p)}
                    className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                    title="Markierten Satz in Handwerk speichern">
                    → Handwerk
                  </button>
                  <button onMouseDown={keepSelection} onClick={() => openSourcePicker(p)}
                    className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                    title="Als Lesenotiz an eine Quelle hängen">
                    → Quelle
                  </button>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer"
                      className="font-mono micro-caps text-garden-muted-soft hover:text-garden-ink transition-colors">
                      Original ↗
                    </a>
                  )}
                  <button
                    onClick={() => setStatus(p, p.status === 'read' ? 'new' : 'read')}
                    className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                  >
                    {p.status === 'read' ? 'Ungelesen' : 'Gelesen'}
                  </button>
                  <button
                    onClick={() => setStatus(p, 'archived')}
                    className="font-mono micro-caps text-garden-muted hover:text-garden-accent transition-colors"
                  >
                    Archiv
                  </button>
                </div>

                {sourcePickerFor?.id === p.id && (
                  <div className="mt-3 p-3 rounded-md border border-garden-hairline bg-garden-surface space-y-1">
                    <p className="font-mono micro-caps text-garden-muted-soft mb-1">
                      {sourcePickerFor.text === p.main_text ? 'Ganzer Text' : 'Markierung'} als Lesenotiz an …
                    </p>
                    <button
                      onClick={() => addToSource(p, 'new')}
                      className="block w-full text-left font-display text-[15px] text-garden-accent hover:text-garden-accent-deep"
                    >
                      + Neue Quelle „{p.author_name || p.author_username}“
                    </button>
                    {sources.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addToSource(p, s.id)}
                        className="block w-full text-left font-display text-[15px] text-garden-ink hover:text-garden-accent"
                      >
                        {s.title || 'Ohne Titel'}
                        {s.author && <span className="text-garden-muted"> · {s.author}</span>}
                      </button>
                    ))}
                    <button
                      onClick={() => setSourcePickerFor(null)}
                      className="font-mono micro-caps text-garden-muted hover:text-garden-ink pt-1"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </main>

      {rewriting && (
        <RewritePanel
          key={rewriting.id}
          post={rewriting}
          onClose={() => setRewritingId(null)}
          onChange={(patch) => patchLocal(rewriting.id, patch)}
        />
      )}

      <Sidebar />
      <NavBar />
    </div>
  )
}
