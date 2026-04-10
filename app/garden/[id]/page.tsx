import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import IdeaDetailClient from './IdeaDetailClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function IdeaDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: idea } = await supabase
    .from('ideas')
    .select('*')
    .eq('id', id)
    .single()

  if (!idea) notFound()

  const { data: inputs } = await supabase
    .from('inputs')
    .select('*')
    .eq('idea_id', id)
    .order('created_at', { ascending: true })

  return <IdeaDetailClient idea={idea} initialInputs={inputs ?? []} />
}
