const PALETTE = [
  { bg: 'rgba(99,102,241,0.16)', text: '#A5B4FC', border: 'rgba(99,102,241,0.24)' },
  { bg: 'rgba(14,165,233,0.16)', text: '#7DD3FC', border: 'rgba(14,165,233,0.24)' },
  { bg: 'rgba(16,185,129,0.15)', text: '#6EE7B7', border: 'rgba(16,185,129,0.24)' },
  { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', border: 'rgba(245,158,11,0.24)' },
  { bg: 'rgba(249,115,22,0.15)', text: '#FDBA74', border: 'rgba(249,115,22,0.24)' },
  { bg: 'rgba(236,72,153,0.15)', text: '#F9A8D4', border: 'rgba(236,72,153,0.24)' },
  { bg: 'rgba(168,85,247,0.16)', text: '#D8B4FE', border: 'rgba(168,85,247,0.25)' },
  { bg: 'rgba(20,184,166,0.15)', text: '#5EEAD4', border: 'rgba(20,184,166,0.24)' },
  { bg: 'rgba(239,68,68,0.14)', text: '#FCA5A5', border: 'rgba(239,68,68,0.23)' },
  { bg: 'rgba(132,204,22,0.14)', text: '#BEF264', border: 'rgba(132,204,22,0.23)' },
]

const FALLBACK = {
  bg: 'rgba(107,114,128,0.12)',
  text: '#9CA3AF',
  border: 'rgba(107,114,128,0.18)',
}

export function categoryColor(category: string | null | undefined) {
  if (!category || category === 'Uncategorized') return FALLBACK

  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) | 0
  }

  return PALETTE[Math.abs(hash) % PALETTE.length]
}
