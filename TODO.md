# HackDelft TODO

- [x] **Revolut-style glass dashboard pass** - dashboard home refocused around a dense account panel, compact action pills, integrated recent activity, blue-black glass material, and a left-aligned app shell

## P0 — Core pipeline (nothing works without these)

- [x] **Supabase schema** — schema in place; uploads and reads confirmed working
- [x] **`/api/transactions/ingest` route** — fully implemented: JSON body parse → filter COMPLETED → deduplicate (normalized key fix applied) → rule-based categorization → import_batch record → chunked bulk insert → `IngestResult` response
- [x] **CSV upload UI** — `CsvUploadButton` component on transactions page; parses with PapaParse client-side, validates columns, POSTs to ingest route, shows success/error inline

## P1 — Core UI (judges need to see working features)

- [x] **Dashboard home — summary cards** — queries DB directly (server component); shows current balance card + this month income/expenses/net; empty state links to transactions page
- [x] **Landing page** — public `/` page with hero, 6-feature grid, 3-step how-it-works, and CTA; middleware updated so `/` is public and logged-in users redirect to `/dashboard`; dashboard moved from `/` to `/dashboard`
- [x] **`/api/analytics` route** — implemented: totalIncome, totalExpenses, netSavings, byCategory, byMonth, topMerchants, recurring detection (2+ months); optional `?month=YYYY-MM` filter
- [x] **Transactions page** — implemented: paginated table with search (debounced), category filter, date range, optimistic category correction, CSV upload button
- [x] **Analytics page** — donut (spending by category), bar chart (monthly income vs expenses), net savings line chart, top merchants table; period selector (Week / Month / 3 Months / Year / All time); analytics cache (`lib/analyticsCache.ts`) with 5-min TTL keyed per date range, cleared on CSV upload
- [ ] **Python microservice** — FastAPI service that accepts `[{description, amount, type}]` and returns categories; called as fallback for `Uncategorized` hits from the rule-based pass; deploy on VPS

## P2 — Key differentiators (demo-quality, judging criteria)

- [x] **Category correction UI** — inline `CategoryBadge` click-to-edit on each transaction row; optimistic update + revert on error; PATCH `/api/transactions/[id]`
- [x] **Transaction edit/delete** — pencil/trash icons appear on row hover; edit opens modal (description, amount, currency, date, type, category); delete has inline confirm step; DELETE route added; PATCH expanded to all editable fields
- [ ] **Two-stage categorization in ingest** — rule-based first; call Python microservice only for `Uncategorized` results; store `confidence` score alongside category
- [ ] **Category rules management** — UI in Account page to add/remove keyword→category rules stored in `category_rules` table; rules applied at ingest time ahead of defaults
- [ ] **Recurring transaction detection** — flag transactions with same description appearing monthly; surface them in a "Recurring" section on Analytics page

## P3 — Polish (time permitting)

- [x] **Lumen frontend rework** — logo SVG rebuilt with layered 4-petal depth and center glow; DM Sans wired through Tailwind; login/signup redesigned as split-screen auth pages; sidebar refined with avatar, filled active state, and ambient glow; dashboard polished with hero balance card, stat cards, and recent transactions list
- [x] **Analytics/account theme pass** — analytics and account pages brought into the Lumen dark dashboard system; PDF export preserved; sidebar theme switcher added for violet, green, and amber accent variants
- [x] **User profile** — `profiles` table (first_name, last_name, phone, date_of_birth); account page shows avatar with initials, editable form, email read-only; `GET/PATCH /api/profile` with upsert; **requires Supabase migration:**
  ```sql
  CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    date_of_birth DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "user owns profile" ON profiles
    FOR ALL USING (auth.uid() = id);
  ```
- [x] **Import history** — table on Account page showing filename, imported count, duplicates, date; queries `import_batches` ordered by recency
- [x] **AI financial insights** — rule-based insights engine (`InsightsPanel.tsx` + `/api/insights`); surfaces velocity, anomaly, recurring, savings, pattern, and largest-spend insights with positive/warning/danger/neutral tones; shown on dashboard
- [ ] **Month/date range filter** — transactions page already has per-column date range; still needed on analytics route (`?month=YYYY-MM`) and dashboard home
- [ ] **Demo mode** — seed a sample dataset so judges can try the app without a real Revolut CSV
- [ ] **Demo video on registration page** — embed a short product walkthrough video on the signup page (left panel) so new users understand the app before signing up
- [ ] **Responsive / mobile layout** — collapse sidebar to bottom nav on small screens

## P4 — Future ideas (brainstormed)

### AI / Intelligence
- [x] **Natural language query** — `FinancialChat` component on Analytics page; user-supplied API key (Groq / Claude / ChatGPT); builds financial context from DB (categories, monthly breakdown, top merchants) and passes it as system prompt; conversation history (last 6 turns); suggestion chips; quota/rate-limit error handling; **requires Supabase migration:**
  ```sql
  CREATE TABLE user_ai_settings (
    user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    provider   TEXT NOT NULL DEFAULT 'groq',
    api_key    TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "user owns ai settings" ON user_ai_settings
    FOR ALL USING (auth.uid() = user_id);
  ```
- [ ] **Cash flow forecast** — detect recurring income + expenses, project account balance 30/60/90 days forward; display as line chart with dashed "predicted" section past today
- [ ] **Anomaly detection** — flag transactions that are statistical outliers (3× average spend at a merchant, rare category, unusual amount); highlight with warning icon in transaction list
- [ ] **Financial health score** — composite 0–100 score from savings rate, spending consistency, income stability, budget adherence; shown on dashboard, updates monthly

### Core UX gaps
- [ ] **Budget goals** — user sets monthly spending cap per category (e.g. €300 Groceries); progress bar on analytics page; alert state at 80% and 100%; stored in a `budgets` table
- [x] **Subscription tracker** — `SubscriptionTracker` on Analytics page; detects weekly/monthly/quarterly/yearly recurring charges from full history using median gap + coefficient-of-variation filters; shows per-charge amount, frequency badge, monthly equivalent, and total monthly cost
- [ ] **Month-over-month comparison** — side-by-side this month vs last month vs same month last year per category; add as a section on the analytics page
- [ ] **Transaction notes** — free-text annotation field per transaction via edit modal; stored in `note` column on transactions table

### Reach / Differentiators
- [x] **Brokerage integration & portfolio page** — Trading 212 (live/demo) via API key; connect form validates key against T212 before saving; portfolio view shows 4 stat cards (value, invested, unrealized P&L, cash) + sortable positions table (ticker, qty, avg cost, current price, market value, P&L, P&L%); refresh + disconnect actions; **requires Supabase migration:**
  ```sql
  CREATE TABLE brokerage_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    broker TEXT NOT NULL DEFAULT 'trading212',
    api_key TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'live',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, broker)
  );
  ALTER TABLE brokerage_connections ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "user owns connection" ON brokerage_connections
    FOR ALL USING (auth.uid() = user_id);
  ```
- [x] **Multi-bank CSV support** — add column mappings for ING, ABN AMRO, Rabobank; auto-detect bank from headers; same categorization pipeline after parsing
- [x] **IBKR & DEGIRO CSV import** — parsers for IBKR Activity Statement (Open Positions + Trades fallback) and DEGIRO Transacties/Rekeningafschrift CSVs; ISIN-based Yahoo Finance ticker resolution for DEGIRO; currency-hint symbol mapping for IBKR; positions stored in `broker_imports` + `broker_positions` tables; portfolio view with LIVE/STMT/COST price-source badges; re-upload and remove; **requires Supabase migration:**
  ```sql
  CREATE TABLE broker_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    broker TEXT NOT NULL,
    filename TEXT,
    imported_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE broker_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID REFERENCES broker_imports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    broker TEXT NOT NULL,
    symbol TEXT NOT NULL,
    isin TEXT,
    name TEXT,
    quantity NUMERIC(18,6) NOT NULL,
    avg_cost NUMERIC(18,6),
    statement_price NUMERIC(18,6),
    yahoo_ticker TEXT,
    currency TEXT DEFAULT 'EUR'
  );
  ALTER TABLE broker_imports ENABLE ROW LEVEL SECURITY;
  ALTER TABLE broker_positions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "user owns broker imports" ON broker_imports FOR ALL USING (auth.uid() = user_id);
  CREATE POLICY "user owns broker positions" ON broker_positions FOR ALL USING (auth.uid() = user_id);
  ```
- [x] **Export as PDF report** — "↓ Export PDF" button on analytics page; `lib/pdfReport.ts` uses `jspdf` + `jspdf-autotable`; includes dark header, summary totals, spending by category with % share, top merchants table, page footer; dynamically imported to keep jsPDF out of SSR bundle; filename includes period + date
