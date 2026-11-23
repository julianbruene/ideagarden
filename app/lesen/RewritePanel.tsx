'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FeedPost, DraftPlatform, DraftStatus } from '@/lib/types'

interface Props {
  post: FeedPost
  onClose: () => void
  onChange: (patch: Partial<FeedPost>) => void
}

const PLATFORMS: { key: DraftPlatform; label: string; max: number | null }[] = [
  { key: 'threads',  label: 'Threads',       max: 500 },
  { key: 'substack', label: 'Substack Note', max: null },
  { key: 'both',     label: 'Beide',         max: 500 },
]

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

export default function RewritePanel({ post, onClose, onChange }: Props) {
  const [draft, setDraft] = useState(post.draft ?? '')
  const [platform, setPlatform] = useState<DraftPlatform>(post.draft_platform)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [showOriginal, setShowOriginal] = useState(true)

  const draftRef = useRef(draft)
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const max = PLATFORMS.find((p) => p.key === platform)?.max ?? null
  const over = max !== null && draft.length > max
  const sent = post.draft_status === 'sent'

  const patch = useCallback(async (body: Record<string, unknown>, keepalive = false) => {
    const res = await fetch(`/api/feed/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive,
    })
    return res.ok
  }, [post.id])

  const save = useCallback(async () => {
    if (!dirtyRef.current) return
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const text = draftRef.current
    setSaveState('saving')
    const nextStatus: DraftStatus | undefined =
      post.draft_status === 'none' && text.trim() ? 'writing' : undefined
    const ok = await patch({ draft: text, ...(nextStatus ? { draft_status: nextStatus } : {}) })
    if (ok) {
      if (draftRef.current === text) dirtyRef.current = false
      setSaveState(dirtyRef.current ? 'dirty' : 'saved')
      onChange({ draft: text, ...(nextStatus ? { draft_status: nextStatus } : {}) })
    } else {
      setSaveState('error')
    }
  }, [patch, post.draft_status, onChange])

  function handleDraftChange(value: string) {
    setDraft(value)
    draftRef.current = value
    dirtyRef.current = true
    setSaveState('dirty')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(save, 800)
  }

  // Flush on unmount (closing the panel / navigating away)
  useEffect(() => {
    const id = post.id
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (dirtyRef.current) {
        fetch(`/api/feed/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: draftRef.current }),
          keepalive: true,
        })
      }
    }
  }, [post.id])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) e.preventDefault()
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('keydown', onKey)
    }
  }, [save, onClose])

  useEffect(() => { textareaRef.current?.focus() }, [])

  async function changePlatform(p: DraftPlatform) {
    const prev = platform
    setPlatform(p)
    if (await patch({ draft_platform: p })) onChange({ draft_platform: p })
    else { setPlatform(prev); alert('Plattform speichern fehlgeschlagen.') }
  }

  async function toggleReady() {
    await save()
    const next: DraftStatus = post.draft_status === 'ready' ? 'writing' : 'ready'
    if (next === 'ready' && !draftRef.current.trim()) return
    if (await patch({ draft_status: next })) onChange({ draft_status: next })
    else alert('Status speichern fehlgeschlagen.')
  }

  const pill =
    saveState === 'saving' ? 'speichert…'
    : saveState === 'dirty' ? 'Speichern'
    : saveState === 'error' ? 'Fehler — nochmal'
    : 'gespeichert'

  return (
    <>
      {/* Split screen: covers the content area, sidebar stays visible */}
      <div className="fixed inset-0 md:left-60 bg-garden-bg z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 md:px-10 py-4 border-b border-garden-hairline">
          <span className="font-display italic text-garden-ink text-[16px]" style={{ fontWeight: 500 }}>
            {post.author_name || '@' + post.author_username}
          </span>
          <span className="font-mono micro-caps text-garden-muted-soft hidden sm:inline">→ in deinen Worten</span>
          <span className="flex-1" />
          <button
            onClick={save}
            disabled={saveState === 'saved' || saveState === 'saving'}
            className={`font-mono micro-caps px-2 py-0.5 rounded-full border transition-colors ${
              saveState === 'error'
                ? 'border-garden-accent text-garden-accent'
                : saveState === 'dirty'
                  ? 'border-garden-accent/40 text-garden-accent hover:bg-garden-accent-soft'
                  : 'border-garden-hairline text-garden-muted-soft'
            }`}
          >
            {pill}
          </button>
          <button onClick={onClose} className="text-garden-muted hover:text-garden-ink" title="Schließen (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* LEFT — Original */}
        <div className="flex-shrink-0 md:w-1/2 md:min-h-0 flex flex-col border-b md:border-b-0 md:border-r border-garden-hairline bg-garden-surface/40">
          <button
            onClick={() => setShowOriginal((v) => !v)}
            className="font-mono micro-caps text-garden-muted-soft hover:text-garden-ink text-left px-6 md:px-10 pt-5 pb-3 md:pointer-events-none"
          >
            <span className="md:hidden">{showOriginal ? '▾ ' : '▸ '}</span>Original
          </button>
          <div className={`${showOriginal ? 'block' : 'hidden'} md:block overflow-y-auto max-h-[35vh] md:max-h-none md:flex-1 px-6 md:px-10 pb-6`}>
            <p
              className="font-serif text-garden-ink whitespace-pre-wrap pretty"
              style={{ fontSize: 17, lineHeight: 1.65 }}
            >
              {post.main_text}
            </p>
            {post.main_source !== 'caption' && (post.caption ?? '').trim() && (
              <p className="font-serif text-garden-muted whitespace-pre-wrap mt-5 pl-3 border-l-2 border-garden-hairline text-[14px] leading-relaxed">
                {post.caption}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — Writing surface */}
        <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col px-6 md:px-10 pt-5">
          <span className="font-mono micro-caps text-garden-muted-soft mb-3">Deine Worte</span>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onBlur={save}
            placeholder="Was nimmst du daraus mit — und wie würdest du es sagen?"
            className="flex-1 w-full bg-transparent resize-none outline-none text-garden-ink placeholder:text-garden-muted/70 font-serif pretty"
            style={{ fontSize: 17, lineHeight: 1.6 }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 md:px-10 py-4 border-t border-garden-hairline space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => changePlatform(p.key)}
                className={`font-mono micro-caps px-2 py-0.5 rounded-full border transition-colors ${
                  platform === p.key
                    ? 'bg-garden-accent-soft text-garden-accent-deep border-garden-accent/30'
                    : 'border-garden-hairline text-garden-muted hover:text-garden-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
            <span className="flex-1" />
            <span className={`font-mono text-[11px] ${over ? 'text-garden-accent' : 'text-garden-muted-soft'}`}>
              {draft.length}{max !== null ? ` / ${max}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-garden-muted-soft flex-1">
              {sent
                ? 'Als Entwurf in Eden — dort planen.'
                : post.draft_status === 'ready'
                  ? 'Bereit — sag Claude „schick meine Entwürfe an Eden“.'
                  : over ? 'Zu lang für Threads.' : '⌘S speichert · Esc schließt'}
            </span>
            {!sent && (
              <button
                onClick={toggleReady}
                disabled={!draft.trim() || (post.draft_status !== 'ready' && over)}
                className={`font-mono micro-caps px-3 py-1 rounded-full transition-colors disabled:opacity-30 ${
                  post.draft_status === 'ready'
                    ? 'border border-garden-hairline text-garden-muted hover:text-garden-ink'
                    : 'bg-garden-accent text-white hover:bg-garden-accent-deep'
                }`}
              >
                {post.draft_status === 'ready' ? 'Doch nicht bereit' : 'Bereit für Eden'}
              </button>
            )}
          </div>
        </div>
        </div>
        </div>
      </div>
    </>
  )
}
