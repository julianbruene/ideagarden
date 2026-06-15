'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import type { Project } from '@/lib/types'

interface Props {
  initialNovels: Project[]
  chapterCount: Record<string, number>
  chapterDone: Record<string, number>
}

export default function FictionClient({ initialNovels, chapterCount, chapterDone }: Props) {
  const [novels] = useState<Project[]>(initialNovels)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  async function createNovel() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'book', genre: 'fiction' }),
      })
      const data = await res.json()
      if (!res.ok || !data.project?.id) {
        alert(`Roman anlegen fehlgeschlagen: ${data?.error ?? res.status}`)
        return
      }
      router.push(`/fiction/${data.project.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="px-6 md:px-12 page-header-pt pb-6 md:pb-8 border-b border-garden-hairline">
        <div className="max-w-2xl md:max-w-3xl mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-muted-soft">F01 · Romane</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            <button
              onClick={createNovel}
              disabled={creating}
              className="font-mono micro-caps text-garden-accent flex items-center gap-1.5 hover:text-garden-accent-deep transition-colors disabled:opacity-40"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {creating ? '…' : 'Neuer Roman'}
            </button>
          </div>
          <h1
            className="font-display display-tight balance text-garden-ink"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
          >
            Was willst du <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>erzählen?</em>
          </h1>
          <p className="font-display italic text-garden-muted mt-3 text-[15px] leading-relaxed">
            Figuren, Szenen, Kapitel — ein Roman wächst Stück für Stück.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 pt-6 md:pt-10">
        {novels.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">Noch kein Roman.</p>
            <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
              Eine Prämisse, ein paar Figuren — der Rest kommt beim Schreiben.
            </p>
            <button
              onClick={createNovel}
              disabled={creating}
              className="mt-6 font-mono micro-caps text-garden-accent hover:text-garden-accent-deep transition-colors"
            >
              {creating ? '…' : 'Ersten Roman anlegen →'}
            </button>
          </div>
        ) : (
          <div className="pb-24 md:pb-12">
            {novels.map((n, i) => {
              const total = chapterCount[n.id] ?? 0
              const done = chapterDone[n.id] ?? 0
              return (
                <Link
                  key={n.id}
                  href={`/fiction/${n.id}`}
                  className="group relative block py-5 animate-fade-in transition-colors hover:bg-garden-hairline-soft/40 -mx-3 px-3 rounded"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid #E8E3D8' }}
                >
                  <div className="flex items-baseline gap-3 mb-1">
                    <h3
                      className="flex-1 font-display display-tight balance text-garden-ink"
                      style={{ fontSize: 19, lineHeight: 1.25, fontWeight: 500 }}
                    >
                      {n.title || 'Unbenannter Roman'}
                    </h3>
                    <span className="font-mono micro-caps text-garden-muted-soft flex-shrink-0 tabnums">
                      {total === 0 ? 'keine Kapitel' : `${done}/${total} Kapitel`}
                    </span>
                  </div>
                  {n.kernidee && (
                    <p className="font-display italic text-[14px] text-garden-muted leading-relaxed line-clamp-2">
                      {n.kernidee}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <Sidebar />
      <NavBar />
    </div>
  )
}
