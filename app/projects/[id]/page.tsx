import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectDetailClient from './ProjectDetailClient'
import BookDetailClient from './BookDetailClient'

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

  // Books: load chapters, no inputs
  if (project.kind === 'book') {
    const { data: chapters } = await supabase
      .from('projects')
      .select('*')
      .eq('parent_project_id', id)
      .order('chapter_order', { ascending: true })

    return <BookDetailClient book={project} initialChapters={chapters ?? []} />
  }

  // Single (or chapter): load inputs as before
  const { data: inputs } = await supabase
    .from('inputs')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  return <ProjectDetailClient project={project} initialInputs={inputs ?? []} />
}
