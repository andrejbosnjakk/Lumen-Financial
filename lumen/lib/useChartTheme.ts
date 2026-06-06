'use client'

import { useCallback, useEffect, useState } from 'react'

export type ChartTheme = {
  grid: string
  axis: string
  reference: string
  cursor: string
  tooltip: {
    bg: string
    border: string
    text: string
  }
}

const fallback: ChartTheme = {
  grid: 'rgba(247, 246, 242, 0.08)',
  axis: '#6B7280',
  reference: 'rgba(247, 246, 242, 0.18)',
  cursor: 'rgba(255, 255, 255, 0.04)',
  tooltip: {
    bg: '#141622',
    border: 'rgba(247, 246, 242, 0.1)',
    text: '#F7F6F2',
  },
}

function readChartTheme(): ChartTheme {
  if (typeof window === 'undefined') return fallback

  const styles = window.getComputedStyle(document.documentElement)
  const read = (name: string, defaultValue: string) => styles.getPropertyValue(name).trim() || defaultValue
  const textRgb = read('--lumen-text-rgb', '247 246 242').replace(/\s+/g, ', ')

  return {
    grid: read('--lumen-chart-grid', fallback.grid),
    axis: read('--lumen-chart-axis', fallback.axis),
    reference: read('--lumen-chart-reference', fallback.reference),
    cursor: read('--lumen-chart-cursor', fallback.cursor),
    tooltip: {
      bg: read('--lumen-chart-tip-bg', fallback.tooltip.bg),
      border: read('--lumen-chart-tip-border', fallback.tooltip.border),
      text: `rgb(${textRgb})`,
    },
  }
}

export function useChartTheme() {
  const [theme, setTheme] = useState<ChartTheme>(fallback)
  const refresh = useCallback(() => setTheme(readChartTheme()), [])

  useEffect(() => {
    refresh()
    window.addEventListener('lumen-theme-change', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('lumen-theme-change', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  return theme
}
