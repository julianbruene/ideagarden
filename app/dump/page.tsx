import { createClient } from '@/lib/supabase/server'
import DumpClient from './DumpClient'

export const dynamic = 'force-dynamic'

export default async function DumpPage() {
  const supabase = await createClient()

  const { data: nodes } = await supabase
    .from('nodes')
    .select('*')
    .order('created_at', { ascending: false })

  return <DumpClient initialNodes={nodes ?? []} />
}
