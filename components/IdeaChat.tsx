'use client'

import { useState, useRef, useEffect } from 'react'
import type { Input, ChatRole } from '@/lib/types'

interface Props {
  ideaId: string  // container id — idea_id OR project_id
  chatEndpoint?: string  // defaults to /api/ideas/[id]/chat
  chatRole?: ChatRole  // when set, filter conversation by this role and send it with each message
  allInputs: Input[]
  onMessageAdded: (inputs: Input[]) => void
}

export default function IdeaChat({ ideaId, chatEndpoint, chatRole, allInputs, onMessageAdded }: Props) {
  const endpoint = chatEndpoint ?? `/api/ideas/${ideaId}/chat`
  const [message, setMessage] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Filter to chat messages (exclude notes); when chatRole is set, also filter by role
  const conversation = allInputs
    .filter((i) => i.is_note !== true)
    .filter((i) => {
      if (!chatRole) return true
      // Only show messages tagged with the current role
      return i.chat_role === chatRole
    })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation, streamedText])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || streaming) return

    const optimisticUser: Input = {
      id: `tmp-${Date.now()}`,
      idea_id: ideaId,
      user_id: '',
      content: trimmed,
      role: 'user',
      is_note: false,
      chat_role: chatRole ?? null,
      created_at: new Date().toISOString(),
    }

    const withUser = [...allInputs, optimisticUser]
    onMessageAdded(withUser)
    setMessage('')
    setStreaming(true)
    setStreamedText('')

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, role: chatRole }),
      })

      if (!res.ok || !res.body) throw new Error('Failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6)
            if (payload === '[DONE]') break
            try {
              const { text } = JSON.parse(payload)
              fullText += text
              setStreamedText(fullText)
            } catch { /* skip */ }
          }
        }
      }

      const aiMsg: Input = {
        id: `ai-${Date.now()}`,
        idea_id: ideaId,
        user_id: '',
        content: fullText,
        role: 'assistant',
        is_note: false,
        chat_role: chatRole ?? null,
        created_at: new Date().toISOString(),
      }
      onMessageAdded([...withUser, aiMsg])
      setStreamedText('')
    } catch (err) {
      console.error(err)
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const [resetting, setResetting] = useState(false)
  async function handleReset() {
    if (resetting || streaming) return
    const roleLabel =
      chatRole === 'sparring' ? 'Sparring-Chat'
      : chatRole === 'researcher' ? 'Recherche-Chat'
      : chatRole === 'editor' ? 'Lektor-Chat'
      : 'Chat'
    const confirmed = window.confirm(
      `${roleLabel} zurücksetzen?\n\nAlle Nachrichten werden gelöscht. Notes und der geschriebene Text bleiben unberührt.`
    )
    if (!confirmed) return
    setResetting(true)
    try {
      const url = chatRole ? `${endpoint}?role=${chatRole}` : endpoint
      const res = await fetch(url, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Reset fehlgeschlagen: ${data.error ?? res.status}`)
        return
      }
      // Local state: keep notes + chat from other roles, drop current role's chat
      if (chatRole) {
        onMessageAdded(allInputs.filter((i) => i.is_note === true || i.chat_role !== chatRole))
      } else {
        onMessageAdded(allInputs.filter((i) => i.is_note === true))
      }
    } catch (e) {
      alert(`Netzwerkfehler: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setResetting(false)
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
        {conversation.length === 0 && !streaming && (
          <p className="text-xs text-garden-muted/60 text-center py-8 italic">
            Stell der KI eine Frage zu dieser Idee.
          </p>
        )}

        {/* Reset link — only visible when there are messages */}
        {conversation.length > 0 && (
          <div className="flex justify-end -mt-2 mb-1">
            <button
              onClick={handleReset}
              disabled={resetting || streaming}
              title="Chat zurücksetzen — Verlauf löschen"
              className="font-mono micro-caps text-garden-muted-soft hover:text-garden-danger transition-colors flex items-center gap-1 disabled:opacity-40"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
              </svg>
              {resetting ? 'Setze zurück…' : 'Zurücksetzen'}
            </button>
          </div>
        )}

        {conversation.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-garden-accent text-white rounded-br-sm'
                : 'bg-white border border-garden-border text-garden-text rounded-bl-sm'
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-garden-muted/60'}`}>
                {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        ))}

        {streaming && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 bg-white border border-garden-border text-sm text-garden-text leading-relaxed">
              {streamedText ? (
                <p className="whitespace-pre-wrap break-words">{streamedText}</p>
              ) : (
                <span className="flex gap-1 py-1">
                  <span className="w-1.5 h-1.5 bg-garden-muted/50 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-garden-muted/50 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-garden-muted/50 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-garden-border bg-garden-surface px-3 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frag die KI…"
            disabled={streaming}
            className="flex-1 resize-none bg-garden-bg rounded-xl px-3.5 py-2.5 text-sm text-garden-text placeholder:text-garden-muted/60 outline-none focus:ring-2 focus:ring-garden-accent/20 disabled:opacity-50 max-h-28 leading-relaxed border border-garden-border"
            rows={1}
          />
          <button
            type="submit"
            disabled={!message.trim() || streaming}
            className="p-2.5 bg-garden-accent text-white rounded-xl hover:bg-garden-accent-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
