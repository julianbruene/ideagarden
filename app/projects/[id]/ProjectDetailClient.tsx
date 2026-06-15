'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import ProjectOutline, { type ProjectOutlineHandle } from '@/components/ProjectOutline'
import IdeaChat from '@/components/IdeaChat'
import type { Project, Input, ChatRole } from '@/lib/types'

interface Props {
  project: Project
  initialInputs: Input[]
  // When this project is a chapter (has parent_project_id), the title of the
  // parent book — surfaced as a clickable breadcrumb above the chapter title.
  parentBookTitle?: string | null
}

type ActiveTab = 'outline' | 'chat'

export default function ProjectDetailClient({ project: initialProject, initialInputs, parentBookTitle = null }: Props) {
  const [project, setProject] = useState<Project>(initialProject)
  const [inputs, setInputs] = useState<Input[]>(initialInputs)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.title ?? '')

  const [kernideeDraft, setKernideeDraft] = useState(project.kernidee ?? '')
  const kernideeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [brainDumpDraft, setBrainDumpDraft] = useState(project.brain_dump ?? '')
  const [brainDumpOpen, setBrainDumpOpen] = useState(!!project.brain_dump)
  const brainDumpSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [completing, setCompleting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('outline')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatRole, setChatRole] = useState<ChatRole>((project.chat_role as ChatRole) ?? 'sparring')

  async function changeChatRole(role: ChatRole) {
    if (role === chatRole) return
    setChatRole(role)
    setProject((p) => ({ ...p, chat_role: role }))
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_role: role }),
    })
  }
  const titleRef = useRef<HTMLInputElement>(null)
  const outlineRef = useRef<ProjectOutlineHandle>(null)
  const router = useRouter()

  const isChapter = !!project.parent_project_id

  // Debounced save for Kernidee
  useEffect(() => {
    if (kernideeDraft === (project.kernidee ?? '')) return
    if (kernideeSaveTimer.current) clearTimeout(kernideeSaveTimer.current)
    kernideeSaveTimer.current = setTimeout(async () => {
      const trimmed = kernideeDraft.trim() || null
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kernidee: trimmed }),
      })
      setProject((p) => ({ ...p, kernidee: trimmed }))
    }, 800)
    return () => { if (kernideeSaveTimer.current) clearTimeout(kernideeSaveTimer.current) }
  }, [kernideeDraft, project.id, project.kernidee])

  // Debounced save for Brain Dump
  useEffect(() => {
    if (brainDumpDraft === (project.brain_dump ?? '')) return
    if (brainDumpSaveTimer.current) clearTimeout(brainDumpSaveTimer.current)
    brainDumpSaveTimer.current = setTimeout(async () => {
      const trimmed = brainDumpDraft.trim() || null
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brain_dump: trimmed }),
      })
      setProject((p) => ({ ...p, brain_dump: trimmed }))
    }, 800)
    return () => { if (brainDumpSaveTimer.current) clearTimeout(brainDumpSaveTimer.current) }
  }, [brainDumpDraft, project.id, project.brain_dump])

  async function saveTitle() {
    setEditingTitle(false)
    const trimmed = titleDraft.trim() || null
    if (trimmed === project.title) return
    setProject((p) => ({ ...p, title: trimmed }))
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    })
  }

  async function handleDelete() {
    const what = isChapter ? 'Kapitel' : 'Projekt'
    if (!window.confirm(`${what} löschen? Das kann nicht rückgängig gemacht werden.`)) return
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Löschen fehlgeschlagen: ${data.error ?? res.status}`)
        return
      }
      if (isChapter && project.parent_project_id) {
        router.push(`/projects/${project.parent_project_id}`)
      } else {
        router.push('/projects')
      }
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleMarkDone() {
    if (completing) return
    const what = isChapter ? 'Kapitel' : 'Projekt'
    const confirmed = window.confirm(
      `${what} als fertig markieren? Es wird ${isChapter ? 'im Buch als fertig markiert' : 'ins Archiv verschoben und als Markdown heruntergeladen'}.`
    )
    if (!confirmed) return
    setCompleting(true)
    try {
      // Chapters: just update status, no export, return to parent
      if (isChapter) {
        const patchRes = await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
        })
        if (!patchRes.ok) {
          const data = await patchRes.json().catch(() => ({}))
          alert(`Status-Update fehlgeschlagen: ${data.error ?? patchRes.status}`)
          setCompleting(false)
          return
        }
        if (project.parent_project_id) router.push(`/projects/${project.parent_project_id}`)
        return
      }

      // Standalone single: export + archive
      const mdRes = await fetch(`/api/projects/${project.id}/export`)
      if (!mdRes.ok) {
        const data = await mdRes.json().catch(() => ({}))
        alert(`Export fehlgeschlagen: ${data.error ?? mdRes.status}`)
        setCompleting(false)
        return
      }
      const { markdown } = await mdRes.json()
      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(project.title ?? 'projekt').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
      a.click()
      URL.revokeObjectURL(url)

      const patchRes = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done', completed_at: new Date().toISOString() }),
      })
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}))
        alert(`Status-Update fehlgeschlagen: ${data.error ?? patchRes.status}`)
        setCompleting(false)
        return
      }
      router.push('/done')
    } catch (err) {
      alert(`Netzwerkfehler: ${err instanceof Error ? err.message : String(err)}`)
      setCompleting(false)
    }
  }

  // Fiction chapters live under a novel in the Fiction workspace —
  // route back there; non-fiction chapters/projects go to /projects.
  const parentBase = project.genre === 'fiction' ? '/fiction' : '/projects'
  const backHref = isChapter && project.parent_project_id
    ? `${parentBase}/${project.parent_project_id}`
    : (project.genre === 'fiction' ? '/fiction' : '/projects')

  return (
    <div className="flex flex-col bg-garden-bg" style={{ height: '100dvh', paddingBottom: '56px' }}>

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-garden-surface border-b border-garden-border px-4 md:px-6 py-3 md:py-3.5 flex items-center gap-3">
        <Link
          href={backHref}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-garden-border/40 text-garden-muted transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
            <span className="text-[9px] uppercase tracking-widest text-garden-seed font-semibold flex-shrink-0">
              {isChapter ? 'Kapitel' : 'Projekt'}
            </span>
            {/* Breadcrumb to parent book (chapters only) */}
            {isChapter && project.parent_project_id && parentBookTitle && (
              <>
                <span className="text-[9px] text-garden-muted-soft flex-shrink-0">·</span>
                <Link
                  href={`${parentBase}/${project.parent_project_id}`}
                  className="text-[10px] text-garden-muted hover:text-garden-accent transition-colors truncate"
                  title={`${project.genre === 'fiction' ? 'Zum Roman' : 'Zum Buch'}: ${parentBookTitle}`}
                >
                  {parentBookTitle}
                </Link>
              </>
            )}
          </div>
          {editingTitle ? (
            <input
              ref={titleRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') { setTitleDraft(project.title ?? ''); setEditingTitle(false) }
              }}
              className="w-full bg-transparent font-display text-base md:text-xl text-garden-text outline-none border-b border-garden-accent"
              placeholder="Titel hinzufügen…"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.select(), 10) }}
              className="font-display text-base md:text-xl text-garden-text hover:text-garden-accent transition-colors truncate block max-w-full text-left"
              style={{ fontWeight: 500 }}
            >
              {project.title || (isChapter ? 'Unbenanntes Kapitel' : 'Unbenanntes Projekt')}
            </button>
          )}
          {/* Counts row */}
          {(() => {
            const noteCount = inputs.filter((i) => i.is_note === true && !i.is_section).length
            const sectionCount = inputs.filter((i) => i.is_section).length
            const wordCount = (project.writing_content ?? '').trim().split(/\s+/).filter(Boolean).length
            return (
              <div className="font-mono micro-caps text-garden-muted-soft mt-1 flex items-center gap-2 flex-wrap tabnums">
                <span>{noteCount} {noteCount === 1 ? 'Note' : 'Notes'}</span>
                {sectionCount > 0 && <><span>·</span><span>{sectionCount} {sectionCount === 1 ? 'Abschnitt' : 'Abschnitte'}</span></>}
                {wordCount > 0 && <><span>·</span><span>{wordCount} {wordCount === 1 ? 'Wort' : 'Wörter'}</span></>}
              </div>
            )
          })()}
        </div>

        <Link
          href={`/projects/${project.id}/write`}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
            project.writing_content?.trim()
              ? 'bg-garden-accent text-white hover:bg-garden-accent-deep shadow-paper'
              : 'border border-garden-accent/40 text-garden-accent hover:bg-garden-accent-soft'
          }`}
          title="Text schreiben"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Schreiben
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-garden-muted/60 hover:text-garden-text hover:bg-garden-bg transition-colors"
            title="Weitere Aktionen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.8"/>
              <circle cx="12" cy="12" r="1.8"/>
              <circle cx="12" cy="19" r="1.8"/>
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1 z-30 bg-garden-surface border border-garden-border rounded-xl shadow-paper-lg overflow-hidden min-w-52 animate-fade-in">
                <button
                  onClick={() => { setMenuOpen(false); handleMarkDone() }}
                  disabled={completing || project.status === 'done'}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-seed hover:bg-garden-seed-light transition-colors text-left disabled:opacity-40"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Als fertig markieren
                </button>
                <div className="h-px bg-garden-border/60" />
                <button
                  onClick={() => { setMenuOpen(false); handleDelete() }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-garden-danger hover:bg-garden-danger-light transition-colors text-left"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                  </svg>
                  {isChapter ? 'Kapitel löschen' : 'Projekt löschen'}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Mobile tabs ── */}
      <div className="flex-shrink-0 flex md:hidden border-b border-garden-hairline bg-garden-surface">
        {(['outline', 'chat'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 font-mono micro-caps transition-colors ${
              activeTab === tab
                ? 'text-garden-accent border-b-2 border-garden-accent'
                : 'text-garden-muted'
            }`}
          >
            {tab === 'outline' ? 'Outline' : 'KI-Chat'}
          </button>
        ))}
      </div>

      {/* ── Main panels ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden max-w-7xl w-full mx-auto">

        {/* LEFT: Kernidee + Outline. When chat is closed, cap width and center
            so content reads like a document on wide screens. */}
        <div className={`flex flex-col min-h-0 w-full ${
          activeTab === 'outline' ? 'flex' : 'hidden md:flex'
        } ${
          chatOpen ? 'md:w-2/3 md:border-r border-garden-hairline' : 'md:max-w-4xl md:mx-auto'
        }`}>

          {/* Kernidee — left-aligned, max-w-2xl column */}
          <div className="flex-shrink-0 px-4 md:px-8 pt-3 md:pt-4 pb-2.5 border-b border-garden-hairline bg-garden-surface">
            <div className="max-w-2xl">
              <p className="font-mono micro-caps text-garden-accent mb-1">Kernidee</p>
              <textarea
                value={kernideeDraft}
                onChange={(e) => setKernideeDraft(e.target.value)}
                placeholder="Welcher eine Gedanke trägt diesen Text?"
                rows={1}
                className="w-full bg-transparent font-display text-garden-ink outline-none placeholder:text-garden-muted-soft/60 resize-none leading-relaxed"
                style={{
                  fontSize: 15,
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              />
            </div>
          </div>

          {/* Brain Dump — bare textarea (like Kernidee), inline chevron toggle (like Outline +) */}
          <div className="flex-shrink-0 px-4 md:px-8 pt-3 md:pt-4 pb-2.5 border-b border-garden-hairline bg-garden-surface">
            <div className="max-w-2xl">
              <button
                onClick={() => setBrainDumpOpen((v) => !v)}
                className="flex items-center gap-2 mb-1 group"
                title={brainDumpOpen ? 'Brain Dump einklappen' : 'Brain Dump aufklappen'}
              >
                <p className="font-mono micro-caps text-garden-accent">Brain Dump</p>
                <span className="p-0.5 rounded text-garden-muted-soft group-hover:text-garden-accent group-hover:bg-garden-accent-soft transition-colors">
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform ${brainDumpOpen ? '' : '-rotate-90'}`}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
                {!brainDumpOpen && !brainDumpDraft.trim() && (
                  <span className="font-mono text-[10px] text-garden-muted-soft italic">leer</span>
                )}
              </button>
              {brainDumpOpen && (
                <textarea
                  value={brainDumpDraft}
                  onChange={(e) => setBrainDumpDraft(e.target.value)}
                  placeholder="Geistesblitz hin werfen — wird gespeichert."
                  rows={2}
                  className="w-full bg-transparent text-garden-ink leading-relaxed resize-none outline-none placeholder:text-garden-muted-soft/60 font-serif"
                  style={{ fontSize: 15, minHeight: '50px' }}
                />
              )}
            </div>
          </div>

          {/* Outline label + add-section */}
          <div className="flex-shrink-0 px-4 md:px-8 py-2 border-b border-garden-hairline-soft bg-garden-surface/60">
            <div className="max-w-2xl flex items-center gap-2">
              <p className="font-mono micro-caps text-garden-accent">Outline</p>
              <button
                onClick={() => outlineRef.current?.addSection()}
                title="Abschnitt einziehen"
                className="p-0.5 rounded text-garden-muted-soft hover:text-garden-accent hover:bg-garden-accent-soft transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
          </div>

          <ProjectOutline
            ref={outlineRef}
            projectId={project.id}
            notes={inputs}
            onNoteAdded={(note) => setInputs((prev) => [...prev, note])}
            onNoteRemoved={(id) => setInputs((prev) => prev.filter((i) => i.id !== id))}
            onNoteUpdated={(updated) => setInputs((prev) => prev.map((i) => i.id === updated.id ? updated : i))}
            onNotesReordered={(reordered) => {
              const reorderedMap = new Map(reordered.map((n) => [n.id, n]))
              setInputs((prev) => prev.map((i) => reorderedMap.get(i.id) ?? i))
            }}
          />
        </div>

        {/* RIGHT: Chat — collapsible, ~1/3 on desktop */}
        <div className={`flex flex-col min-h-0 ${
          activeTab === 'chat' ? 'flex w-full' : 'hidden'
        } ${
          chatOpen ? 'md:flex md:w-1/3' : 'md:hidden'
        }`}>
          <div className="flex-shrink-0 px-4 py-2 border-b border-garden-hairline-soft bg-garden-surface/60">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono micro-caps text-garden-accent">KI-Chat</p>
              <button
                onClick={() => setChatOpen(false)}
                className="hidden md:flex font-mono micro-caps text-garden-muted-soft hover:text-garden-ink transition-colors items-center gap-1"
                title="Schließen"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {/* Role selector — three pills with message counts */}
            <div className="mt-2 flex items-center gap-1">
              {([
                { key: 'sparring',   label: 'Sparring' },
                { key: 'researcher', label: 'Recherche' },
                { key: 'editor',     label: 'Lektor' },
              ] as { key: ChatRole; label: string }[]).map(({ key, label }) => {
                const active = chatRole === key
                const count = inputs.filter(
                  (i) => i.chat_role === key && i.is_note !== true && i.role === 'assistant',
                ).length
                return (
                  <button
                    key={key}
                    onClick={() => changeChatRole(key)}
                    className={`font-mono micro-caps px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                      active
                        ? 'bg-garden-accent-soft text-garden-accent-deep'
                        : 'text-garden-muted-soft hover:text-garden-ink'
                    }`}
                    title={
                      key === 'sparring' ? 'Stellt eine scharfe Frage, treibt das Denken weiter — sieht nur Kernidee + Outline'
                      : key === 'researcher' ? 'Hilft bei Recherche, erklärt Konzepte, zeigt Lücken — sieht nur Kernidee + Outline'
                      : 'Schärft den geschriebenen Text — sieht Kernidee + Outline + den Text'
                    }
                  >
                    {label}
                    {count > 0 && (
                      <span className={`tabnums text-[9px] ${active ? 'text-garden-accent-deep' : 'text-garden-muted-soft'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <IdeaChat
            ideaId={project.id}
            chatEndpoint={`/api/projects/${project.id}/chat`}
            chatRole={chatRole}
            allInputs={inputs}
            onMessageAdded={setInputs}
          />
        </div>
      </div>

      {/* Floating KI-Chat tab on right edge — desktop only, when chat is closed */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 items-center gap-1.5 bg-garden-surface border border-r-0 border-garden-hairline rounded-l-xl py-3 px-2.5 text-garden-muted hover:text-garden-accent hover:bg-garden-accent-soft transition-colors shadow-paper z-30"
          title="KI-Chat öffnen"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="font-mono micro-caps writing-mode-vertical" style={{ writingMode: 'vertical-rl' }}>
            KI-Chat
          </span>
        </button>
      )}

      <NavBar />
    </div>
  )
}
