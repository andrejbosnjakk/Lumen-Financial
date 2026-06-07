const PALETTE = [
  { bg: 'rgba(99,102,241,0.16)', text: '#A5B4FC', border: 'rgba(99,102,241,0.28)' },
  { bg: 'rgba(59,130,246,0.16)', text: '#93C5FD', border: 'rgba(59,130,246,0.28)' },
  { bg: 'rgba(14,165,233,0.16)', text: '#7DD3FC', border: 'rgba(14,165,233,0.28)' },
  { bg: 'rgba(6,182,212,0.15)', text: '#67E8F9', border: 'rgba(6,182,212,0.27)' },
  { bg: 'rgba(20,184,166,0.15)', text: '#5EEAD4', border: 'rgba(20,184,166,0.27)' },
  { bg: 'rgba(16,185,129,0.15)', text: '#6EE7B7', border: 'rgba(16,185,129,0.27)' },
  { bg: 'rgba(34,197,94,0.14)', text: '#86EFAC', border: 'rgba(34,197,94,0.25)' },
  { bg: 'rgba(132,204,22,0.14)', text: '#BEF264', border: 'rgba(132,204,22,0.25)' },
  { bg: 'rgba(234,179,8,0.15)', text: '#FDE047', border: 'rgba(234,179,8,0.27)' },
  { bg: 'rgba(245,158,11,0.15)', text: '#FCD34D', border: 'rgba(245,158,11,0.27)' },
  { bg: 'rgba(249,115,22,0.15)', text: '#FDBA74', border: 'rgba(249,115,22,0.27)' },
  { bg: 'rgba(239,68,68,0.14)', text: '#FCA5A5', border: 'rgba(239,68,68,0.25)' },
  { bg: 'rgba(244,63,94,0.14)', text: '#FDA4AF', border: 'rgba(244,63,94,0.25)' },
  { bg: 'rgba(236,72,153,0.15)', text: '#F9A8D4', border: 'rgba(236,72,153,0.27)' },
  { bg: 'rgba(217,70,239,0.15)', text: '#F0ABFC', border: 'rgba(217,70,239,0.27)' },
  { bg: 'rgba(168,85,247,0.16)', text: '#D8B4FE', border: 'rgba(168,85,247,0.28)' },
  { bg: 'rgba(139,92,246,0.16)', text: '#C4B5FD', border: 'rgba(139,92,246,0.28)' },
  { bg: 'rgba(124,58,237,0.15)', text: '#DDD6FE', border: 'rgba(124,58,237,0.26)' },
  { bg: 'rgba(45,212,191,0.13)', text: '#99F6E4', border: 'rgba(45,212,191,0.24)' },
  { bg: 'rgba(125,211,252,0.13)', text: '#BAE6FD', border: 'rgba(125,211,252,0.23)' },
  { bg: 'rgba(190,242,100,0.12)', text: '#D9F99D', border: 'rgba(190,242,100,0.22)' },
  { bg: 'rgba(253,186,116,0.13)', text: '#FED7AA', border: 'rgba(253,186,116,0.23)' },
  { bg: 'rgba(252,165,165,0.12)', text: '#FECACA', border: 'rgba(252,165,165,0.22)' },
  { bg: 'rgba(216,180,254,0.13)', text: '#E9D5FF', border: 'rgba(216,180,254,0.24)' },
]

const FALLBACK = {
  bg: 'rgba(107,114,128,0.12)',
  text: '#9CA3AF',
  border: 'rgba(107,114,128,0.18)',
}

export function categoryColor(category: string | null | undefined) {
  if (!category || category === 'Uncategorized') return FALLBACK

  const normalized = category
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  let hash = 2166136261
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  hash ^= normalized.length

  return PALETTE[(hash >>> 0) % PALETTE.length]
}
