import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_SPARRING_PROMPT,
  DEFAULT_RESEARCHER_PROMPT,
  DEFAULT_EDITOR_PROMPT,
} from '@/lib/anthropic'

export const dynamic = 'force-dynamic'

// GET — return user's overrides + the defaults so the UI can render both
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_settings')
    .select('sparring_prompt, researcher_prompt, editor_prompt')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    overrides: {
      sparring: data?.sparring_prompt ?? null,
      researcher: data?.researcher_prompt ?? null,
      editor: data?.editor_prompt ?? null,
    },
    defaults: {
      sparring: DEFAULT_SPARRING_PROMPT,
      researcher: DEFAULT_RESEARCHER_PROMPT,
      editor: DEFAULT_EDITOR_PROMPT,
    },
  })
}

// PATCH — update overrides. Pass null for a field to reset to default.
// Body: { sparring?: string | null, researcher?: string | null, editor?: string | null }
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    sparring?: string | null
    researcher?: string | null
    editor?: string | null
  }

  const updates: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
  if ('sparring' in body) updates.sparring_prompt = body.sparring?.trim() ? body.sparring : null
  if ('researcher' in body) updates.researcher_prompt = body.researcher?.trim() ? body.researcher : null
  if ('editor' in body) updates.editor_prompt = body.editor?.trim() ? body.editor : null

  // Upsert: insert if missing, update otherwise
  const { error } = await supabase
    .from('user_settings')
    .upsert(updates, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
