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
  const router = useRouter()

  function handleNodeCreated(node: IdeaNode) {
    setNodes((prev) => [node, ...prev])
  }

  async function handleDelete(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    await fetch(`/api/nodes/${id}`, { method: 'DELETE' })
  }

  async function handlePromote(id: string) {
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_node_ids: [id] }),
    })
    const { idea } = await res.json()

    // Mark node as promoted locally
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, promoted: true } : n))
    router.push(`/garden/${idea.id}`)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 2) {
          // replace oldest selection
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

  function startSelectionMode() {
    setSelectionMode(true)
    setSelected(new Set())
  }

  function cancelSelectionMode() {
    setSelectionMode(false)
    setSelected(new Set())
  }

  const selectedArr = Array.from(selected)
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
                    onClick={() => openIdeaSex()}
                    className="text-xs px-3 py-1.5 rounded-xl bg-garden-seed-light text-garden-seed border border-garden-seed/30 font-medium hover:bg-garden-seed/10 transition-colors"
                    title="Pick two nodes and see what happens"
                  >
                    Idea Sex
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
              onSelect={() => toggleSelect(node.id)}
              onDelete={() => handleDelete(node.id)}
              onPromote={() => handlePromote(node.id)}
            />
          ))}
        </div>
      </main>

      <NavBar />

      {showIdeaSex && (
        <IdeaSexModal
          nodes={nodes}
          preselected={ideaSexPair}
          onClose={() => setShowIdeaSex(false)}
        />
      )}
    </div>
  )
}
