import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GoalClient, { type ReaderItem } from './GoalClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function GoalDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!goal) notFound()

  // All concept-goal pairs for this goal, newest reflection first
  const { data: pairs } = await supabase
    .from('concept_goals')
    .select('concept_id, reflection, updated_at')
    .eq('goal_id', id)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const conceptIds = (pairs ?? []).map((p) => p.concept_id)
  let concepts: { id: string; title: string | null; summary: string | null }[] = []
  if (conceptIds.length > 0) {
    const { data } = await supabase
      .from('concepts')
      .select('id, title, summary')
      .in('id', conceptIds)
    concepts = data ?? []
  }

  const conceptMap = new Map(concepts.map((c) => [c.id, c]))
  const reader: ReaderItem[] = (pairs ?? [])
    .map((p) => {
      const concept = conceptMap.get(p.concept_id)
      if (!concept) return null
      return {
        concept,
        reflection: p.reflection,
        updated_at: p.updated_at,
      }
    })
    .filter((r): r is ReaderItem => r !== null)

  return <GoalClient initialGoal={goal} initialReader={reader} />
}
