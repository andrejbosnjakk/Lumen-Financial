type ModelTransaction = {
  description: string
  amount?: number
}

export type ModelPrediction = {
  category: string
  confidence: number
  top3?: { category: string; confidence: number }[]
}

const DEFAULT_CATEGORIZER_URL = 'http://127.0.0.1:8001'

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => clearTimeout(timeout) }
}

export async function predictCategories(
  transactions: ModelTransaction[],
  options: { timeoutMs?: number; topK?: 1 | 3 } = {}
): Promise<ModelPrediction[]> {
  if (transactions.length === 0) return []

  const baseUrl = process.env.CATEGORIZER_URL ?? DEFAULT_CATEGORIZER_URL
  const { signal, clear } = timeoutSignal(options.timeoutMs ?? 120000)

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/predict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        transactions,
        top_k: options.topK ?? 1,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Categorizer returned ${response.status}`)
    }

    const data = (await response.json()) as { predictions?: ModelPrediction[] }
    return Array.isArray(data.predictions) ? data.predictions : []
  } finally {
    clear()
  }
}

export function modelConfidenceThreshold() {
  const parsed = Number(process.env.CATEGORIZER_CONFIDENCE_THRESHOLD)
  return Number.isFinite(parsed) ? parsed : 0.45
}

export function mapModelCategory(label: string, description: string, amount?: number) {
  const text = `${label} ${description}`.toLowerCase()

  if (amount !== undefined && amount > 0 && /(salary|payroll|income|wage|dividend|refund|reversal)/.test(text)) {
    return 'Income'
  }

  if (/(grocery|supermarket|food store|albert heijn|jumbo|lidl|aldi|picnic)/.test(text)) {
    return 'Groceries'
  }

  if (/(commuter|transport|rail|bus|taxi|parking|fuel|airline|ovpay|ns |train|metro|tram)/.test(text)) {
    return 'Transport'
  }

  if (/(restaurant|dining|cafe|bar|fast food|takeaway|coffee|bakery|hangout|thuisbezorgd)/.test(text)) {
    return 'Dining'
  }

  if (/(rent|mortgage|utilities|electric|gas|water|telecom|internet|housing|landlord)/.test(text)) {
    return 'Housing'
  }

  if (/(pharmacy|drug store|medical|health|doctor|dentist|hospital|fitness|sport|gym)/.test(text)) {
    return 'Health'
  }

  if (/(computer and data|digital goods|streaming|subscription|recurring|software|vpn|spotify|netflix|openai|adobe|github|mullvad)/.test(text)) {
    return 'Subscriptions'
  }

  if (/(savings|investment|brokerage|trading|securities|etf|deposit)/.test(text)) {
    return 'Savings'
  }

  if (/(transfer|payment service|paypal|wise|tikkie|bunq|revolut)/.test(text)) {
    return 'Transfers'
  }

  if (/(department|retail|clothing|electronics|merchandise|shopping|amazon|bol.com|coolblue)/.test(text)) {
    return 'Shopping'
  }

  return label || 'Uncategorized'
}
