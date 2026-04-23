'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { IdeaNode } from '@/lib/types'

interface Props {
  onNodeCreated: (node: IdeaNode) => void
}

export default function DumpInput({ onNodeCreated }: Props) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const supabase = createClient()

  async function uploadImage(file: File): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const ext = file.name.split('.').pop() || 'png'
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('node-images')
      .upload(path, file, { upsert: false })

    if (error) { console.error(error); return null }

    const { data } = supabase.storage.from('node-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function createNode(
    content: string | null,
    contentType: IdeaNode['content_type'],
    imageUrl?: string
  ) {
    const res = await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, content_type: contentType, image_url: imageUrl ?? null }),
    })
    if (!res.ok) return
    const { node } = await res.json()
    onNodeCreated(node)
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    await createNode(trimmed, 'text')
    setText('')
    setSubmitting(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Paste handler — images land as nodes immediately
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue

        setUploading(true)
        const url = await uploadImage(blob)
        if (url) await createNode(null, 'image', url)
        setUploading(false)
        return
      }
    }
    // Long pasted text → tag as quote
    const pasted = e.clipboardData.getData('text')
    if (pasted.length > 80) {
      e.preventDefault()
      setSubmitting(true)
      await createNode(pasted, 'quote')
      setSubmitting(false)
    }
  }, []) // eslint-disable-line

  // File picker (mobile gallery / desktop)
  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    const url = await uploadImage(file)
    if (url) await createNode(null, 'image', url)
    setUploading(false)
    e.target.value = ''
  }

  // Drag-and-drop images
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    const url = await uploadImage(file)
    if (url) await createNode(null, 'image', url)
    setUploading(false)
  }

  // Voice input via Web Speech API
  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    type SpeechRecognitionCtor = new () => {
      continuous: boolean
      interimResults: boolean
      lang: string
      start(): void
      stop(): void
      onresult: ((event: {
        resultIndex: number
        results: { isFinal: boolean; 0: { transcript: string } }[]
      }) => void) | null
      onerror: (() => void) | null
      onend: (() => void) | null
    }

    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const SpeechRecognitionImpl = w.SpeechRecognition || w.webkitSpeechRecognition

    if (!SpeechRecognitionImpl) {
      alert('Voice input is not supported in this browser. Try Chrome.')
      return
    }

    const recognition = new SpeechRecognitionImpl()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTranscript += t
        else interim += t
      }
      setText(finalTranscript + interim)
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = async () => {
      setIsRecording(false)
      if (finalTranscript.trim()) {
        setSubmitting(true)
        await createNode(finalTranscript.trim(), 'voice')
        setText('')
        setSubmitting(false)
      }
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  const busy = uploading || submitting

  return (
    <div
      className={`bg-garden-surface rounded-xl border transition-all shadow-paper ${
        isDragOver ? 'border-garden-accent bg-garden-accent-light' : 'border-garden-border/70'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={isRecording ? 'Listening...' : 'Dump a thought. Press Enter to save.'}
          className={`w-full px-4 pt-4 pb-2 bg-transparent resize-none outline-none text-garden-text placeholder:text-garden-muted/60 text-sm leading-relaxed ${
            isRecording ? 'placeholder:text-garden-accent animate-pulse-slow' : ''
          }`}
          rows={1}
          disabled={isRecording || busy}
        />

        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left: voice + image */}
          <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={busy}
            title="Spracheingabe"
            className={`p-2 rounded-lg transition-all ${
              isRecording
                ? 'bg-garden-danger-light text-garden-danger animate-pulse'
                : 'text-garden-muted hover:text-garden-text hover:bg-garden-bg'
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          {/* Image picker button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            title="Bild hochladen"
            className="p-2 rounded-xl text-garden-muted hover:text-garden-text hover:bg-garden-bg transition-all disabled:opacity-40"
          >
            {uploading ? (
              <span className="w-4 h-4 border-2 border-garden-muted border-t-transparent rounded-full animate-spin block" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            )}
          </button>
          </div>

          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="text-xs text-garden-danger font-medium">Aufnahme läuft…</span>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!text.trim() || busy}
              className="p-2 rounded-lg bg-garden-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-garden-accent-dark transition-colors shadow-paper"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
