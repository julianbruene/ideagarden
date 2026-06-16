import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SourceClient, { type LinkedConceptLite } from './SourceClient'
import type { SourceNote } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SourceDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: source } = await supabase
    .from('sources')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!source) notFound()

  const [{ data: notes }, { data: concepts }] = await Promise.all([
    supabase.from('source_notes').select('*').eq('source_id', id).eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('concepts').select('id, title, summary').eq('source_id', id).eq('user_id', user.id).order('updated_at', { ascending: false }),
  ])

  return (
    <SourceClient
      initialSource={source}
      initialNotes={(notes ?? []) as SourceNote[]}
      initialConcepts={(concepts ?? []) as LinkedConceptLite[]}
    />
  )
}
