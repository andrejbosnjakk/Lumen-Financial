# Lumen

Financial intelligence for your Revolut data. Upload a CSV, get automatic categorization and a spending dashboard.

Built for HackDelft 2026 — Revolut AI Challenge.

---

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Set up environment**
```bash
cp .env.local.example .env.local
```
Fill in your Supabase project URL and anon key. Ask a teammate for these or find them in the Supabase dashboard under Project Settings → API.

**3. Run the database migrations**

Run the SQL in `../supabase/schema.sql` against your Supabase project (SQL editor in the Supabase dashboard).

**4. Start the dev server**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

---

## Project structure

```
app/
├── (auth)/          login, signup — no sidebar
├── (dashboard)/     all protected pages — sidebar layout
│   ├── page.tsx         home / dashboard
│   ├── transactions/    transaction table
│   ├── analytics/       charts
│   └── account/         profile + import history
├── api/
│   ├── transactions/    GET (list), PATCH (update category)
│   │   └── ingest/      POST (CSV upload pipeline)
│   └── analytics/       GET (aggregations)
└── layout.tsx       root layout

lib/
├── supabase/        client.ts (browser), server.ts (server/API)
├── categorizer.ts   keyword → category matching
├── ingester.ts      Revolut CSV row parser
└── types.ts         shared TypeScript types

middleware.ts        auth redirect guard
```

---

## Contributing

Read `CLAUDE.md` in this directory before making changes — it covers auth rules, what's stubbed vs working, and coding conventions.

Stack: Next.js 14 · TypeScript · Tailwind · Supabase · Recharts · PapaParse
