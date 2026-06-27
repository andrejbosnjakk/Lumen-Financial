# Lumen — Technical Writeup
### HackDelft 2026 · Revolut AI Challenge

---

## Problem

Consumer financial data is locked in fragmented bank exports. Users who bank across multiple providers have no single view of their spending, investments, and financial health — and the tools that exist either require dangerous open-banking credentials or offer shallow, uncategorized tables with no intelligence layer.

---

## Solution

**Lumen** is a privacy-first financial intelligence platform. Users upload CSV or PDF exports from any major Dutch or European bank, and Lumen automatically parses, normalises, categorises, and visualises their complete financial picture — transactions and investment portfolio in one place, without sharing credentials with any third party.

---

## Architecture

```
Browser (Next.js 14 App Router — RSC + Client Components)
    │
    ├── /api/transactions/ingest     ← CSV normalisation + two-stage categorisation
    ├── /api/transactions/ingest/pdf ← LLM-powered PDF extraction (Claude Haiku)
    ├── /api/portfolio/import        ← IBKR / DEGIRO position ingestion + Yahoo price enrichment
    ├── /api/portfolio/risk          ← Sector & country risk with ETF look-through
    └── /api/analytics               ← Aggregations: by-category, by-month, top merchants
             │
        Supabase (Postgres + Auth + RLS) — EU region
             │
        Anthropic Claude Haiku  ·  Yahoo Finance  ·  Groq (optional)
```

**Auth** is handled entirely by Supabase; every API route re-validates the session server-side. Row Level Security policies at the database layer ensure users can never read each other's data even if API logic were bypassed.

---

## Key Technical Decisions

### 1 · Universal Bank Parser Layer (`lib/parsers/`)
A normalisation library converts raw exports from **10 banks** (Revolut, ING, ABN AMRO, Rabobank, Knab, ASN, SNS, Triodos, bunq, N26) into a single `NormalisedRow` schema before any downstream logic runs. Auto-detection from CSV headers and delimiters routes files to the correct parser without user intervention; a mismatch guard catches user errors (e.g. uploading an ING file after selecting Rabobank).

### 2 · Two-Stage Categorisation
Ingested rows pass through a deterministic rule engine first — 200+ Dutch merchant keywords covering 10 categories. Only rows that fall through to `Uncategorized` are escalated to the ML model, minimising latency and API cost. Users can override any category; corrections are stored and re-applied to future duplicates of the same transaction.

### 3 · LLM-Powered PDF Extraction
Bank PDFs have no standard structure. Rather than maintaining per-bank PDF templates, we extract raw text with `pdf-parse` and prompt **Claude Haiku** to return a structured JSON array of transactions. The model handles multi-column layouts, wrapped descriptions, and mixed currencies in a single pass. Extracted rows then flow through the same normalisation and categorisation pipeline as CSV imports.

### 4 · Portfolio Risk with ETF Look-Through
The `/api/portfolio/risk` endpoint fetches sector and country metadata from Yahoo Finance for every position. For ETFs, it first checks a static inference map (S&P 500 → 100% US, MSCI World → 72% US / 28% other, etc.) to skip expensive recursive network lookups. Unknown ETFs fall back to parallel fetching of their top-25 holdings to derive country weights bottom-up. All metadata is cached server-side for 30 minutes; the client-side result is memoised per ticker set.

### 5 · Performance
- All Yahoo Finance fetches within a request run in **full parallel** (`Promise.all`), not batched loops.
- IBKR ticker strings containing underscores are the only ones sent to the Groq LLM for symbol resolution; plain US tickers are passed through directly, eliminating a 400–800 ms latency spike for typical portfolios.
- A 5-minute in-memory price cache prevents redundant Yahoo calls on page refresh.

---

## Data Model (Supabase)

| Table | Purpose |
|---|---|
| `transactions` | Normalised rows from any bank; `source`, `category`, `import_batch_id` |
| `import_batches` | Per-upload audit record (filename, counts, timestamp) |
| `broker_imports` | Portfolio snapshot metadata (broker, filename, imported_at) |
| `broker_positions` | Individual positions with avg cost, statement price, resolved Yahoo ticker |
| `category_rules` | User-defined keyword → category overrides |
| `user_ai_settings` | Encrypted API keys for optional AI providers (Groq, Claude, OpenAI) |
| `profiles` | First name, last name, phone, date of birth |

---

## Security & Compliance

- **No credential sharing** — users upload their own exports; Lumen never receives bank login details.
- **GDPR-compliant** — Terms of Service and Privacy Policy surfaced at registration with explicit opt-in; right-to-erasure implemented (account deletion wipes all data within 30 days).
- **Session security** — configurable inactivity timeout (15 min default, 24 h with "remember me"); 60-second warning modal before sign-out.
- **RLS at every layer** — API routes verify the Supabase session; database policies re-enforce ownership constraints independently.

---

## Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Recharts |
| Backend | Next.js API Routes (Node.js runtime) |
| Database / Auth | Supabase (PostgreSQL + GoTrue), EU region |
| AI — PDF extraction | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) |
| AI — Financial chat | User-supplied key: Groq / Claude / OpenAI |
| Market data | Yahoo Finance (yahoo-finance2) |
| CSV parsing | PapaParse (client-side, zero server round-trip for CSV) |
| PDF parsing | pdf-parse (server-side text extraction) |
| PDF export | jsPDF + jspdf-autotable |
