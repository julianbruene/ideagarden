import { createClient } from '@/lib/supabase/server'
import LernenClient from './LernenClient'

export const dynamic = 'force-dynamic'

export default async function LernenPage() {
  const supabase = await createClient()

  const { data: concepts } = await supabase
    .from('concepts')
    .select('*')
    .order('updated_at', { ascending: false })

  return <LernenClient initialConcepts={concepts ?? []} />
}
