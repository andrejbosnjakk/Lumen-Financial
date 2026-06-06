import type { AnalyticsData } from './types'

const PREFIX = 'lumen_analytics_'
const TTL_MS = 5 * 60 * 1000 // 5 minutes

type Cached = { data: AnalyticsData; cachedAt: number }

export function getCachedAnalytics(cacheKey: string): AnalyticsData | null {
  try {
    const raw = localStorage.getItem(PREFIX + cacheKey)
    if (!raw) return null
    const parsed: Cached = JSON.parse(raw)
    if (Date.now() - parsed.cachedAt > TTL_MS) {
      localStorage.removeItem(PREFIX + cacheKey)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

export function setCachedAnalytics(cacheKey: string, data: AnalyticsData) {
  try {
    localStorage.setItem(PREFIX + cacheKey, JSON.stringify({ data, cachedAt: Date.now() }))
  } catch {}
}

export function clearAnalyticsCache() {
  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) toRemove.push(k)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {}
}
