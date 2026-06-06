export type Transaction = {
  id: string
  user_id: string
  source: string
  type: string
  product: string | null
  started_date: string
  completed_date: string
  description: string
  amount: number
  fee: number
  currency: string
  state: string
  balance_after_transaction: number | null
  category: string
  is_recurring: boolean
  import_batch_id: string | null
  created_at: string
}

export type ImportBatch = {
  id: string
  user_id: string
  filename: string
  imported_count: number
  duplicate_count: number
  created_at: string
}

export type CategoryRule = {
  id: string
  user_id: string
  keyword: string
  category: string
  created_at: string
}

export type IngestResult = {
  imported: number
  duplicates: number
  failed: number
}

export type AnalyticsData = {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  byCategory: Record<string, number>
  byMonth: { month: string; income: number; expenses: number }[]
  topMerchants: { description: string; total: number; count: number }[]
  recurring: Transaction[]
}

export const CATEGORIES = [
  'Groceries',
  'Transport',
  'Subscriptions',
  'Housing',
  'Dining',
  'Health',
  'Income',
  'Savings',
  'Uncategorized',
] as const

export type Category = (typeof CATEGORIES)[number]
