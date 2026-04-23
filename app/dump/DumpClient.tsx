'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import NodeCard from '@/components/NodeCard'
import DumpInput from '@/components/DumpInput'
import IdeaSexModal from '@/components/IdeaSexModal'
import type { IdeaNode } from '@/lib/types'

interface Props {
  initialNodes: IdeaNode[]
}

export default function DumpClient({ initialNodes }: Props) {
  const [nodes, setNodes] = useState<IdeaNode[]>(initialNodes)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [showIdeaSex, setShowIdeaSex] = useState(false)
  const [ideaSexPair, setIdeaSexPair] = useState<[string, string] | undefined>()
  // Heart: up to 2 nodes pre-selected for Idea Sex
  const [hearted, setHearted] = useState<Set<string>>(new Set())
  const router = useRouter()

  function handleNodeCreated(node: IdeaNode) {
    setNodes((prev) => [node, ...prev])
  }

  async function handleDelete(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setHearted((prev) => { const next = new Set(prev); next.delete(id); return next })
    await fetch(`/api/nodes/${id}`, { method: 'DELETE' })
  }

  async function handlePromote(id: string) {
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_node_ids: [id] }),
      })
      const data = await res.json()

      if (!res.ok || !data.idea?.id) {
        console.error('[promote] failed:', data)
        alert(`In Garden fehlgeschlagen: ${data?.error ?? res.status}`)
        return
      }

      setNodes((prev) => prev.filter((n) => n.id !== id))
      setHearted((prev) => { const next = new Set(prev); next.delete(id); return next })
      router.push(`/garden/${data.idea.id}`)
    } catch (err) {
      console.error('[promote] network error:', err)
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function toggleHeart(id: string) {
    setHearted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 2) {
          // remove the oldest heart
          const [first] = next
          next.delete(first)
        }
        next.add(id)
      }
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 2) {
          const [first] = next
          next.delete(first)
        }
        next.add(id)
      }
      return next
    })
  }

  function openIdeaSex(pair?: [string, string]) {
    setIdeaSexPair(pair)
    setShowIdeaSex(true)
    setSelectionMode(false)
    setSelected(new Set())
  }

  function handleIdeaSexClick() {
    const heartedArr = Array.from(hearted)
    if (heartedArr.length === 2) {
      openIdeaSex([heartedArr[0], heartedArr[1]])
    } else if (heartedArr.length === 1) {
      // one heart: preselect that node, let IdeaSex pick the second randomly
      openIdeaSex(undefined)
    } else {
      openIdeaSex()
    }
  }

  function startSelectionMode() {
    setSelectionMode(true)
    setSelected(new Set())
  }

  function cancelSelectionMode() {
    setSelectionMode(false)
    setSelected(new Set())
  }

  const selectedArr = Array.from(selected)
  const heartedArr = Array.from(hearted)
  const canIdeaSex = nodes.length >= 2

  return (
    <div className="min-h-screen bg-garden-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-garden-bg/90 backdrop-blur-sm border-b border-garden-border/50 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-garden-text">Dump</h1>
          <div className="flex items-center gap-2">
            {!selectionMode ? (
              <>
                {canIdeaSex && (
                  <button
                    onClick={handleIdeaSexClick}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors border ${
                      heartedArr.length > 0
                        ? 'bg-rose-50 text-rose-500 border-rose-200 hover:bg-rose-100'
                        : 'bg-garden-seed-light text-garden-seed border-garden-seed/30 hover:bg-garden-seed/10'
                    }`}
                    title={heartedArr.length > 0 ? `${heartedArr.length} Note(n) vorgemerkt` : 'Zwei Notes kollidieren lassen'}
                  >
                    {heartedArr.length > 0 ? `Idea Sex ♥ ${heartedArr.length}` : 'Idea Sex'}
                  </button>
                )}
                {nodes.length >= 2 && (
                  <button
                    onClick={startSelectionMode}
                    className="text-xs px-3 py-1.5 rounded-xl bg-garden-bg border border-garden-border text-garden-muted hover:text-garden-text transition-colors"
                  >
                    Select
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="text-xs text-garden-muted">{selectedArr.length}/2 selected</span>
                <button
                  onClick={() => {
                    if (selectedArr.length === 2) {
                      openIdeaSex([selectedArr[0], selectedArr[1]])
                    }
                  }}
                  disabled={selectedArr.length !== 2}
                  className="text-xs px-3 py-1.5 rounded-xl bg-garden-seed-light text-garden-seed border border-garden-seed/30 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Collide
                </button>
                <button
                  onClick={cancelSelectionMode}
                  className="text-xs text-garden-muted hover:text-garden-text transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-3">
        {/* Input */}
        {!selectionMode && (
          <DumpInput onNodeCreated={handleNodeCreated} />
        )}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">&#x1F331;</div>
            <p className="text-sm text-garden-muted">Nothing here yet.</p>
            <p className="text-xs text-garden-muted/60 mt-1">
              Dump a thought above — no titles, no categories.
            </p>
          </div>
        )}

        {/* Heart hint — shown when at least 1 hearted */}
        {!selectionMode && heartedArr.length > 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 text-xs text-rose-500 flex items-center justify-between">
            <span>
              {heartedArr.length === 1
                ? '1 Note für Idea Sex vorgemerkt'
                : '2 Notes für Idea Sex vorgemerkt'}
            </span>
            <button
              onClick={() => setHearted(new Set())}
              className="text-rose-400 hover:text-rose-600 transition-colors ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Selection mode banner */}
        {selectionMode && (
          <div className="bg-garden-seed-light border border-garden-seed/20 rounded-xl px-4 py-3 text-xs text-garden-seed">
            Tap two nodes to collide them.
          </div>
        )}

        {/* Node list */}
        <div className="space-y-3">
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              selected={selected.has(node.id)}
              selectionMode={selectionMode}
              hearted={hearted.has(node.id)}
              onSelect={() => toggleSelect(node.id)}
              onDelete={() => handleDelete(node.id)}
              onPromote={() => handlePromote(node.id)}
              onHeart={() => toggleHeart(node.id)}
              onNodeUpdated={(updated) => setNodes((prev) => prev.map((n) => n.id === updated.id ? updated : n))}
            />
          ))}
        </div>
      </main>

      <NavBar />

      {showIdeaSex && (
        <IdeaSexModal
          nodes={nodes}
          preselected={ideaSexPair}
          onClose={() => { setShowIdeaSex(false); setHearted(new Set()) }}
          onNodeCreated={handleNodeCreated}
        />
      )}
    </div>
  )
}
