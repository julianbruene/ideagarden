'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
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
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      {/* Header — editorial */}
      <header className="px-6 md:px-12 page-header-pt pb-6 md:pb-8 border-b border-garden-hairline">
        <div className="max-w-2xl md:max-w-3xl mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-muted-soft">01 · Dump</span>
            <span className="h-px flex-1 bg-garden-hairline" />
            {!selectionMode ? (
              <>
                {canIdeaSex && (
                  <button
                    onClick={handleIdeaSexClick}
                    className={`font-mono micro-caps transition-colors ${
                      heartedArr.length > 0 ? 'text-garden-accent' : 'text-garden-muted hover:text-garden-ink'
                    }`}
                    title={heartedArr.length > 0 ? `${heartedArr.length} Note(n) vorgemerkt` : 'Zwei Notes kollidieren lassen'}
                  >
                    {heartedArr.length > 0 ? `Idea Sex · ${heartedArr.length}` : 'Idea Sex'}
                  </button>
                )}
                {nodes.length >= 2 && (
                  <button
                    onClick={startSelectionMode}
                    className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                  >
                    Auswählen
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="font-mono micro-caps text-garden-muted">{selectedArr.length}/2</span>
                <button
                  onClick={() => {
                    if (selectedArr.length === 2) {
                      openIdeaSex([selectedArr[0], selectedArr[1]])
                    }
                  }}
                  disabled={selectedArr.length !== 2}
                  className="font-mono micro-caps text-garden-accent disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Kollidieren
                </button>
                <button
                  onClick={cancelSelectionMode}
                  className="font-mono micro-caps text-garden-muted hover:text-garden-ink transition-colors"
                >
                  Abbrechen
                </button>
              </>
            )}
          </div>
          <h1
            className="font-display display-tight balance text-garden-ink"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
          >
            Was geht dir <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>gerade</em> durch den Kopf?
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 pt-6 md:pt-10">
        {/* Input — flat */}
        {!selectionMode && (
          <DumpInput onNodeCreated={handleNodeCreated} />
        )}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="text-center py-16">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">Noch leer.</p>
            <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
              Schreib oben — keine Titel, keine Kategorien.
            </p>
          </div>
        )}

        {/* Heart hint — coral pill */}
        {!selectionMode && heartedArr.length > 0 && (
          <div className="mt-6 bg-garden-accent-soft border border-garden-accent/20 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="font-mono micro-caps text-garden-accent-deep">
              {heartedArr.length === 1
                ? '1 Note vorgemerkt'
                : '2 Notes vorgemerkt'}
            </span>
            <button
              onClick={() => setHearted(new Set())}
              className="text-garden-accent/60 hover:text-garden-accent-deep transition-colors ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Selection mode banner */}
        {selectionMode && (
          <div className="mt-6 bg-garden-accent-soft border border-garden-accent/20 rounded-lg px-4 py-2.5 font-mono micro-caps text-garden-accent-deep">
            Zwei Notes antippen — sie kollidieren.
          </div>
        )}

        {/* Node list */}
        <div className="mt-6 space-y-4 pb-24 md:pb-12">
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

      <Sidebar />
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
