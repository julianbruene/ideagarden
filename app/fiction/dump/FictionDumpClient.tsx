'use client'

import { useState } from 'react'
import NavBar from '@/components/NavBar'
import Sidebar from '@/components/Sidebar'
import NodeCard from '@/components/NodeCard'
import DumpInput from '@/components/DumpInput'
import SendToProjectModal from '@/components/SendToProjectModal'
import type { IdeaNode } from '@/lib/types'

interface Props {
  initialNodes: IdeaNode[]
}

// Fiction's own Dump — raw material for stories: overheard dialogue,
// a scene fragment, a character seed, an image. Each note can be sent
// into a fiction text (Kurzgeschichte or Roman). No Idea Sex, no
// Garden promotion — that machinery belongs to non-fiction.
export default function FictionDumpClient({ initialNodes }: Props) {
  const [nodes, setNodes] = useState<IdeaNode[]>(initialNodes)
  const [sendToProjectFor, setSendToProjectFor] = useState<string | null>(null)

  function handleNodeCreated(node: IdeaNode) {
    setNodes((prev) => [node, ...prev])
  }

  async function handleDelete(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    await fetch(`/api/nodes/${id}`, { method: 'DELETE' })
  }

  async function handleSendToProject(nodeId: string, projectId: string) {
    setSendToProjectFor(null)
    const snapshot = nodes
    setNodes((prev) => prev.filter((n) => n.id !== nodeId))
    try {
      const res = await fetch(`/api/nodes/${nodeId}/to-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setNodes(snapshot)
        alert(`In Text schicken fehlgeschlagen: ${data?.error ?? res.status}`)
      }
    } catch (err) {
      setNodes(snapshot)
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="min-h-screen bg-garden-bg pb-24 md:pb-0 md:pl-60">
      <header className="px-6 md:px-12 page-header-pt pb-6 md:pb-8 border-b border-garden-hairline">
        <div className="max-w-2xl md:max-w-3xl mx-auto md:mx-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="font-mono micro-caps text-garden-muted-soft">F00 · Dump</span>
            <span className="h-px flex-1 bg-garden-hairline" />
          </div>
          <h1
            className="font-display display-tight balance text-garden-ink"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1.05, fontWeight: 400 }}
          >
            Was ist dir <em className="text-garden-accent" style={{ fontWeight: 500, fontStyle: 'italic' }}>begegnet?</em>
          </h1>
          <p className="font-display italic text-garden-muted mt-3 text-[15px] leading-relaxed">
            Ein Satzfetzen, ein Bild, eine Figur, ein Was-wäre-wenn — roher Stoff für später.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 md:px-12 pt-6 md:pt-10">
        <DumpInput onNodeCreated={handleNodeCreated} genre="fiction" />

        {nodes.length === 0 && (
          <div className="text-center py-16">
            <p className="font-display text-3xl text-garden-muted-soft mb-3" style={{ fontWeight: 400 }}>—</p>
            <p className="font-display italic text-garden-muted">Noch leer.</p>
            <p className="font-mono text-[11px] text-garden-muted-soft mt-2">
              Sammle Stoff — er wandert später in deine Texte.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-4 pb-24 md:pb-12">
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              variant="fiction"
              onDelete={() => handleDelete(node.id)}
              onSendToProject={() => setSendToProjectFor(node.id)}
              onNodeUpdated={(updated) => setNodes((prev) => prev.map((n) => n.id === updated.id ? updated : n))}
            />
          ))}
        </div>
      </main>

      <Sidebar />
      <NavBar />

      {sendToProjectFor && (
        <SendToProjectModal
          genre="fiction"
          onPick={(projectId) => handleSendToProject(sendToProjectFor, projectId)}
          onClose={() => setSendToProjectFor(null)}
        />
      )}
    </div>
  )
}
