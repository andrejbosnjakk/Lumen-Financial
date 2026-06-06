'use client'

type Strength = {
  score: number
  label: string
  hint: string
}

export function getPasswordStrength(password: string): Strength {
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (!password) return { score: 0, label: 'No password', hint: 'Use at least 8 characters.' }
  if (score <= 2) return { score, label: 'Weak', hint: 'Add length, numbers, and mixed case.' }
  if (score === 3) return { score, label: 'Good', hint: 'Add a symbol or more characters for extra protection.' }
  if (score === 4) return { score, label: 'Strong', hint: 'This is suitable for the demo account.' }
  return { score, label: 'Excellent', hint: 'Strong password.' }
}

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  const active = Math.min(strength.score, 5)
  const color =
    active <= 2
      ? 'bg-lumen-danger'
      : active === 3
        ? 'bg-lumen-warning'
        : 'bg-lumen-success'

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-5 gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1.5 rounded-full bg-lumen-fill">
            <div className={`h-full rounded-full transition-all ${i < active ? color : 'bg-transparent'}`} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-lumen-text">{strength.label}</span>
        <span className="text-right text-lumen-muted">{strength.hint}</span>
      </div>
    </div>
  )
}
