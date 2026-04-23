import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import WriteClient from './WriteClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function WritePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()

  // Only load notes (is_note = true) for the side panel reference
  const { data: notes } = await supabase
    .from('inputs')
    .select('*')
    .eq('project_id', id)
    .eq('is_note', true)
    .order('created_at', { ascending: true })

  return <WriteClient project={project} notes={notes ?? []} />
}
