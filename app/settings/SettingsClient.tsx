'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/client'

interface BackupShape {
  version?: string
  exported_at?: string
  user_id?: string
  counts?: { nodes: number; ideas: number; projects: number; inputs: number }
  data: {
    nodes: BackupNode[]
    ideas: BackupIdea[]
    projects: BackupProject[]
    inputs: BackupInput[]
  }
}

interface BackupNode {
  id: string
  content: string | null
  content_type: string
  image_url: string | null
  image_transcript: string | null
  promoted: boolean
  created_at: string
}

interface BackupIdea {
  id: string
  title: string | null
  synthesis: string | null
  status: string
  created_at: string
  completed_at: string | null
}

interface BackupProject {
  id: string
  title: string | null
  kernidee: string | null
  outline: string | null
  writing_content: string | null
  kind: string
  parent_project_id: string | null
  status: string
  created_at: string
  completed_at: string | null
}

interface BackupInput {
  id: string
  idea_id: string | null
  project_id: string | null
  content: string
  role: string
  is_note: boolean | null
  is_section: boolean | null
  starred: boolean | null
  image_transcript: string | null
  outline_order: number | null
  used: boolean | null
  chat_role: string | null
  mirror_source_id: string | null
  created_at: string
}

function ts() {
  return new Date().toISOString().slice(0, 10)
}

export default function SettingsClient() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [downloadingJson, setDownloadingJson] = useState(false)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function fetchBackup(): Promise<BackupShape | null> {
    const res = await fetch('/api/backup/export')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error ?? `HTTP ${res.status}`)
    }
    return res.json()
  }

  async function handleDownloadJson() {
    if (downloadingJson) return
    setMessage(null)
    setDownloadingJson(true)
    try {
      const backup = await fetchBackup()
      if (!backup) throw new Error('Leerer Backup-Body')
      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `idea-garden-backup-${ts()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: 'JSON-Backup heruntergeladen.' })
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setDownloadingJson(false)
    }
  }

  async function handleDownloadZip() {
    if (downloadingZip) return
    setMessage(null)
    setDownloadingZip(true)
    try {
      const backup = await fetchBackup()
      if (!backup) throw new Error('Leerer Backup-Body')
      const zip = new JSZip()

      // README
      const readme = [
        '# Idea Garden — Markdown-Backup',
        '',
        `Exportiert: ${new Date(backup.exported_at ?? Date.now()).toLocaleString('de-DE')}`,
        '',
        backup.counts
          ? `**Inhalt:** ${backup.counts.nodes} Nodes (Dump) · ${backup.counts.ideas} Ideen · ${backup.counts.projects} Projekte · ${backup.counts.inputs} Inputs`
          : '',
        '',
        'Dieses ZIP ist nur zum Lesen gedacht (Markdown). Für Wiederherstellung in Idea Garden bitte das JSON-Backup nutzen.',
      ].join('\n')
      zip.file('README.md', readme)

      // Helper: safe filename
      const safe = (s: string | null | undefined, fallback: string) =>
        (s ?? fallback).replace(/[^a-zA-Z0-9äöüÄÖÜß \-_]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 80) || fallback

      // Dump folder — one file per node
      const dump = zip.folder('dump')
      for (const n of backup.data.nodes) {
        const lines: string[] = []
        lines.push(`*${new Date(n.created_at).toLocaleDateString('de-DE')} — Type: ${n.content_type}*`)
        lines.push('')
        if (n.image_url) lines.push(`![image](${n.image_url})\n`)
        if (n.image_transcript) lines.push(n.image_transcript + '\n')
        if (n.content) lines.push(n.content)
        const name = safe(n.content?.slice(0, 40) ?? n.id, n.id.slice(0, 8))
        dump?.file(`${ts()}_${name}.md`, lines.join('\n'))
      }

      // Garden folder — one file per idea, with all its notes
      const garden = zip.folder('garden')
      for (const idea of backup.data.ideas) {
        const ideaInputs = backup.data.inputs.filter((i) => i.idea_id === idea.id)
        const lines: string[] = []
        lines.push(`# ${idea.title ?? 'Unbenannte Idee'}`)
        lines.push('')
        lines.push(`*Erstellt: ${new Date(idea.created_at).toLocaleDateString('de-DE')}${
          idea.completed_at ? ' · Abgeschlossen: ' + new Date(idea.completed_at).toLocaleDateString('de-DE') : ''
        }*`)
        lines.push('')
        if (idea.synthesis) {
          lines.push('## Synthese')
          lines.push('')
          lines.push(idea.synthesis)
          lines.push('')
        }
        if (ideaInputs.length > 0) {
          lines.push('## Notes & Chat')
          lines.push('')
          for (const i of ideaInputs.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
            const time = new Date(i.created_at).toLocaleString('de-DE')
            if (i.role === 'user') {
              lines.push(`**${time}**`)
              lines.push('')
              lines.push(i.content.startsWith('[img]') && i.image_transcript ? `Screenshot: ${i.image_transcript}` : i.content)
              lines.push('')
            } else {
              lines.push(`> *KI — ${time}*`)
              lines.push('>')
              i.content.split('\n').forEach((l) => lines.push(`> ${l}`))
              lines.push('')
            }
          }
        }
        const name = safe(idea.title, idea.id.slice(0, 8))
        garden?.file(`${idea.status}_${name}.md`, lines.join('\n'))
      }

      // Projects folder — one file per project (or book + chapters)
      const projectsFolder = zip.folder('projects')
      for (const p of backup.data.projects) {
        if (p.parent_project_id) continue // chapters rendered inside their book below
        const projectInputs = backup.data.inputs
          .filter((i) => i.project_id === p.id)
          .sort((a, b) => (a.outline_order ?? 0) - (b.outline_order ?? 0))
        const lines: string[] = []
        const kindLabel = p.kind === 'book' ? 'Buch' : 'Projekt'
        lines.push(`# ${p.title ?? 'Unbenanntes ' + kindLabel}`)
        lines.push('')
        lines.push(`*${kindLabel} · Erstellt: ${new Date(p.created_at).toLocaleDateString('de-DE')}${
          p.completed_at ? ' · Abgeschlossen: ' + new Date(p.completed_at).toLocaleDateString('de-DE') : ''
        }*`)
        lines.push('')
        if (p.kernidee) {
          lines.push(`> ${p.kernidee}`)
          lines.push('')
        }

        if (p.kind === 'book') {
          const chapters = backup.data.projects
            .filter((c) => c.parent_project_id === p.id)
            .sort((a, b) => {
              const aoRow = backup.data.inputs.find(() => false) // placeholder no-op
              void aoRow
              return 0
            })
          // Sort chapters by their own chapter_order if set, else by created_at
          chapters.sort((a, b) => {
            const ao = (a as unknown as { chapter_order?: number }).chapter_order ?? 0
            const bo = (b as unknown as { chapter_order?: number }).chapter_order ?? 0
            if (ao !== bo) return ao - bo
            return a.created_at.localeCompare(b.created_at)
          })
          for (const ch of chapters) {
            lines.push('---')
            lines.push('')
            lines.push(`## ${ch.title ?? 'Unbenanntes Kapitel'}`)
            lines.push('')
            if (ch.kernidee) {
              lines.push(`*${ch.kernidee}*`)
              lines.push('')
            }
            if (ch.writing_content) {
              lines.push(ch.writing_content)
              lines.push('')
            }
          }
        } else {
          if (p.writing_content) {
            lines.push('## Text')
            lines.push('')
            lines.push(p.writing_content)
            lines.push('')
          }
          if (projectInputs.length > 0) {
            lines.push('## Outline')
            lines.push('')
            for (const i of projectInputs) {
              if (i.is_section) {
                lines.push(`### ${i.content || 'Unbenannter Abschnitt'}`)
                lines.push('')
              } else if (i.is_note) {
                if (i.content?.startsWith('[img]')) {
                  if (i.image_transcript) lines.push(`- _Screenshot:_ ${i.image_transcript}`)
                  else lines.push(`- _Screenshot_`)
                } else {
                  lines.push(`- ${i.content}`)
                }
              }
            }
            lines.push('')
          }
        }

        const name = safe(p.title, p.id.slice(0, 8))
        projectsFolder?.file(`${p.status}_${kindLabel.toLowerCase()}_${name}.md`, lines.join('\n'))
      }

      // Generate + download
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `idea-garden-backup-${ts()}.zip`
      a.click()
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: 'Markdown-ZIP heruntergeladen.' })
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setDownloadingZip(false)
    }
  }

  async function handleRestoreFile(file: File) {
    const text = await file.text()
    let payload: BackupShape
    try {
      payload = JSON.parse(text)
    } catch {
      setMessage({ type: 'error', text: 'Datei ist kein gültiges JSON.' })
      return
    }
    if (!payload?.data) {
      setMessage({ type: 'error', text: 'JSON enthält kein "data"-Feld — kein gültiges Backup.' })
      return
    }
    const counts = {
      nodes: payload.data.nodes?.length ?? 0,
      ideas: payload.data.ideas?.length ?? 0,
      projects: payload.data.projects?.length ?? 0,
      inputs: payload.data.inputs?.length ?? 0,
    }
    const confirmed = window.confirm(
      `Backup vom ${payload.exported_at ? new Date(payload.exported_at).toLocaleString('de-DE') : 'unbekannt'} wiederherstellen?\n\n` +
      `Inhalt:\n${counts.nodes} Dump-Nodes\n${counts.ideas} Ideen\n${counts.projects} Projekte\n${counts.inputs} Inputs (Notes + Chat + Sections)\n\n` +
      `⚠️ Alle aktuellen Daten werden gelöscht und durch das Backup ersetzt.\n\nWirklich fortfahren?`
    )
    if (!confirmed) return

    setRestoring(true)
    setMessage(null)
    try {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setMessage({
        type: 'success',
        text: `Wiederhergestellt: ${data.restored?.nodes ?? 0} Nodes · ${data.restored?.ideas ?? 0} Ideen · ${data.restored?.projects ?? 0} Projekte · ${data.restored?.inputs ?? 0} Inputs.`,
      })
      setTimeout(() => router.refresh(), 800)
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="space-y-12">
      {/* Status message */}
      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'bg-garden-accent-soft text-garden-accent-deep border border-garden-accent/30'
            : 'bg-garden-danger-light text-garden-danger border border-garden-danger/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Backup section */}
      <section>
        <h2 className="font-mono micro-caps text-garden-accent mb-2">Backup</h2>
        <p className="font-serif italic text-garden-muted text-[15px] leading-relaxed mb-6">
          Lade jederzeit eine vollständige Kopie deiner Daten herunter. JSON ist für Wiederherstellung,
          Markdown-ZIP zum Lesen und Archivieren — auch ohne Idea Garden.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleDownloadJson}
            disabled={downloadingJson}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-garden-hairline bg-garden-surface hover:border-garden-accent/40 hover:bg-garden-accent-soft/30 transition-colors disabled:opacity-50"
          >
            <div className="text-left">
              <p className="font-display text-garden-ink" style={{ fontSize: 16, fontWeight: 500 }}>
                JSON-Backup
              </p>
              <p className="font-mono text-[11px] text-garden-muted mt-0.5">
                Vollständig · maschinenlesbar · für Wiederherstellung
              </p>
            </div>
            <span className="font-mono micro-caps text-garden-accent">
              {downloadingJson ? 'Lade…' : 'Download'}
            </span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-garden-hairline bg-garden-surface hover:border-garden-accent/40 hover:bg-garden-accent-soft/30 transition-colors disabled:opacity-50"
          >
            <div className="text-left">
              <p className="font-display text-garden-ink" style={{ fontSize: 16, fontWeight: 500 }}>
                Markdown-ZIP
              </p>
              <p className="font-mono text-[11px] text-garden-muted mt-0.5">
                Lesbar in jedem Editor · Archivformat · keine Wiederherstellung möglich
              </p>
            </div>
            <span className="font-mono micro-caps text-garden-accent">
              {downloadingZip ? 'Lade…' : 'Download'}
            </span>
          </button>
        </div>
      </section>

      {/* Restore section */}
      <section>
        <h2 className="font-mono micro-caps text-garden-accent mb-2">Wiederherstellen</h2>
        <p className="font-serif italic text-garden-muted text-[15px] leading-relaxed mb-6">
          Lade ein JSON-Backup hoch. Alle aktuellen Daten werden ersetzt.
          Sinnvoll wenn du ein älteres Backup einspielen willst oder etwas versehentlich gelöscht hast.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleRestoreFile(file)
            e.target.value = ''
          }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={restoring}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-garden-danger/40 bg-garden-surface hover:bg-garden-danger-light/40 transition-colors disabled:opacity-50"
        >
          <div className="text-left">
            <p className="font-display text-garden-ink" style={{ fontSize: 16, fontWeight: 500 }}>
              JSON-Backup hochladen
            </p>
            <p className="font-mono text-[11px] text-garden-danger mt-0.5">
              ⚠ Wipe + Replace · alle aktuellen Daten gehen verloren
            </p>
          </div>
          <span className="font-mono micro-caps text-garden-danger">
            {restoring ? 'Stelle wieder her…' : 'Datei wählen'}
          </span>
        </button>
      </section>

      {/* Info */}
      <section className="pt-6 border-t border-garden-hairline">
        <h2 className="font-mono micro-caps text-garden-muted-soft mb-2">Wo deine Daten liegen</h2>
        <p className="font-serif italic text-garden-muted text-[14px] leading-relaxed">
          Postgres bei Supabase, Bilder im Supabase Storage. Auf dem Free-Tier gibt&apos;s keine
          automatischen Backups und nach 7 Tagen Inaktivität wird das Projekt pausiert (Daten bleiben).
          Empfehlung: Pro-Plan ($25/Monat) für tägliche Backups + kein Auto-Pause —
          plus ab und zu einmal hier den Backup-Button drücken.
        </p>
      </section>

      {/* Account */}
      <section className="pt-6 border-t border-garden-hairline">
        <h2 className="font-mono micro-caps text-garden-muted-soft mb-4">Account</h2>
        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/auth')
            router.refresh()
          }}
          className="font-mono micro-caps text-garden-muted hover:text-garden-danger transition-colors flex items-center gap-1.5"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Abmelden
        </button>
      </section>
    </div>
  )
}
