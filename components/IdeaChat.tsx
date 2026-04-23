'use client'

import { useState, useRef, useEffect } from 'react'
import type { Input } from '@/lib/types'

interface Props {
  ideaId: string  // container id — idea_id OR project_id
  chatEndpoint?: string  // defaults to /api/ideas/[id]/chat
  allInputs: Input[]
  onMessageAdded: (inputs: Input[]) => void
}

export default function IdeaChat({ ideaId, chatEndpoint, allInputs, onMessageAdded }: Props) {
  const endpoint = chatEndpoint ?? `/api/ideas/${ideaId}/chat`
  const [message, setMessage] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Only show chat messages (is_note = false/undefined means it's a chat message or AI response)
  const conversation = allInputs.filter(
    (i) => i.role === 'assistant' || i.is_note === false || (!i.is_note && i.role === 'user' && i.is_note !== true)
  ).filter(
    // Exclude pure notes (is_note = true)
    (i) => i.is_note !== true
  )

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
        body: JSON.stringify({ message: trimmed }),
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
