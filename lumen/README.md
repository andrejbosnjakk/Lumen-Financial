# Lumen: Next.js app

The web app and API routes. See the [root README](../README.md) for an overview and full setup.

```bash
cp .env.local.example .env.local   # Supabase URL + anon key at minimum
npm install
npm run dev                        # http://localhost:3000
npm run categorizer                # optional: ML categoriser on :8001
```

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run categorizer` | Python categoriser (FastAPI, localhost:8001) |
| `npm run demo` | Production build, then app + categoriser together |
| `npm run lint` | ESLint |

Stack: Next.js 14 · TypeScript · Tailwind · Supabase · Recharts · PapaParse · Framer Motion
