type ModelTransaction = {
  description: string
  amount?: number
  completed_date?: string
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
