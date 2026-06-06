'use client'

import { useEffect, useState } from 'react'

type Theme = 'violet' | 'green' | 'amber'

const THEMES: { key: Theme; label: string; color: string }[] = [
  { key: 'violet', label: 'Violet', color: '#6C63FF' },
  { key: 'green', label: 'Green', color: '#00A669' },
  { key: 'amber', label: 'Amber', color: '#FFB020' },
]

function applyTheme(theme: Theme) {
  if (theme === 'violet') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.dataset.theme = theme
  }
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('violet')

  useEffect(() => {
    const saved = window.localStorage.getItem('lumen-theme') as Theme | null
    const next = saved && THEMES.some((item) => item.key === saved) ? saved : 'violet'
    setTheme(next)
    applyTheme(next)
  }, [])

  function selectTheme(next: Theme) {
    setTheme(next)
    applyTheme(next)
    window.localStorage.setItem('lumen-theme', next)
  }

  return (
    <div className="lumen-glass rounded-[24px] p-2">
      <div className="hidden px-1 pb-2 text-xs font-semibold text-lumen-muted sm:block">Theme</div>
      <div className="grid gap-1 sm:grid-cols-3">
        {THEMES.map((item) => {
          const active = theme === item.key
          return (
            <button
              key={item.key}
              type="button"
              aria-label={`${item.label} theme`}
              title={`${item.label} theme`}
              onClick={() => selectTheme(item.key)}
              className={`flex h-9 items-center justify-center rounded-2xl border transition-colors ${
                active ? 'border-white/25 bg-white/[0.09]' : 'border-transparent hover:bg-white/[0.06]'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full ${active ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-lumen-bg' : ''}`}
                style={{ backgroundColor: item.color }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
