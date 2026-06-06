import type { CategoryRule } from './types'

const DEFAULT_RULES: Record<string, string[]> = {
  Groceries: ['albert heijn', 'lidl', 'jumbo', 'aldi', 'plus supermarkt', 'dirk'],
  Transport: ['ns ', 'ovpay', 'ov-chipkaart', 'gvb', 'ret ', 'htm ', '9292', 'uber', 'bolt'],
  Subscriptions: ['spotify', 'netflix', 'chatgpt', 'openai', 'apple.com', 'google one', 'disney', 'amazon prime'],
  Housing: ['rent', 'huur', 'landlord', 'hypotheek'],
  Dining: ["mcdonald's", 'thuisbezorgd', 'uber eats', 'deliveroo', "domino's", 'just eat'],
  Health: ['apotheek', 'pharmacy', 'huisarts', 'tandarts', 'gym', 'fitness'],
  Income: ['salary', 'salaris', 'payroll', 'loon', 'wage'],
  Savings: ['savings', 'sparen'],
}

export function categorize(
  description: string,
  customRules: Pick<CategoryRule, 'keyword' | 'category'>[] = []
): string {
  const lower = description.toLowerCase()

  for (const rule of customRules) {
    if (lower.includes(rule.keyword.toLowerCase())) return rule.category
  }

  for (const [category, keywords] of Object.entries(DEFAULT_RULES)) {
    if (keywords.some((k) => lower.includes(k))) return category
  }

  return 'Uncategorized'
}
