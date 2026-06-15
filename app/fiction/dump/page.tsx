import { createClient } from '@/lib/supabase/server'
import FictionDumpClient from './FictionDumpClient'

export const dynamic = 'force-dynamic'

export default async function FictionDumpPage() {
  const supabase = await createClient()

  const { data: nodes } = await supabase
    .from('nodes')
    .select('*')
    .eq('promoted', false)
    .eq('genre', 'fiction')
    .order('created_at', { ascending: false })

  return <FictionDumpClient initialNodes={nodes ?? []} />
}
