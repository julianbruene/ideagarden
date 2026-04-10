'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { IdeaNode } from '@/lib/types'

interface Props {
  nodes: IdeaNode[]
  preselected?: [string, string]
  onClose: () => void
}

export default function IdeaSexModal({ nodes, preselected, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(preselected ? [...preselected] : [])
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Randomise two if none preselected
  useEffect(() => {
    if (!preselected && nodes.length >= 2) {
      const shuffled = [...nodes].sort(() => Math.random() - 0.5)
      setSelected([shuffled[0].id, shuffled[1].id])
    }
  }, []) // eslint-disable-line

  function toggleSelect(id: string) {
    if (result) return // locked after generation
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  function preview(n: IdeaNode) {
    if (n.content_type === 'image') return '📷 Image'
    return (n.content ?? '').slice(0, 80) + ((n.content?.length ?? 0) > 80 ? '…' : '')
  }

  async function generate() {
    if (selected.length !== 2) return
    setLoading(true)
    setResult(null)

    const nodeA = nodes.find((n) => n.id === selected[0])
    const nodeB = nodes.find((n) => n.id === selected[1])
    if (!nodeA || !nodeB) { setLoading(false); return }

    const res = await fetch('/api/idea-sex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeA: { content: nodeA.content, content_type: nodeA.content_type },
        nodeB: { content: nodeB.content, content_type: nodeB.content_type },
      }),
    })
    const data = await res.json()
    setResult(data.result)
    setLoading(false)
  }

  async function saveAsNode() {
    if (!result || saving) return
    setSaving(true)
    await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: result, content_type: 'text' }),
    })
    setSaving(false)
    router.refresh()
    onClose()
  }

  async function promoteToGarden() {
    if (!result || saving) return
    setSaving(true)
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_node_ids: selected,
        initial_content: result,
      }),
    })
    const data = await res.json()
    setSaving(false)
    router.push(`/garden/${data.idea.id}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-garden-surface rounded-2xl border border-garden-border shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold text-garden-text">Idea Sex</h2>
            <p className="text-xs text-garden-muted mt-0.5">
              Two nodes collide. What emerges?
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-garden-bg text-garden-muted transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Node picker */}
        {!result && (
          <div className="px-5 pb-4">
            <p className="text-xs text-garden-muted mb-3">
              {selected.length === 0 && 'Pick two nodes'}
              {selected.length === 1 && 'Pick one more'}
              {selected.length === 2 && 'Ready — or swap one out'}
            </p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {nodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => toggleSelect(n.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    selected.includes(n.id)
                      ? 'border-garden-accent bg-garden-accent-light text-garden-text'
                      : 'border-garden-border bg-white text-garden-text hover:border-garden-muted/40'
                  }`}
                >
                  <span className="line-clamp-2 leading-snug">{preview(n)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="px-5 pb-4">
            <div className="bg-garden-seed-light border border-garden-seed/30 rounded-xl p-4">
              <p className="text-sm text-garden-text leading-relaxed">{result}</p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          {!result ? (
            <button
              onClick={generate}
              disabled={selected.length !== 2 || loading}
              className="w-full py-3 bg-garden-accent text-white rounded-xl text-sm font-medium hover:bg-garden-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Colliding...
                </span>
              ) : (
                'Collide'
              )}
            </button>
          ) : (
            <>
              <button
                onClick={promoteToGarden}
                disabled={saving}
                className="w-full py-3 bg-garden-accent text-white rounded-xl text-sm font-medium hover:bg-garden-accent-dark transition-colors disabled:opacity-50"
              >
                Add to Garden
              </button>
              <button
                onClick={saveAsNode}
                disabled={saving}
                className="w-full py-3 bg-garden-bg border border-garden-border text-garden-text rounded-xl text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                Save as raw node
              </button>
              <button
                onClick={() => setResult(null)}
                className="w-full py-3 text-garden-muted text-sm hover:text-garden-text transition-colors"
              >
                Try different pair
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
