import { createClient } from '@/lib/supabase/server'
import LeitfragenClient from './LeitfragenClient'

export const dynamic = 'force-dynamic'

export default async function LeitfragenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const goalsP = supabase
    .from('goals')
    .select('*')
    .order('updated_at', { ascending: false })

  // Count how many concepts contribute to each goal — surfaced as a chip.
  const countsP = user ? supabase
    .from('concept_goals')
    .select('goal_id')
    .eq('user_id', user.id) : Promise.resolve({ data: [] as { goal_id: string }[] })

  const [{ data: goals }, { data: counts }] = await Promise.all([goalsP, countsP])

  const countMap: Record<string, number> = {}
  for (const row of (counts ?? []) as { goal_id: string }[]) {
    countMap[row.goal_id] = (countMap[row.goal_id] ?? 0) + 1
  }

  return <LeitfragenClient initialGoals={goals ?? []} countMap={countMap} />
}
