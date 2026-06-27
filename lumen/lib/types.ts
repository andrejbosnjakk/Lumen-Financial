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
  modelCategorized?: number
  recategorizedDuplicates?: number
  removedExistingDuplicates?: number
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

// ── Subscriptions ────────────────────────────────────────────────────────────
export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type Subscription = {
  description: string
  amount: number
  frequency: Frequency
  monthlyEquivalent: number
  lastCharge: string
  count: number
}

export type ZombieSubscription = Subscription & {
  staleDays: number
  zombieReason: 'overdue' | 'forgotten'
}

// ── Insights ─────────────────────────────────────────────────────────────────
export type InsightType = 'velocity' | 'anomaly' | 'recurring' | 'savings' | 'pattern' | 'largest'
export type InsightTone = 'neutral' | 'positive' | 'warning' | 'danger'

export type Insight = {
  type: InsightType
  title: string
  body: string
  tone: InsightTone
  value?: string
}

// ── Age comparison ────────────────────────────────────────────────────────────
export type AgeComparison = {
  category: string
  userMonthly: number
  benchmarkMonthly: number
  ratio: number
  direction: 'over' | 'under' | 'on-par'
}

// ── Behavioral insights ───────────────────────────────────────────────────────
export type SmallLeaksData = {
  total: number
  count: number
  topCategories: { category: string; total: number; count: number }[]
}

export type CategoryDriftItem = {
  category: string
  currentMonthly: number
  avgMonthly: number
  deltaPct: number
  direction: 'up' | 'down'
}

export type AnnualProjectionItem = {
  category: string
  monthlyAvg: number
  annualProjected: number
}

export type PaydaySplurgeData = {
  avgDailyPostPayday: number
  avgDailyOther: number
  ratio: number
  paydayWindowTotal: number
  otherWindowTotal: number
  paydayWindowDays: number
  otherWindowDays: number
}

export type EssentialRatioMonth = {
  month: string
  essentialTotal: number
  discretionaryTotal: number
  essentialPct: number
}

export type IncomeCandidate = {
  description: string
  avgAmount: number
  count: number
}

export type BehavioralInsightsData = {
  smallLeaks: SmallLeaksData
  categoryDrift: CategoryDriftItem[]
  annualProjection: AnnualProjectionItem[]
  paydaySplurge: PaydaySplurgeData | null
  paydaySalaryDesc: string | null
  incomeCandidates: IncomeCandidate[]
  essentialRatio: EssentialRatioMonth[]
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
