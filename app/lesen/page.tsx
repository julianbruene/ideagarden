import { createClient } from '@/lib/supabase/server'
import LesenClient from './LesenClient'

export const dynamic = 'force-dynamic'

export default async function LesenPage() {
  const supabase = await createClient()

  const [{ data: posts }, { data: sources }] = await Promise.all([
    supabase
      .from('feed_posts')
      .select('*')
      .neq('status', 'archived')
      .order('published_at', { ascending: false, nullsFirst: false }),
    supabase
      .from('sources')
      .select('id, title, author')
      .order('updated_at', { ascending: false }),
  ])

  return <LesenClient initialPosts={posts ?? []} sources={sources ?? []} />
}
