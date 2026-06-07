export const CATEGORIES = [
  'Groceries',
  'Dining',
  'Transport',
  'Shopping',
  'Subscriptions',
  'Housing',
  'Health',
  'Entertainment',
  'Income',
  'Savings',
  'Transfers',
  'Other',
  'Uncategorized',
] as const

export type Category = typeof CATEGORIES[number]
