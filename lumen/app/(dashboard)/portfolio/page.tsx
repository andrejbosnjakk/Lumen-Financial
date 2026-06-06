import { createClient } from '@/lib/supabase/server'
import ConnectBrokerage from './ConnectBrokerage'
import PortfolioView from './PortfolioView'

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: connection } = await supabase
    .from('brokerage_connections')
    .select('account_type')
    .eq('user_id', user!.id)
    .eq('broker', 'trading212')
    .maybeSingle()

  if (!connection) {
    return <ConnectBrokerage />
  }

  return <PortfolioView accountType={connection.account_type} />
}
