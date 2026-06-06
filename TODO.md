# HackDelft TODO

## P0 — Core pipeline (nothing works without these)

- [x] **Supabase schema** — schema in place; uploads and reads confirmed working
- [x] **`/api/transactions/ingest` route** — fully implemented: JSON body parse → filter COMPLETED → deduplicate (normalized key fix applied) → rule-based categorization → import_batch record → chunked bulk insert → `IngestResult` response
- [x] **CSV upload UI** — `CsvUploadButton` component on transactions page; parses with PapaParse client-side, validates columns, POSTs to ingest route, shows success/error inline

## P1 — Core UI (judges need to see working features)

- [x] **Dashboard home — summary cards** — queries DB directly (server component); shows current balance card + this month income/expenses/net; empty state links to transactions page
- [x] **`/api/analytics` route** — implemented: totalIncome, totalExpenses, netSavings, byCategory, byMonth, topMerchants, recurring detection (2+ months); optional `?month=YYYY-MM` filter
- [x] **Transactions page** — implemented: paginated table with search (debounced), category filter, date range, optimistic category correction, CSV upload button
- [ ] **Analytics page** — spending by category (pie or bar chart with Recharts), monthly income vs expenses (line/bar), top merchants table
- [ ] **Python microservice** — FastAPI service that accepts `[{description, amount, type}]` and returns categories; called as fallback for `Uncategorized` hits from the rule-based pass; deploy on VPS

## P2 — Key differentiators (demo-quality, judging criteria)

- [x] **Category correction UI** — inline `CategoryBadge` click-to-edit on each transaction row; optimistic update + revert on error; PATCH `/api/transactions/[id]`
- [x] **Transaction edit/delete** — pencil/trash icons appear on row hover; edit opens modal (description, amount, currency, date, type, category); delete has inline confirm step; DELETE route added; PATCH expanded to all editable fields
- [ ] **Two-stage categorization in ingest** — rule-based first; call Python microservice only for `Uncategorized` results; store `confidence` score alongside category
- [ ] **Category rules management** — UI in Account page to add/remove keyword→category rules stored in `category_rules` table; rules applied at ingest time ahead of defaults
- [ ] **Recurring transaction detection** — flag transactions with same description appearing monthly; surface them in a "Recurring" section on Analytics page

## P3 — Polish (time permitting)

- [ ] **Import history** — list past import batches with filename, date, counts on Account page
- [ ] **AI financial insights** — call Claude API with aggregated spend data to generate 2-3 personalised advice bullets; show on dashboard home below summary cards
- [ ] **Month/date range filter** — transactions page already has per-column date range; still needed on analytics route (`?month=YYYY-MM`) and dashboard home
- [ ] **Demo mode** — seed a sample dataset so judges can try the app without a real Revolut CSV
- [ ] **Responsive / mobile layout** — collapse sidebar to bottom nav on small screens
