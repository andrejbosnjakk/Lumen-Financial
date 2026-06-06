import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function fmt(amount: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const name = user?.email?.split('@')[0] ?? 'there'

  // Fetch analytics and recent transactions in parallel
  const [analyticsRes, txRes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : 'http://localhost:3000'}/api/analytics`, {
      headers: { cookie: '' },
      cache: 'no-store',
    }).catch(() => null),
    supabase
      .from('transactions')
      .select('id, description, amount, currency, category, completed_date')
      .eq('user_id', user!.id)
      .order('completed_date', { ascending: false })
      .limit(10),
  ])

  // Fetch analytics directly via Supabase to avoid self-calling the API
  const { data: allTxs } = await supabase
    .from('transactions')
    .select('amount, category, description, completed_date')
    .eq('user_id', user!.id)

  const txs = allTxs ?? []
  let totalIncome = 0, totalExpenses = 0
  for (const tx of txs) {
    if (tx.amount > 0) totalIncome += Number(tx.amount)
    else totalExpenses += Math.abs(Number(tx.amount))
  }
  const netSavings = totalIncome - totalExpenses
  const latestBalance = txRes.data?.[0] ? null : null // balance not reliable cross-batch

  const recentTxs = txRes.data ?? []
  const hasData = txs.length > 0

  const stats = [
    { label: 'Total Income', value: fmt(totalIncome), positive: true },
    { label: 'Total Expenses', value: fmt(totalExpenses), positive: false },
    { label: 'Net Savings', value: fmt(netSavings), positive: netSavings >= 0 },
    { label: 'Transactions', value: txs.length.toString(), positive: true },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">
        {getGreeting()}, {name}
      </h1>
      <p className="text-sm text-gray-500 mb-8">Here&apos;s your financial overview</p>

      {!hasData ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
          <p className="text-gray-500 font-medium mb-1">No data yet</p>
          <p className="text-gray-400 text-sm mb-4">Upload a Revolut CSV to see your finances</p>
          <Link
            href="/transactions"
            className="inline-block bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Upload CSV
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(({ label, value, positive }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                <p className={`text-xl font-semibold ${label === 'Net Savings' ? (positive ? 'text-emerald-600' : 'text-red-500') : 'text-gray-900'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Recent transactions */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
              <Link href="/transactions" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                View all →
              </Link>
            </div>
            <table className="w-full">
              <tbody>
                {recentTxs.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-900 max-w-xs truncate">{tx.description}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {new Date(tx.completed_date).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{tx.category}</td>
                    <td className={`px-5 py-3 text-sm font-medium text-right tabular-nums ${Number(tx.amount) >= 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)} {tx.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
