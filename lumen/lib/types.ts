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

export type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  date_of_birth: string | null
  updated_at: string
}

export type BrokerageConnection = {
  id: string
  user_id: string
  broker: 'trading212'
  api_key: string
  api_secret: string
  account_type: 'live' | 'demo'
  created_at: string
}

export type T212Position = {
  ticker: string
  quantity: number
  averagePrice: number
  currentPrice: number
  ppl: number
  fxPpl: number
  initialFillDate: string
  maxSell: number
}

export type T212Cash = {
  blocked: number
  free: number
  invested: number
  pieCash: number
  ppl: number
  result: number
  total: number
}

export type PortfolioData = {
  positions: T212Position[]
  cash: T212Cash
  accountType: 'live' | 'demo'
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
