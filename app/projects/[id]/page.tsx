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

  // Books: load chapters + book-level notes (Book Dump) + open points
  if (project.kind === 'book') {
    const [{ data: chapters }, { data: allNotes }] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('parent_project_id', id)
        .order('chapter_order', { ascending: true }),
      supabase
        .from('inputs')
        .select('*')
        .eq('project_id', id)
        .eq('is_note', true)
        .order('created_at', { ascending: false }),
    ])

    // Split the single fetch into the two book-level lists.
    const bookNotes = (allNotes ?? []).filter((n) => !n.is_open_point)
    const openPoints = (allNotes ?? []).filter((n) => n.is_open_point)

    return (
      <BookDetailClient
        book={project}
        initialChapters={chapters ?? []}
        initialBookNotes={bookNotes}
        initialOpenPoints={openPoints}
      />
    )
  }

  // Single (or chapter): load inputs as before
  const { data: inputs } = await supabase
    .from('inputs')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  // If this is a chapter, fetch the parent book's title for breadcrumb
  let parentBookTitle: string | null = null
  if (project.parent_project_id) {
    const { data: parent } = await supabase
      .from('projects')
      .select('title')
      .eq('id', project.parent_project_id)
      .single()
    parentBookTitle = parent?.title ?? null
  }

  return (
    <ProjectDetailClient
      project={project}
      initialInputs={inputs ?? []}
      parentBookTitle={parentBookTitle}
    />
  )
}
