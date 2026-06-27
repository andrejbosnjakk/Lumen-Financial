import { createClient } from '@/lib/supabase/server'
import ConnectBrokerage from './ConnectBrokerage'
import PortfolioView from './PortfolioView'
import ImportedPortfolioView, { AddImportCard } from './ImportedPortfolioView'

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: t212 }, { data: imports }] = await Promise.all([
    supabase.from('brokerage_connections').select('account_type').eq('user_id', user!.id).eq('broker', 'trading212').maybeSingle(),
    supabase.from('broker_imports').select('id, broker').eq('user_id', user!.id),
  ])

  const hasT212    = !!t212
  const hasImports = !!imports && imports.length > 0

  if (!hasT212 && !hasImports) {
    return <ConnectBrokerage />
  }

  return (
    <div className="space-y-10">
      {hasT212 && <PortfolioView accountType={t212!.account_type} />}
      {hasImports && <ImportedPortfolioView />}
      <AddImportCard />
    </div>
  )
}
