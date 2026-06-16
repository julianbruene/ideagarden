import { createClient } from '@/lib/supabase/server'
import QuellenClient from './QuellenClient'

export const dynamic = 'force-dynamic'

export default async function QuellenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sourcesP = supabase
    .from('sources')
    .select('*')
    .order('updated_at', { ascending: false })

  const countsP = user
    ? supabase.from('concepts').select('source_id').eq('user_id', user.id).not('source_id', 'is', null)
    : Promise.resolve({ data: [] as { source_id: string }[] })

  const [{ data: sources }, { data: counts }] = await Promise.all([sourcesP, countsP])

  const countMap: Record<string, number> = {}
  for (const row of (counts ?? []) as { source_id: string }[]) {
    if (row.source_id) countMap[row.source_id] = (countMap[row.source_id] ?? 0) + 1
  }

  return <QuellenClient initialSources={sources ?? []} countMap={countMap} />
}
