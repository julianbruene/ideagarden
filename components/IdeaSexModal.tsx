'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { IdeaNode } from '@/lib/types'

interface Props {
  nodes: IdeaNode[]
  onClose: () => void
  onNodeCreated?: (node: IdeaNode) => void
  preselected?: [string, string]
}

type Step = 'pick' | 'collide'

function pickTwo(nodes: IdeaNode[], exclude?: [string, string]): [IdeaNode, IdeaNode] | null {
  const pool = exclude ? nodes.filter((n) => !exclude.includes(n.id)) : nodes
  if (pool.length < 2) return null
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1]]
}

function NodeFull({ node, onSwap }: { node: IdeaNode; onSwap: () => void }) {
  return (
    <div className="bg-garden-bg rounded-xl border border-garden-border overflow-hidden">
      <div className="max-h-40 overflow-y-auto px-4 py-3">
        {node.content_type === 'image' && node.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={node.image_url} alt="Note" className="w-full rounded-lg object-cover max-h-32" />
        ) : (
          <p className="text-sm text-garden-text leading-relaxed whitespace-pre-wrap break-words">
            {node.content ?? '—'}
          </p>
        )}
      </div>
      <div className="border-t border-garden-border/60 flex justify-end px-3 py-1.5">
        <button
          onClick={onSwap}
          className="text-[11px] text-garden-muted hover:text-garden-accent transition-colors flex items-center gap-1"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
          austauschen
        </button>
      </div>
    </div>
  )
}

export default function IdeaSexModal({ nodes, onClose, onNodeCreated, preselected }: Props) {
  const [step, setStep] = useState<Step>('pick')
  const [nodeA, setNodeA] = useState<IdeaNode | null>(null)
  const [nodeB, setNodeB] = useState<IdeaNode | null>(null)
  const [question, setQuestion] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [userText, setUserText] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (preselected) {
      const a = nodes.find((n) => n.id === preselected[0])
      const b = nodes.find((n) => n.id === preselected[1])
      if (a && b) { setNodeA(a); setNodeB(b); return }
    }
    shuffle()
  }, []) // eslint-disable-line

  function shuffle() {
    const pair = pickTwo(nodes)
    if (pair) { setNodeA(pair[0]); setNodeB(pair[1]) }
  }

  function swapA() {
    if (!nodeB) return
    const pair = pickTwo(nodes, [nodeB.id, nodeB.id])
    if (pair) setNodeA(pair[0] === nodeB ? pair[1] : pair[0])
  }

  function swapB() {
    if (!nodeA) return
    const pair = pickTwo(nodes, [nodeA.id, nodeA.id])
    if (pair) setNodeB(pair[0] === nodeA ? pair[1] : pair[0])
  }

  async function handleCollide() {
    if (!nodeA || !nodeB || loading) return
    setLoading(true)

    const res = await fetch('/api/idea-sex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodeA: { content: nodeA.content, content_type: nodeA.content_type },
        nodeB: { content: nodeB.content, content_type: nodeB.content_type },
      }),
    })
    const data = await res.json()
    setQuestion(data.question ?? '')
    setStep('collide')
    setLoading(false)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  async function saveAsNote() {
    if (!userText.trim() || saving) return
    setSaving(true)
    const res = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: userText.trim(), content_type: 'text' }),
    })
    if (res.ok && onNodeCreated) {
      const { node } = await res.json()
      onNodeCreated(node)
    }
    setSaving(false)
    onClose()
  }

  async function saveAsIdea() {
    if (!userText.trim() || saving || !nodeA || !nodeB) return
    setSaving(true)
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_node_ids: [nodeA.id, nodeB.id],
        initial_content: userText.trim(),
      }),
    })
    const { idea } = await res.json()
    setSaving(false)
    router.push(`/garden/${idea.id}`)
    onClose()
  }

  const canSave = userText.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-garden-surface rounded-t-2xl sm:rounded-2xl border border-garden-border shadow-xl animate-slide-up flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-garden-border/50">
          <div>
            <h2 className="text-sm font-semibold text-garden-text">Idea Sex</h2>
            <p className="text-[11px] text-garden-muted mt-0.5">
              {step === 'pick' ? 'Zwei Notes kollidieren lassen' : 'Was kommt dir in den Sinn?'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-garden-bg text-garden-muted transition-colors">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {/* ── Step 1: Pick ── */}
          {step === 'pick' && nodeA && nodeB && (
            <>
              <NodeFull node={nodeA} onSwap={swapA} />

              {/* VS divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-garden-border" />
                <span className="text-[11px] font-semibold text-garden-muted tracking-widest">VS</span>
                <div className="flex-1 h-px bg-garden-border" />
              </div>

              <NodeFull node={nodeB} onSwap={swapB} />
            </>
          )}

          {/* ── Step 2: Collide ── */}
          {step === 'collide' && (
            <>
              {/* AI Question */}
              <div className="bg-garden-seed-light border border-garden-seed/25 rounded-xl px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-garden-seed/70 font-medium mb-1.5">Frage</p>
                <p className="text-sm text-garden-text leading-relaxed font-medium">{question}</p>
              </div>

              {/* User text field */}
              <textarea
                ref={textareaRef}
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                placeholder="Schreib drauf los…"
                className="w-full bg-garden-bg rounded-xl border border-garden-border px-4 py-3 text-sm text-garden-text placeholder:text-garden-muted/50 outline-none focus:ring-2 focus:ring-garden-accent/20 leading-relaxed resize-none min-h-32"
                rows={5}
              />
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 border-t border-garden-border/50 px-5 py-4 space-y-2">

          {step === 'pick' && (
            <>
              <button
                onClick={handleCollide}
                disabled={!nodeA || !nodeB || loading}
                className="w-full py-3 bg-garden-accent text-white rounded-xl text-sm font-medium hover:bg-garden-accent-dark transition-colors disabled:opacity-40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Kollidiert…
                  </span>
                ) : 'Kollidieren'}
              </button>
              <button
                onClick={shuffle}
                className="w-full py-2.5 bg-garden-bg border border-garden-border text-garden-muted text-sm rounded-xl hover:text-garden-text transition-colors"
              >
                Neu würfeln
              </button>
            </>
          )}

          {step === 'collide' && (
            <>
              <button
                onClick={saveAsIdea}
                disabled={!canSave || saving}
                className="w-full py-3 bg-garden-accent text-white rounded-xl text-sm font-medium hover:bg-garden-accent-dark transition-colors disabled:opacity-40"
              >
                {saving ? '…' : 'Als Idee im Garden'}
              </button>
              <button
                onClick={saveAsNote}
                disabled={!canSave || saving}
                className="w-full py-2.5 bg-garden-bg border border-garden-border text-garden-text text-sm rounded-xl hover:bg-white transition-colors disabled:opacity-40"
              >
                Als Note im Dump speichern
              </button>
              <button
                onClick={() => { setStep('pick'); setUserText(''); setQuestion('') }}
                className="w-full py-2.5 text-garden-muted text-sm hover:text-garden-text transition-colors"
              >
                ← Zurück zu den Notes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
