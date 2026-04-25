'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Idea } from '@/lib/types'

interface Props {
  idea: Idea
  index?: number
  inputCount?: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
}

export default function IdeaCard({ idea, index = 0, inputCount = 0 }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const title = idea.title || 'Unbenannte Idee'

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!window.confirm('Idee löschen? Das kann nicht rückgängig gemacht werden.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ideas/${idea.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Löschen fehlgeschlagen: ${data.error ?? res.status}`)
        setLoading(false)
        return
      }
      router.refresh()
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  async function handleMarkDone(e: React.MouseEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const mdRes = await fetch(`/api/export/${idea.id}`)
      if (!mdRes.ok) {
        const data = await mdRes.json().catch(() => ({}))
        alert(`Export fehlgeschlagen: ${data.error ?? mdRes.status}`)
        setLoading(false)
        return
      }
      const { markdown } = await mdRes.json()
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(idea.title ?? 'idea').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
      a.click()
      URL.revokeObjectURL(url)

      const patchRes = await fetch(`/api/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
      })
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}))
        alert(`Status-Update fehlgeschlagen: ${data.error ?? patchRes.status}`)
        setLoading(false)
        return
      }
      router.refresh()
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  return (
    <div className="group relative rounded-2xl bg-garden-surface border border-garden-hairline transition-all animate-fade-in">
      {/* hover stripe */}
      <span className="absolute left-0 top-4 bottom-4 w-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-garden-accent" />

      {/* ⋮ menu */}
      <button
        onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v) }}
        className={`absolute top-3 right-3 z-10 p-1.5 rounded-md transition-colors ${
          menuOpen ? 'text-garden-ink bg-garden-hairline-soft' : 'text-garden-muted-soft hover:text-garden-ink hover:bg-garden-hairline-soft'
        }`}
        title="Optionen"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.6"/>
          <circle cx="12" cy="12" r="1.6"/>
          <circle cx="12" cy="19" r="1.6"/>
        </svg>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={(e) => { e.preventDefault(); setMenuOpen(false) }}
          />
          <div className="absolute top-10 right-2 z-30 bg-garden-surface border border-garden-hairline rounded-xl shadow-paper-lg overflow-hidden min-w-44 animate-fade-in">
            <button
              onClick={handleMarkDone}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-garden-accent-deep hover:bg-garden-accent-soft transition-colors text-left"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Als fertig markieren
            </button>
            <div className="h-px bg-garden-hairline" />
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] text-garden-danger hover:bg-garden-danger-light transition-colors text-left"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/>
                <path d="M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14"/>
              </svg>
              Löschen
            </button>
          </div>
        </>
      )}

      <Link href={`/garden/${idea.id}`} className="block px-5 pt-4 pb-4 pr-10">
        {/* meta row */}
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-mono tabnums micro-caps text-garden-muted-soft">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-mono micro-caps text-garden-muted">
            {formatDate(idea.created_at)}
          </span>
        </div>

        <h3
          className="font-display display-tight balance pretty mb-5 text-garden-ink"
          style={{ fontSize: 21, lineHeight: 1.2, fontWeight: 400 }}
        >
          {title}
        </h3>

        {/* footer */}
        <div className="flex items-center justify-between pt-3 border-t border-garden-hairline">
          <span className="font-mono micro-caps text-garden-muted-soft">
            <span className="tabnums">{inputCount}</span> Notes
          </span>
          <span className="font-mono micro-caps flex items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100 text-garden-accent">
            Öffnen
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>
        </div>
      </Link>
    </div>
  )
}
