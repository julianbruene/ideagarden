import { createClient } from '@/lib/supabase/server'
import HandwerkClient from './HandwerkClient'

export const dynamic = 'force-dynamic'

export default async function HandwerkPage() {
  const supabase = await createClient()

  const { data: snippets } = await supabase
    .from('craft_snippets')
    .select('*')
    .order('created_at', { ascending: false })

  return <HandwerkClient initialSnippets={snippets ?? []} />
}
