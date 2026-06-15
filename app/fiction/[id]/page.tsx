import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import BookDetailClient from '@/app/projects/[id]/BookDetailClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

// Fiction novel detail — reuses the book layer (chapters, Book Dump,
// open points) with genre-aware labels. A novel is a project with
// kind='book' and genre='fiction'.
export default async function NovelDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()
  // A non-fiction book opened here belongs in /projects — redirect.
  if (project.genre !== 'fiction' || project.kind !== 'book') {
    redirect(`/projects/${id}`)
  }

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
