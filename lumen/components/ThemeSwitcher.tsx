'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'violet' | 'green' | 'amber'
type Mode = 'dark' | 'light'

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

function applyMode(mode: Mode) {
  if (mode === 'light') {
    document.documentElement.dataset.mode = 'light'
  } else {
    document.documentElement.removeAttribute('data-mode')
  }
}

function notifyThemeChange() {
  window.dispatchEvent(new Event('lumen-theme-change'))
}

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>('violet')
  const [mode, setMode] = useState<Mode>('dark')

  useEffect(() => {
    const saved = window.localStorage.getItem('lumen-theme') as Theme | null
    const savedMode = window.localStorage.getItem('lumen-mode') as Mode | null
    const next = saved && THEMES.some((item) => item.key === saved) ? saved : 'violet'
    const nextMode = savedMode === 'light' ? 'light' : 'dark'
    setTheme(next)
    setMode(nextMode)
    applyTheme(next)
    applyMode(nextMode)
    notifyThemeChange()
  }, [])

  function selectTheme(next: Theme) {
    setTheme(next)
    applyTheme(next)
    window.localStorage.setItem('lumen-theme', next)
    notifyThemeChange()
  }

  function selectMode(next: Mode) {
    setMode(next)
    applyMode(next)
    window.localStorage.setItem('lumen-mode', next)
    notifyThemeChange()
  }

  return (
    <div className="lumen-glass rounded-[24px] p-2">
      <div className="hidden px-1 pb-2 text-xs font-semibold text-lumen-muted sm:block">Theme</div>
      <div className="mb-2 grid grid-cols-2 gap-1 rounded-2xl bg-lumen-surface-2 p-1">
        {[
          { key: 'dark' as Mode, label: 'Dark mode', Icon: Moon },
          { key: 'light' as Mode, label: 'Light mode', Icon: Sun },
        ].map(({ key, label, Icon }) => {
          const active = mode === key
          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => selectMode(key)}
              className={`flex h-8 items-center justify-center rounded-xl border transition-colors ${
                active ? 'border-lumen-accent/35 bg-lumen-accent/15 text-lumen-accent' : 'border-transparent text-lumen-muted hover:bg-lumen-fill hover:text-lumen-text'
              }`}
            >
              <Icon size={15} />
            </button>
          )
        })}
      </div>
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
                active ? 'border-lumen-accent/35 bg-lumen-fill' : 'border-transparent hover:bg-lumen-fill'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full ${active ? 'ring-2 ring-lumen-text/70 ring-offset-2 ring-offset-lumen-bg' : ''}`}
                style={{ backgroundColor: item.color }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
