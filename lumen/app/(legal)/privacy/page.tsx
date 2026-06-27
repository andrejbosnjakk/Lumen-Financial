import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy — Lumen' }

const EFFECTIVE_DATE = '7 June 2026'

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm max-w-none text-lumen-text">
      <h1 className="text-2xl font-semibold text-lumen-text">Privacy Policy</h1>
      <p className="mt-1 text-xs text-lumen-muted">Effective date: {EFFECTIVE_DATE}</p>

      <Section title="1. Who We Are">
        <p>
          Lumen is a personal finance analytics service operated as an independent project based in the
          Netherlands. For GDPR purposes, Lumen acts as the data controller for information you provide
          when creating an account and using the Service. Contact:{' '}
          <a href="mailto:privacy@lumen.app" className="text-lumen-accent underline underline-offset-2">privacy@lumen.app</a>.
        </p>
      </Section>

      <Section title="2. What Data We Collect">
        <p><strong className="text-lumen-text">Account information</strong> — collected at registration:</p>
        <ul>
          <li>Email address (required)</li>
          <li>First and last name (required)</li>
          <li>Phone number (optional)</li>
          <li>Date of birth (optional)</li>
          <li>Password (stored as a bcrypt hash — we never see your plaintext password)</li>
        </ul>

        <p className="mt-3"><strong className="text-lumen-text">Financial transaction data</strong> — when you upload files:</p>
        <ul>
          <li>Transaction dates, amounts, currencies, and descriptions from bank CSV exports</li>
          <li>Counterparty names and IBANs where present in the source file</li>
          <li>Running balance figures where present in the source file</li>
          <li>Auto-assigned and user-corrected spending categories</li>
        </ul>

        <p className="mt-3"><strong className="text-lumen-text">Portfolio data</strong> — when you import broker statements:</p>
        <ul>
          <li>Ticker symbols, ISINs, position quantities, average cost prices</li>
          <li>Broker name and statement filename</li>
        </ul>

        <p className="mt-3"><strong className="text-lumen-text">Usage & session data</strong> — automatically collected:</p>
        <ul>
          <li>Authentication tokens and session metadata (managed by Supabase Auth)</li>
          <li>Timestamps of logins and data imports</li>
        </ul>

        <p className="mt-3">
          We do <strong className="text-lumen-text">not</strong> collect cookies beyond those strictly
          necessary for authentication, and we do <strong className="text-lumen-text">not</strong> use
          advertising trackers or analytics SDKs.
        </p>
      </Section>

      <Section title="3. Why We Process Your Data (Legal Basis)">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-lumen-border text-left">
              <th className="pb-2 pr-4 font-medium text-lumen-text">Purpose</th>
              <th className="pb-2 font-medium text-lumen-text">Legal basis (GDPR Art. 6)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lumen-border">
            {[
              ['Providing and operating the Service', 'Performance of contract (Art. 6(1)(b))'],
              ['Authentication and account security', 'Performance of contract (Art. 6(1)(b))'],
              ['Automated transaction categorization', 'Performance of contract (Art. 6(1)(b))'],
              ['Sending transactional emails (e.g. password reset)', 'Performance of contract (Art. 6(1)(b))'],
              ['Improving categorization accuracy', 'Legitimate interests (Art. 6(1)(f))'],
              ['Complying with legal obligations', 'Legal obligation (Art. 6(1)(c))'],
            ].map(([purpose, basis]) => (
              <tr key={purpose}>
                <td className="py-2 pr-4 text-lumen-muted">{purpose}</td>
                <td className="py-2 text-lumen-muted">{basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="4. How We Store & Protect Your Data">
        <p>
          All data is stored in a PostgreSQL database hosted by{' '}
          <strong className="text-lumen-text">Supabase</strong> in the <strong className="text-lumen-text">European Union</strong>.
          Row Level Security (RLS) policies ensure that each user can only access their own data — even at
          the database level. Connections are encrypted with TLS in transit.
        </p>
        <p>
          PDF files you upload are passed transiently to the Anthropic Claude API for text extraction. The
          extracted transaction rows are stored in our database; the raw PDF is not retained after processing.
        </p>
        <p>
          Portfolio positions are enriched with live prices from Yahoo Finance. Your ticker symbols may be
          sent to Yahoo Finance and, if Groq symbol resolution is enabled, to Groq — no personal account
          data is shared with these providers.
        </p>
      </Section>

      <Section title="5. Third-Party Processors">
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-lumen-border text-left">
              <th className="pb-2 pr-4 font-medium text-lumen-text">Processor</th>
              <th className="pb-2 pr-4 font-medium text-lumen-text">Purpose</th>
              <th className="pb-2 font-medium text-lumen-text">Data location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lumen-border">
            {[
              ['Supabase', 'Database & authentication', 'EU'],
              ['Anthropic', 'PDF transaction extraction', 'US (SCCs applied)'],
              ['Yahoo Finance', 'Market price data', 'US (public API)'],
              ['Groq', 'Ticker symbol resolution (optional)', 'US (SCCs applied)'],
            ].map(([name, purpose, location]) => (
              <tr key={name}>
                <td className="py-2 pr-4 font-medium text-lumen-text">{name}</td>
                <td className="py-2 pr-4 text-lumen-muted">{purpose}</td>
                <td className="py-2 text-lumen-muted">{location}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3">
          Transfers to processors outside the EU are covered by Standard Contractual Clauses (SCCs) or
          equivalent safeguards as required by GDPR Chapter V.
        </p>
      </Section>

      <Section title="6. Data Retention">
        <ul>
          <li><strong className="text-lumen-text">Account data</strong> — retained for as long as your account is active.</li>
          <li><strong className="text-lumen-text">Transaction & portfolio data</strong> — retained until you delete it or close your account.</li>
          <li><strong className="text-lumen-text">On account deletion</strong> — all personal data is permanently erased within 30 days.</li>
          <li><strong className="text-lumen-text">Backups</strong> — may be retained for up to 90 days after deletion for disaster-recovery purposes, then purged.</li>
        </ul>
      </Section>

      <Section title="7. Your Rights Under GDPR">
        <p>As a data subject you have the right to:</p>
        <ul>
          <li><strong className="text-lumen-text">Access</strong> — request a copy of the personal data we hold about you.</li>
          <li><strong className="text-lumen-text">Rectification</strong> — correct inaccurate data.</li>
          <li><strong className="text-lumen-text">Erasure</strong> — request deletion of your data (&ldquo;right to be forgotten&rdquo;).</li>
          <li><strong className="text-lumen-text">Restriction</strong> — ask us to limit processing in certain circumstances.</li>
          <li><strong className="text-lumen-text">Portability</strong> — receive your data in a structured, machine-readable format.</li>
          <li><strong className="text-lumen-text">Object</strong> — object to processing based on legitimate interests.</li>
        </ul>
        <p>
          To exercise any of these rights, email{' '}
          <a href="mailto:privacy@lumen.app" className="text-lumen-accent underline underline-offset-2">privacy@lumen.app</a>.
          We will respond within 30 days. You also have the right to lodge a complaint with the Dutch Data
          Protection Authority (Autoriteit Persoonsgegevens) at{' '}
          <a href="https://autoriteitpersoonsgegevens.nl" className="text-lumen-accent underline underline-offset-2" target="_blank" rel="noreferrer">autoriteitpersoonsgegevens.nl</a>.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          Lumen is not directed at children under 18. We do not knowingly collect data from minors.
          If you believe a minor has registered, contact us and we will delete the account promptly.
        </p>
      </Section>

      <Section title="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy to reflect changes in the Service or applicable law. We will
          notify you by email at least 14 days before material changes take effect. Continued use after
          the effective date constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Privacy questions or requests:{' '}
          <a href="mailto:privacy@lumen.app" className="text-lumen-accent underline underline-offset-2">privacy@lumen.app</a>
        </p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-semibold text-lumen-text">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-lumen-muted">{children}</div>
    </section>
  )
}
