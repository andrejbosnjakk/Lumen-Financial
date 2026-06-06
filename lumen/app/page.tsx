import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BarChart2, CalendarRange, FileUp, LayoutDashboard, ShieldCheck, Sparkles, Tags } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const features = [
  {
    Icon: FileUp,
    title: 'One-click import',
    body: 'Export from Revolut, drop it in Lumen. Duplicates are detected automatically - import as often as you like.',
  },
  {
    Icon: Sparkles,
    title: 'Instant categorization',
    body: 'Rule-based categorization fires first - Albert Heijn > Groceries, OVpay > Transport. Every label is editable.',
  },
  {
    Icon: BarChart2,
    title: 'Spending analytics',
    body: 'Income vs expenses, category breakdown, net savings, and top merchants - all from a single view.',
  },
  {
    Icon: CalendarRange,
    title: 'Period filters',
    body: 'Switch between week, month, quarter, year, and all-time. Charts adapt granularity automatically.',
  },
  {
    Icon: ShieldCheck,
    title: 'Private by design',
    body: 'Row-level security means your transactions are only visible to you - not even us.',
  },
  {
    Icon: Tags,
    title: 'PDF export',
    body: 'Generate a financial report with one click: summary totals, category breakdown, top merchants.',
  },
]

const steps = [
  { number: '01', title: 'Export from Revolut', body: 'Go to Revolut > Statements > Export account statement as CSV.' },
  { number: '02', title: 'Upload to Lumen', body: 'Drop the file on the dashboard. Transactions are parsed, deduplicated, and categorized in seconds.' },
  { number: '03', title: 'Explore your insights', body: 'Browse analytics, correct any labels, and export a PDF report.' },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-lumen-bg text-lumen-text">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Image src="/brand/lumen-logo-pixel-faithful.png" alt="Lumen" height={34} width={136} style={{ objectFit: 'contain', objectPosition: 'left' }} />
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-2xl bg-lumen-accent px-4 py-2 text-sm font-semibold text-white shadow-accent-glow-sm transition-colors hover:bg-lumen-accent-dim"
            >
              <LayoutDashboard size={14} />
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-2xl px-4 py-2 text-sm font-semibold text-lumen-muted transition-colors hover:text-lumen-text">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1.5 rounded-2xl bg-lumen-accent px-4 py-2 text-sm font-semibold text-white shadow-accent-glow-sm transition-colors hover:bg-lumen-accent-dim"
              >
                Get started
                <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,rgb(var(--lumen-accent-rgb)/0.10),transparent)]" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lumen-border bg-lumen-fill-sm px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-lumen-accent" />
            <span className="text-xs font-semibold text-lumen-muted">HackDelft 2026 - Revolut AI Challenge</span>
          </div>

          <div className="mb-6 flex justify-center">
            <div style={{ width: 80, height: 80, overflow: 'hidden', flexShrink: 0 }}>
              <Image src="/brand/lumen-logo-pixel-faithful.png" alt="" height={80} width={400} style={{ height: 80, width: 'auto', maxWidth: 'none' }} />
            </div>
          </div>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-lumen-text sm:text-5xl lg:text-6xl">
            Financial clarity,<br />
            <span className="bg-gradient-to-r from-lumen-accent via-purple-400 to-lumen-accent bg-clip-text text-transparent">
              illuminated.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-lumen-muted sm:text-lg">
            Upload your Revolut CSV export and get instant categorization, spending analytics, and clean financial insights.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="flex h-12 items-center gap-2 rounded-2xl bg-lumen-accent px-7 text-sm font-semibold text-white shadow-accent-glow transition-colors hover:bg-lumen-accent-dim"
              >
                Go to dashboard
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="flex h-12 items-center gap-2 rounded-2xl bg-lumen-accent px-7 text-sm font-semibold text-white shadow-accent-glow transition-colors hover:bg-lumen-accent-dim"
                >
                  Get started
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/login"
                  className="flex h-12 items-center gap-2 rounded-2xl border border-lumen-border bg-lumen-fill px-7 text-sm font-semibold text-lumen-text transition-colors hover:border-lumen-accent/40 hover:text-lumen-accent"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>

          {!user && (
            <p className="mt-5 text-xs text-lumen-muted/60">
              No credit card required - Works with standard Revolut CSV exports
            </p>
          )}
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-lumen-accent">Features</p>
            <h2 className="mt-3 text-2xl font-semibold text-lumen-text sm:text-3xl">Everything you need to understand your money</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, title, body }) => (
              <div key={title} className="lumen-panel rounded-[22px] p-6 transition-colors hover:border-lumen-accent/30">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-lumen-accent/10 text-lumen-accent">
                  <Icon size={20} />
                </div>
                <p className="text-sm font-semibold text-lumen-text">{title}</p>
                <p className="mt-2 text-sm leading-6 text-lumen-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-lumen-accent">How it works</p>
            <h2 className="mt-3 text-2xl font-semibold text-lumen-text sm:text-3xl">From CSV to insights in three steps</h2>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-3">
            <div className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-5 hidden h-px bg-gradient-to-r from-lumen-border via-lumen-accent/30 to-lumen-border sm:block" />

            {steps.map(({ number, title, body }) => (
              <div key={number} className="relative flex flex-col items-center text-center">
                <div className="relative mb-6 flex h-10 w-10 items-center justify-center rounded-2xl border border-lumen-accent/30 bg-lumen-surface text-sm font-bold text-lumen-accent">
                  {number}
                </div>
                <p className="text-sm font-semibold text-lumen-text">{title}</p>
                <p className="mt-2 text-sm leading-6 text-lumen-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <div className="lumen-panel relative overflow-hidden rounded-[28px] p-10 text-center sm:p-14">

            <div className="relative">
              <div className="mx-auto mb-6" style={{ width: 56, height: 56, overflow: 'hidden' }}>
                <Image src="/brand/lumen-logo-pixel-faithful.png" alt="" height={56} width={280} style={{ height: 56, width: 'auto', maxWidth: 'none' }} />
              </div>
              <h2 className="text-2xl font-semibold text-lumen-text sm:text-3xl">
                Ready to illuminate your finances?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-lumen-muted">
                Create a free account, upload your Revolut statement, and get a complete picture of your spending in under a minute.
              </p>
              <Link
                href={user ? '/dashboard' : '/signup'}
                className="mt-8 inline-flex h-12 items-center gap-2 rounded-2xl bg-lumen-accent px-8 text-sm font-semibold text-white shadow-accent-glow transition-colors hover:bg-lumen-accent-dim"
              >
                {user ? 'Go to dashboard' : 'Get started free'}
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-lumen-border px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Image src="/brand/lumen-logo-pixel-faithful.png" alt="Lumen" height={26} width={104} style={{ objectFit: 'contain', objectPosition: 'left' }} />
          <p className="text-xs text-lumen-muted/60">
            HackDelft 2026 - Revolut AI Challenge
          </p>
        </div>
      </footer>
    </div>
  )
}
