import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ConceptClient, { type LinkedConcept } from './ConceptClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConceptPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: concept } = await supabase
    .from('concepts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!concept) notFound()

  // Linked concepts (undirected) — collect per-link notes as a map
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase.from('concept_links').select('to_id, note').eq('from_id', id).eq('user_id', user.id),
    supabase.from('concept_links').select('from_id, note').eq('to_id', id).eq('user_id', user.id),
  ])
  const noteByOther = new Map<string, string | null>()
  for (const row of outgoing ?? []) noteByOther.set(row.to_id, row.note ?? null)
  for (const row of incoming ?? []) noteByOther.set(row.from_id, row.note ?? null)
  const linkedIds = Array.from(noteByOther.keys())

  let linked: LinkedConcept[] = []
  if (linkedIds.length > 0) {
    const { data } = await supabase
      .from('concepts')
      .select('id, title, summary')
      .in('id', linkedIds)
    linked = (data ?? []).map((c) => ({
      ...c,
      note: noteByOther.get(c.id) ?? null,
    })) as LinkedConcept[]
  }

  // All other concepts (for the link picker) — minimal fields
  const { data: allOthers } = await supabase
    .from('concepts')
    .select('id, title, summary')
    .neq('id', id)
    .order('updated_at', { ascending: false })

  // Goals already linked to this concept (with reflections)
  const { data: goalPairs } = await supabase
    .from('concept_goals')
    .select('goal_id, reflection')
    .eq('concept_id', id)
    .eq('user_id', user.id)

  const linkedGoalIds = (goalPairs ?? []).map((p) => p.goal_id)
  let linkedGoals: { id: string; title: string | null; description: string | null; reflection: string | null }[] = []
  if (linkedGoalIds.length > 0) {
    const { data: goalRows } = await supabase
      .from('goals')
      .select('id, title, description')
      .in('id', linkedGoalIds)
    const reflectionByGoal = new Map((goalPairs ?? []).map((p) => [p.goal_id, p.reflection as string | null]))
    linkedGoals = (goalRows ?? []).map((g) => ({
      ...g,
      reflection: reflectionByGoal.get(g.id) ?? null,
    }))
  }

  // All goals for the picker
  const { data: allGoalsRaw } = await supabase
    .from('goals')
    .select('id, title, description')
    .order('updated_at', { ascending: false })
  const allGoals = (allGoalsRaw ?? []) as { id: string; title: string | null; description: string | null }[]

  // Sources — the linked one (if any) + all for the picker
  const { data: allSourcesRaw } = await supabase
    .from('sources')
    .select('id, title, author, type')
    .order('updated_at', { ascending: false })
  const allSources = (allSourcesRaw ?? []) as { id: string; title: string | null; author: string | null; type: string }[]
  const linkedSource = concept.source_id
    ? allSources.find((s) => s.id === concept.source_id) ?? null
    : null

  return (
    <ConceptClient
      initialConcept={concept}
      initialLinked={linked}
      allOthers={(allOthers ?? []) as LinkedConcept[]}
      initialLinkedGoals={linkedGoals}
      allGoals={allGoals}
      allSources={allSources}
      initialLinkedSource={linkedSource}
    />
  )
}
