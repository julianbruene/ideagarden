import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Full backup of the user's data — restore-ready JSON.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    { data: nodes },
    { data: ideas },
    { data: projects },
    { data: inputs },
  ] = await Promise.all([
    supabase.from('nodes').select('*').eq('user_id', user.id),
    supabase.from('ideas').select('*').eq('user_id', user.id),
    supabase.from('projects').select('*').eq('user_id', user.id),
    supabase.from('inputs').select('*').eq('user_id', user.id),
  ])

  const payload = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    user_id: user.id,
    counts: {
      nodes: nodes?.length ?? 0,
      ideas: ideas?.length ?? 0,
      projects: projects?.length ?? 0,
      inputs: inputs?.length ?? 0,
    },
    data: {
      nodes: nodes ?? [],
      ideas: ideas ?? [],
      projects: projects ?? [],
      inputs: inputs ?? [],
    },
  }

  return NextResponse.json(payload)
}
