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

  // Linked concepts (undirected)
  const [{ data: outgoing }, { data: incoming }] = await Promise.all([
    supabase.from('concept_links').select('to_id').eq('from_id', id).eq('user_id', user.id),
    supabase.from('concept_links').select('from_id').eq('to_id', id).eq('user_id', user.id),
  ])
  const linkedIds = Array.from(new Set<string>([
    ...(outgoing ?? []).map((r) => r.to_id),
    ...(incoming ?? []).map((r) => r.from_id),
  ]))

  let linked: LinkedConcept[] = []
  if (linkedIds.length > 0) {
    const { data } = await supabase
      .from('concepts')
      .select('id, title, summary')
      .in('id', linkedIds)
    linked = (data ?? []) as LinkedConcept[]
  }

  // All other concepts (for the link picker) — minimal fields
  const { data: allOthers } = await supabase
    .from('concepts')
    .select('id, title, summary')
    .neq('id', id)
    .order('updated_at', { ascending: false })

  return (
    <ConceptClient
      initialConcept={concept}
      initialLinked={linked}
      allOthers={(allOthers ?? []) as LinkedConcept[]}
    />
  )
}
