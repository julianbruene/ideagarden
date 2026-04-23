import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Returns active ideas + projects for pickers (e.g. the mirror picker)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: ideas }, { data: projects }] = await Promise.all([
    supabase
      .from('ideas')
      .select('id, title, synthesis')
      .eq('status', 'growing')
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, title, synthesis')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    ideas: ideas ?? [],
    projects: projects ?? [],
  })
}
