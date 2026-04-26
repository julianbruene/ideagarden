import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface BackupPayload {
  version?: string
  exported_at?: string
  data: {
    nodes?: Record<string, unknown>[]
    ideas?: Record<string, unknown>[]
    projects?: Record<string, unknown>[]
    inputs?: Record<string, unknown>[]
  }
}

// Wipe the current user's data and restore from the uploaded backup JSON.
// All user_id fields are rewritten to the current user (so backups can be
// restored even if the original user_id is different — same login, fine).
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: BackupPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!payload?.data) {
    return NextResponse.json({ error: 'Backup payload missing "data" key' }, { status: 400 })
  }

  const incomingNodes = payload.data.nodes ?? []
  const incomingIdeas = payload.data.ideas ?? []
  const incomingProjects = payload.data.projects ?? []
  const incomingInputs = payload.data.inputs ?? []

  // Stamp current user_id on all rows
  const stamp = <T extends Record<string, unknown>>(rows: T[]): T[] =>
    rows.map((r) => ({ ...r, user_id: user.id }))

  const nodes = stamp(incomingNodes)
  const ideas = stamp(incomingIdeas)
  const projects = stamp(incomingProjects)
  const inputs = stamp(incomingInputs)

  // ====== WIPE ======
  // Delete in dependency order: inputs first, then projects+ideas, then nodes.
  // FK CASCADE on inputs/projects handles edge cases.
  const { error: delInputsErr } = await supabase.from('inputs').delete().eq('user_id', user.id)
  if (delInputsErr) return NextResponse.json({ error: `wipe inputs: ${delInputsErr.message}` }, { status: 500 })

  const { error: delProjectsErr } = await supabase.from('projects').delete().eq('user_id', user.id)
  if (delProjectsErr) return NextResponse.json({ error: `wipe projects: ${delProjectsErr.message}` }, { status: 500 })

  const { error: delIdeasErr } = await supabase.from('ideas').delete().eq('user_id', user.id)
  if (delIdeasErr) return NextResponse.json({ error: `wipe ideas: ${delIdeasErr.message}` }, { status: 500 })

  const { error: delNodesErr } = await supabase.from('nodes').delete().eq('user_id', user.id)
  if (delNodesErr) return NextResponse.json({ error: `wipe nodes: ${delNodesErr.message}` }, { status: 500 })

  // ====== RESTORE ======

  // 1. Ideas (no FKs to other rows)
  if (ideas.length > 0) {
    const { error } = await supabase.from('ideas').insert(ideas)
    if (error) return NextResponse.json({ error: `restore ideas: ${error.message}` }, { status: 500 })
  }

  // 2. Projects — parents (parent_project_id IS NULL) first, then chapters
  const parentProjects = projects.filter((p) => !p.parent_project_id)
  const childProjects = projects.filter((p) => !!p.parent_project_id)

  if (parentProjects.length > 0) {
    const { error } = await supabase.from('projects').insert(parentProjects)
    if (error) return NextResponse.json({ error: `restore parent projects: ${error.message}` }, { status: 500 })
  }

  if (childProjects.length > 0) {
    const { error } = await supabase.from('projects').insert(childProjects)
    if (error) return NextResponse.json({ error: `restore chapter projects: ${error.message}` }, { status: 500 })
  }

  // 3. Nodes (independent)
  if (nodes.length > 0) {
    const { error } = await supabase.from('nodes').insert(nodes)
    if (error) return NextResponse.json({ error: `restore nodes: ${error.message}` }, { status: 500 })
  }

  // 4. Inputs — non-mirrors first (no mirror_source_id), then mirrors
  const baseInputs = inputs.filter((i) => !i.mirror_source_id)
  const mirrorInputs = inputs.filter((i) => !!i.mirror_source_id)

  if (baseInputs.length > 0) {
    const { error } = await supabase.from('inputs').insert(baseInputs)
    if (error) return NextResponse.json({ error: `restore inputs (base): ${error.message}` }, { status: 500 })
  }

  if (mirrorInputs.length > 0) {
    const { error } = await supabase.from('inputs').insert(mirrorInputs)
    if (error) return NextResponse.json({ error: `restore inputs (mirrors): ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    restored: {
      nodes: nodes.length,
      ideas: ideas.length,
      projects: projects.length,
      inputs: inputs.length,
    },
  })
}
