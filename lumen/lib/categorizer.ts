import type { CategoryRule } from './types'

const DEFAULT_RULES: Record<string, string[]> = {
  Groceries: [
    'albert heijn', 'ah to go', 'lidl', 'jumbo', 'aldi', 'plus supermarkt', 'dirk',
    'dekamarkt', 'spar ', 'coop ', 'hoogvliet', 'picnic', 'ekoplaza',
  ],
  Transport: [
    'ns ', 'ovpay', 'ov-chipkaart', 'ov chipkaart', 'gvb', 'ret ', 'htm ',
    '9292', 'connexxion', 'arriva', 'qbuzz', 'transavia', 'klm', 'ryanair',
    'easyjet', 'flixbus', 'blablacar', 'sixt', 'europcar', 'greenwheels',
    'felyx', 'check ', 'lime ', 'tier ', 'dott ',
  ],
  Subscriptions: [
    'spotify', 'netflix', 'chatgpt', 'openai', 'apple.com', 'apple subscription',
    'google one', 'google storage', 'disney+', 'amazon prime', 'hbo max',
    'videoland', 'adobe', 'microsoft 365', 'github', 'dropbox', 'notion',
    'figma', 'canva', 'nlziet', 'npo plus',
  ],
  Housing: [
    'rent', 'huur', 'landlord', 'hypotheek', 'woning', 'vastgoed',
    'energie', 'eneco', 'vattenfall', 'nuon', 'essent', 'greenchoice',
    'oxxio', 'internet', 'ziggo', 'kpn ', 'odido', 't-mobile thuis',
    'waternet', 'watermaatschappij',
  ],
  Dining: [
    "mcdonald's", 'mcdonalds', 'thuisbezorgd', 'uber eats', 'deliveroo',
    "domino's", 'just eat', 'pizza', 'burger', 'kfc ', 'subway ', 'febo',
    'hangout', 'cafe ', 'restaurant', 'eetcafe', 'brasserie', 'bistro',
    'snackbar', 'broodje', 'kebab', 'sushi', 'wok ', 'chinees',
    'grieks', 'turks', 'italiaans', 'starbucks', 'costa coffee',
  ],
  Health: [
    'apotheek', 'pharmacy', 'huisarts', 'tandarts', 'dokter', 'hospital',
    'ziekenhuis', 'fysiotherap', 'optician', 'opticien', 'etos', 'kruidvat',
    'da drogist', 'gym', 'fitness', 'sportcentr', 'sport ', 'zwembad',
    'sporthal', 'squash', 'tennis', 'padel', 'climbing', 'bck ',
    'basic-fit', 'jansen fitness', 'spinning',
  ],
  Income: [
    'salary', 'salaris', 'payroll', 'loon', 'wage', 'inkomen',
    'uitkering', 'pgb ', 'toelage', 'dividend',
  ],
  Savings: ['savings', 'sparen', 'deposito', 'belegging'],
  Shopping: [
    'amazon', 'bol.com', 'coolblue', 'mediamarkt', 'hm ', 'h&m',
    'zara', 'primark', 'uniqlo', 'nike', 'adidas', 'zalando',
    'wehkamp', 'about you', 'ikea', 'action ', 'blokker', 'hema',
    'bijenkorf', 'asos', 'shein',
  ],
  Transfers: [
    'transfer to', 'transfer from', 'overboeking', 'betaling aan',
    'betaling van', 'tikkie', 'paypal', 'bunq', 'wise',
  ],
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
