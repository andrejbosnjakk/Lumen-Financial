export default function TransactionsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
      </div>

      <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">No transactions yet — upload a CSV to get started</p>
      </div>
    </div>
  )
}
