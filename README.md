# Lumen

**Financial intelligence from your own bank exports.** Upload a CSV or PDF statement, and Lumen parses, deduplicates and categorises every transaction, then turns it into a spending dashboard, subscription tracker and portfolio view. No bank credentials involved.

Built in a weekend at **HackDelft 2026** for the **Revolut AI Challenge**.

> **Status:** hackathon prototype, no longer hosted. The code is published as-is for reference. See [Security notes](#security-notes) before running it anywhere real.

---

## What it does

- **Multi-bank import.** CSV parsers for Revolut, ING, Rabobank, ABN AMRO and Knab, with bank auto-detection from headers and delimiters. Other banks (ASN, SNS, Triodos, bunq, N26) go through an LLM-based PDF extraction path.
- **Deduplication.** Re-uploading an overlapping export does not double-count. Rows are keyed on date, normalised description and amount.
- **Two-stage categorisation.** A deterministic keyword rule engine runs first. Every row is then scored by a trained neural classifier, which overrides the rule result when its confidence is at least 0.45 (configurable).
- **Analytics.** Spending by category, monthly income vs. expenses, net savings, top merchants, behavioural insights, and an age-group spending benchmark.
- **Subscriptions.** Detects recurring payments from interval regularity, and flags "zombie" subscriptions that look overdue or forgotten.
- **Portfolio.** Imports IBKR and DEGIRO positions or connects to Trading 212. Prices are enriched from Yahoo Finance, with sector and country risk using ETF look-through.
- **Ask your data.** A natural-language chat over your aggregated finances, using your own Groq, Claude or OpenAI key.
- **PDF report export.**

## Architecture

```
Browser ── Next.js 14 (App Router, TypeScript, Tailwind, Recharts)
              │
              ├── API routes ── Supabase (Postgres + Auth + Row Level Security)
              │
              ├── Categoriser service (Python, FastAPI)  ← lumen/services/categorizer
              │     BGE-M3 sentence embeddings + amount/time features → MLP classifier
              │
              └── External: Anthropic (PDF extraction), Yahoo Finance, Groq (optional)
```

### The classifier

- **Input:** a 1024-dimensional [BGE-M3](https://huggingface.co/BAAI/bge-m3) embedding of the merchant description, plus 7 hand-built features: amount, log-amount, sign, and cyclical day-of-week and month encodings.
- **Network:** an MLP, 1031 → 512 → 256 → 41 classes, with GELU, LayerNorm and dropout.
- **Training:** offline on a ~1M-row synthetic Dutch transaction dataset. At inference only fields present in a real bank export are used: no enrichment.
- **Checkpoint:** `lumen/services/categorizer/params.pt` (2.6 MB).

More detail is in [`docs/TECHNICAL_WRITEUP.md`](docs/TECHNICAL_WRITEUP.md). Notes on Dutch bank export formats are in [`docs/bank-csv-formats.md`](docs/bank-csv-formats.md).

## Repository layout

```
lumen/                    Next.js app (frontend + API routes)
  app/(auth)              login, signup
  app/(dashboard)         dashboard, transactions, analytics, portfolio, account
  app/(legal)             terms, privacy (hackathon drafts)
  app/api                 ingest, analytics, insights, subscriptions, portfolio, profile
  lib/parsers             per-bank CSV parsers + auto-detection
  lib/categorizer.ts      rule-based first pass
  lib/mlCategorizer.ts    client for the Python categoriser
  services/categorizer    FastAPI service + model checkpoint
  examples/               synthetic sample export for trying the app
supabase/schema.sql       database schema with RLS policies
scripts/                  data-generation helpers
docs/                     technical write-up, bank format notes
```

## Running it locally

**Requirements:** Node 18+, Python 3.10+, and a free [Supabase](https://supabase.com) project.

```bash
# 1. Database: paste supabase/schema.sql into the Supabase SQL editor and run it.

# 2. App
cd lumen
cp .env.local.example .env.local      # fill in your Supabase URL + anon key
npm install

# 3. Categoriser (optional; the app falls back to rules only if it is not running)
python -m venv services/categorizer/.venv
source services/categorizer/.venv/bin/activate   # Windows: services\categorizer\.venv\Scripts\Activate.ps1
pip install -r services/categorizer/requirements.txt

# 4. Run both
npm run demo          # builds, then starts Next.js on :3000 and the categoriser on :8001
# or, for development:  npm run dev   (and `npm run categorizer` in a second terminal)
```

Sign up at `http://localhost:3000`, then upload `lumen/examples/sample-revolut.csv` to see the pipeline end to end. The sample is synthetic data.

The first categoriser request downloads BGE-M3 (~2 GB) and loads it into memory, so expect a slow first import.

## Security notes

This was built in a hackathon and was not hardened for production:

- **API keys are stored unencrypted.** User-supplied AI provider keys and Trading 212 keys sit in plain text in Postgres. Row Level Security limits each row to its owner, but there is no application-level encryption.
- **The legal pages are drafts.** The terms and privacy pages were written for the demo and have not been reviewed by a lawyer.
- **The categoriser has no authentication.** Bind it to localhost only, as the default config does.

## Team

- **Andrej Bosnjak**
- **Daniel Koynov**
- **Olle Berg**

Built at HackDelft 2026.

## License

[MIT](LICENSE)
