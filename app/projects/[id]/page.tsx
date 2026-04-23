import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectDetailClient from './ProjectDetailClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: inputs } = await supabase
    .from('inputs')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  return <ProjectDetailClient project={project} initialInputs={inputs ?? []} />
}
