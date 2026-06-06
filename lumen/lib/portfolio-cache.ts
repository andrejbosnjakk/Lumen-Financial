import type { PortfolioData } from './types'

const CACHE_TTL_MS = 60_000

// Stored on `global` so HMR reloads in development don't wipe the cache
const g = global as typeof globalThis & {
  _portfolioCache?: Map<string, { data: PortfolioData; expiresAt: number }>
}
if (!g._portfolioCache) g._portfolioCache = new Map()
const cache = g._portfolioCache

export function getPortfolioCache(userId: string): PortfolioData | null {
  const entry = cache.get(userId)
  if (entry && entry.expiresAt > Date.now()) return entry.data
  return null
}

export function setPortfolioCache(userId: string, data: PortfolioData): void {
  cache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

export function getStalePorfolioCache(userId: string): PortfolioData | null {
  return cache.get(userId)?.data ?? null
}
