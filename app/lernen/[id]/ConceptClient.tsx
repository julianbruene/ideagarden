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

// Debounced auto-save helper
function useDebouncedSave(value: string, original: string | null, save: (next: string | null) => Promise<void>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (value === (original ?? '')) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      save(value.trim() || null)
    }, 800)
    return () => { if (timer.current) clearTimeout(timer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
}

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

  const summaryRef = useRef<HTMLTextAreaElement>(null)
  const exampleRef = useRef<HTMLTextAreaElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useAutoSize(summaryRef, summary)
  useAutoSize(exampleRef, ownExample)
  useAutoSize(bodyRef, body)
  useAutoSize(sourceRef, source)

  async function patch(updates: Partial<Concept>) {
    await fetch(`/api/concepts/${concept.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setConcept((c) => ({ ...c, ...updates } as Concept))
  }

  useDebouncedSave(title, concept.title, (v) => patch({ title: v }))
  useDebouncedSave(summary, concept.summary, (v) => patch({ summary: v }))
  useDebouncedSave(ownExample, concept.own_example, (v) => patch({ own_example: v }))
  useDebouncedSave(body, concept.body, (v) => patch({ body: v }))
  useDebouncedSave(source, concept.source, (v) => patch({ source: v }))

  async function deleteConcept() {
    if (!window.confirm('Konzept löschen? Verbindungen werden mit entfernt.')) return
    await fetch(`/api/concepts/${concept.id}`, { method: 'DELETE' })
    router.push('/lernen')
  }

  async function addLink(otherId: string) {
    const other = allOthers.find((c) => c.id === otherId)
    if (!other) return
    if (linked.some((l) => l.id === otherId)) { setPicking(false); return }
    setLinked((prev) => [...prev, other])
    setPicking(false)
    setPickerQuery('')
    await fetch(`/api/concepts/${concept.id}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ other_id: otherId }),
    })
  }

  async function removeLink(otherId: string) {
    setLinked((prev) => prev.filter((l) => l.id !== otherId))
    await fetch(`/api/concepts/${concept.id}/links?other_id=${otherId}`, { method: 'DELETE' })
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
            <div className="space-y-1">
              {linked.map((l) => (
                <div key={l.id} className="group flex items-start gap-3 py-2">
                  <Link
                    href={`/lernen/${l.id}`}
                    className="flex-1 min-w-0 hover:text-garden-accent transition-colors"
                  >
                    <p className="font-display text-garden-ink truncate" style={{ fontSize: 15, fontWeight: 500 }}>
                      {l.title || 'Unbenanntes Konzept'}
                    </p>
                    {l.summary && (
                      <p className="font-display italic text-garden-muted text-[13px] line-clamp-1">{l.summary}</p>
                    )}
                  </Link>
                  <button
                    onClick={() => removeLink(l.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-garden-muted-soft hover:text-garden-accent"
                    title="Verbindung trennen"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-32" />
      </main>

      {/* Link picker modal */}
      {picking && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-20 p-4 animate-fade-in" onClick={() => setPicking(false)}>
          <div
            className="w-full max-w-md bg-garden-surface rounded-2xl border border-garden-hairline shadow-paper-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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
                    onClick={() => addLink(c.id)}
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
                onClick={() => setPicking(false)}
                className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
              >
                Abbrechen
              </button>
            </div>
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
