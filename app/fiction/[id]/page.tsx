import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import BookDetailClient from '@/app/projects/[id]/BookDetailClient'
import ProjectDetailClient from '@/app/projects/[id]/ProjectDetailClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

// Fiction text detail — reuses the existing project machinery, genre-scoped
// to /fiction. A Roman (kind='book') renders the book layer; a Kurzgeschichte
// or a chapter (kind='single') renders the writing/outline editor.
export default async function FictionDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()
  // Non-fiction belongs in /projects.
  if (project.genre !== 'fiction') redirect(`/projects/${id}`)

  // Roman → book layer
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

  // Kurzgeschichte or chapter → writing/outline editor
  const { data: inputs } = await supabase
    .from('inputs')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

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
