# Lumen — AI Context

## What this is
Lumen is a financial intelligence web app for HackDelft 2026. Users upload Revolut CSV exports, transactions are auto-categorized, and they get a clean analytics dashboard.

See the root `CLAUDE.md` for the full project architecture, schema, and judging context.

---

## This package: Next.js 14 App Router

### Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database/Auth:** Supabase (`@supabase/ssr`)
- **Charts:** Recharts
- **CSV parsing:** PapaParse

### File map

```
app/
├── (auth)/              ← No sidebar. login + signup pages.
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (dashboard)/         ← Sidebar layout. All protected routes.
│   ├── layout.tsx       ← Server component. Auth check + renders Sidebar.
│   ├── Sidebar.tsx      ← Client component. Nav + logout.
│   ├── page.tsx         ← Home / dashboard
│   ├── transactions/page.tsx
│   ├── analytics/page.tsx
│   └── account/page.tsx
├── api/
│   ├── transactions/
│   │   ├── route.ts         ← GET (paginated, filterable)
│   │   ├── [id]/route.ts    ← PATCH (category update)
│   │   └── ingest/route.ts  ← POST (CSV ingestion pipeline) ← TODO
│   └── analytics/route.ts   ← GET (aggregations) ← TODO
├── layout.tsx           ← Root layout (font, metadata)
└── globals.css

lib/
├── supabase/
│   ├── client.ts   ← createBrowserClient (use in Client Components)
│   └── server.ts   ← createServerClient (use in Server Components + API routes)
├── categorizer.ts  ← Pure function: categorize(description, customRules)
├── ingester.ts     ← Pure function: parseRow(), validateColumns()
└── types.ts        ← Transaction, ImportBatch, CategoryRule, AnalyticsData

middleware.ts        ← Redirects unauthenticated → /login, authenticated away from auth pages
```

### Auth rules
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. Only the anon key goes in `NEXT_PUBLIC_*`.
- Every API route must call `supabase.auth.getUser()` and return 401 if no user.
- The dashboard layout does a server-side auth check and redirects — middleware is a second layer.
- Use `lib/supabase/client.ts` in `'use client'` components, `lib/supabase/server.ts` everywhere else.

### What's working vs what's stubbed
**Working:** Auth (login, signup, logout, session refresh), sidebar navigation, all GET/PATCH transaction routes, `categorize()`, `parseRow()`.

**Stubbed (TODO):** `POST /api/transactions/ingest`, `GET /api/analytics`, all four dashboard page bodies.

### Env
Copy `.env.local.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Run
```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

### Behavioural guidelines
- Minimum code that solves the problem. No speculative features.
- Touch only what the task requires. Match existing style.
- Every API route must verify auth before touching the DB.
- Keep `lib/categorizer.ts` and `lib/ingester.ts` as pure functions — no DB calls inside them.
- All amounts stored as `numeric` in DB, displayed with 2 decimal places, default currency EUR.
