# HackDelft 2026 — Revolut AI Challenge

## Project Overview
AI-powered financial intelligence app. Takes raw Revolut CSV exports, categorizes transactions with a trained ML model, and delivers financial insights/advice.

## Architecture

**Core principle:** No data enrichment at inference time. Model trained offline on 1M-row synthetic Dutch dataset (MCC codes, entry_method, card_location, merchant_country). At inference time receives only real Revolut CSV fields: `description`, `amount`, `type`, `date`.

**Monorepo layout:**
```
/frontend   React + TypeScript + Tailwind + Supabase JS + Recharts
/backend    Node.js + Express + TypeScript
/python     Python microservice (categorization model — runs on VPS)
```

**Data flow:**
- Frontend → Supabase directly (reads, auth)
- Frontend → Node API → Python microservice → Supabase (CSV upload + categorization write path only)

## Tech Stack
- Frontend: React + TypeScript + Tailwind CSS (Vite)
- Backend: Node.js (Express + TypeScript)
- Database: Supabase (Postgres + Auth + RLS + auto-REST)
- Categorization: Python microservice on VPS, called via HTTP
- Deployment: VPS

## Supabase Schema

```sql
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  description     TEXT NOT NULL,
  amount          NUMERIC(12,2),
  fee             NUMERIC(12,2),
  currency        TEXT,
  state           TEXT,
  balance         NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categorizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id      UUID REFERENCES transactions(id) ON DELETE CASCADE,
  category            TEXT,
  confidence          FLOAT,
  is_user_corrected   BOOLEAN DEFAULT FALSE,
  corrected_category  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user owns transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user owns categorizations" ON categorizations
  FOR ALL USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );
```

## Key API Endpoint

```
POST /api/upload
- accepts multipart CSV
- parses rows (csv-parse)
- bulk inserts to transactions table via Supabase JS client
- calls Python microservice POST http://vps/categorize for each batch
- writes categorization results back to categorizations table
- returns transaction IDs
```

## Real Revolut CSV Columns
`Type, Product, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance`

Column mapping:
- `Type` → `type`
- `Started Date` → `started_at`
- `Completed Date` → `completed_at`
- `Description` → `description`
- `Amount` → `amount`
- `Fee` → `fee`
- `Currency` → `currency`
- `State` → `state`
- `Balance` → `balance`

## Category Taxonomy
Groceries, Restaurants & Food, Transport, Entertainment, Utilities, Subscriptions, Healthcare, Fitness, Shopping, Savings, Income, Transfers, Other

## Key Differentiator
Two-stage categorization:
1. Rule-based for obvious merchants (Albert Heijn → Groceries, OVpay → Transport)
2. LLM only for ambiguous cases

User correction feedback loop stored in `corrected_category` field.

## Environment Variables

Backend `.env`:
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
CATEGORIZATION_SERVICE_URL=
PORT=3001
```

Frontend `.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Judging Criteria
- Technical Depth & Creativity: 40%
- Business Impact & Feasibility: 30%
- UX Design: 20%
- Presentation: 10%

## TODO maintenance
- After every `git pull` or merge that brings in new code, review `TODO.md` and update it to reflect completed tasks, newly surfaced work, or changed priorities before doing anything else.

## graphify
- Run `/graphify .` after scaffolding to build the knowledge graph for token-efficient codebase queries.
- `graphify-out/graph.html` opens in browser, `graph.json` is used for future session queries.
