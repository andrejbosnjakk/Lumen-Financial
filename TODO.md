# HackDelft TODO

## P0 — Core pipeline (nothing works without these)

- [ ] **Supabase schema** — run migration to match `lib/types.ts` (add `product`, `source`, `is_recurring`, `import_batch_id`, `balance_after_transaction` columns; create `import_batches` table; set up RLS policies)
- [ ] **`/api/transactions/ingest` route** — implement the full pipeline: parse multipart CSV → validate columns → filter COMPLETED rows → deduplicate against existing → categorize via `lib/categorizer` → create `import_batch` record → bulk insert transactions → return `IngestResult`
- [x] **CSV upload UI** — `CsvUploadButton` component on transactions page; parses with PapaParse client-side, validates columns, POSTs to ingest route, shows success/error inline

## P1 — Core UI (judges need to see working features)

- [ ] **Dashboard home — summary cards** — wire up `GET /api/analytics` to show total income, total expenses, net savings, and a spending-by-category breakdown for the current month
- [ ] **`/api/analytics` route** — implement aggregation queries: totals by type, group by category, monthly buckets, top merchants, detect recurring transactions
- [x] **Transactions page** — implemented: paginated table with search (debounced), category filter, date range, optimistic category correction, CSV upload button
- [ ] **Analytics page** — spending by category (pie or bar chart with Recharts), monthly income vs expenses (line/bar), top merchants table
- [ ] **Python microservice** — FastAPI service that accepts `[{description, amount, type}]` and returns categories; called as fallback for `Uncategorized` hits from the rule-based pass; deploy on VPS

## P2 — Key differentiators (demo-quality, judging criteria)

- [x] **Category correction UI** — inline `CategoryBadge` click-to-edit on each transaction row; optimistic update + revert on error; PATCH `/api/transactions/[id]`
- [ ] **Two-stage categorization in ingest** — rule-based first; call Python microservice only for `Uncategorized` results; store `confidence` score alongside category
- [ ] **Category rules management** — UI in Account page to add/remove keyword→category rules stored in `category_rules` table; rules applied at ingest time ahead of defaults
- [ ] **Recurring transaction detection** — flag transactions with same description appearing monthly; surface them in a "Recurring" section on Analytics page

## P3 — Polish (time permitting)

- [ ] **Import history** — list past import batches with filename, date, counts on Account page
- [ ] **AI financial insights** — call Claude API with aggregated spend data to generate 2-3 personalised advice bullets; show on dashboard home below summary cards
- [ ] **Month/date range filter** — global filter picker in sidebar or header; pass `?month=YYYY-MM` to analytics + transactions routes
- [ ] **Demo mode** — seed a sample dataset so judges can try the app without a real Revolut CSV
- [ ] **Responsive / mobile layout** — collapse sidebar to bottom nav on small screens
