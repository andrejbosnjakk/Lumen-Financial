import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service — Lumen' }

const EFFECTIVE_DATE = '7 June 2026'

export default function TermsPage() {
  return (
    <article className="prose prose-sm max-w-none text-lumen-text">
      <h1 className="text-2xl font-semibold text-lumen-text">Terms of Service</h1>
      <p className="mt-1 text-xs text-lumen-muted">Effective date: {EFFECTIVE_DATE}</p>

      <Section title="1. About Lumen">
        <p>
          Lumen (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the Service&rdquo;) is a personal finance dashboard that lets
          you import bank transaction files (CSV or PDF), automatically categorize them using machine-learning
          models, and view spending analytics and portfolio performance. Lumen is operated as an independent
          project based in the Netherlands.
        </p>
      </Section>

      <Section title="2. Acceptance">
        <p>
          By creating an account you confirm that you have read, understood, and agree to these Terms and our{' '}
          <a href="/privacy" className="text-lumen-accent underline underline-offset-2">Privacy Policy</a>.
          If you do not agree, you may not use the Service.
        </p>
        <p>
          You must be at least 18 years old to use Lumen. By registering you represent that you meet this
          requirement.
        </p>
      </Section>

      <Section title="3. Your Account">
        <ul>
          <li>You are responsible for keeping your credentials confidential.</li>
          <li>You must provide accurate information at registration and keep it up to date.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>Notify us immediately at <a href="mailto:support@lumen.app" className="text-lumen-accent underline underline-offset-2">support@lumen.app</a> if you suspect unauthorised access.</li>
        </ul>
      </Section>

      <Section title="4. Use of the Service">
        <p>You agree to use Lumen only for lawful personal finance management. You must not:</p>
        <ul>
          <li>Upload files containing data of third parties without their explicit consent.</li>
          <li>Attempt to reverse-engineer, scrape, or disrupt the Service.</li>
          <li>Use the Service to commit fraud or any unlawful act.</li>
          <li>Share your account with others or resell access to the Service.</li>
        </ul>
      </Section>

      <Section title="5. Financial Data You Upload">
        <p>
          You retain full ownership of the transaction data, portfolio statements, and other files you upload.
          By uploading, you grant us a limited licence to process that data solely to provide the Service to
          you (categorization, analytics, display). We do not sell or share your financial data with third
          parties for their own commercial purposes.
        </p>
        <p>
          Your data is stored in the European Union via Supabase (PostgreSQL). PDF files are transiently
          processed by an AI model to extract transaction rows and are not stored beyond that extraction.
        </p>
      </Section>

      <Section title="6. No Financial Advice">
        <p>
          Lumen is an informational tool only. Nothing on the platform constitutes financial, investment, tax,
          or legal advice. Category labels, analytics, and portfolio metrics are automated estimates and may
          not be accurate. Always consult a qualified professional before making financial decisions.
        </p>
      </Section>

      <Section title="7. Third-Party Services">
        <p>The Service relies on the following third-party providers:</p>
        <ul>
          <li><strong>Supabase</strong> — database and authentication (EU region).</li>
          <li><strong>Anthropic Claude</strong> — AI model used to extract transactions from uploaded PDF bank statements.</li>
          <li><strong>Yahoo Finance</strong> — live and historical market price data for portfolio positions.</li>
          <li><strong>Groq</strong> — optional LLM-based ticker symbol resolution for portfolio imports.</li>
        </ul>
        <p>
          Your use of these services through Lumen is subject to their respective terms. We are not
          responsible for the availability or accuracy of third-party data.
        </p>
      </Section>

      <Section title="8. Availability & Changes">
        <p>
          We provide the Service on a best-effort basis and do not guarantee uninterrupted availability.
          We may modify or discontinue features at any time. We will attempt to give reasonable notice of
          material changes via the email address on your account.
        </p>
      </Section>

      <Section title="9. Intellectual Property">
        <p>
          All software, design, and content in Lumen (excluding your data) is our intellectual property
          or that of our licensors. You may not copy, modify, or distribute it without our prior written
          consent.
        </p>
      </Section>

      <Section title="10. Limitation of Liability">
        <p>
          To the maximum extent permitted by Dutch law, Lumen is provided &ldquo;as is&rdquo; without
          warranties of any kind. We are not liable for any indirect, incidental, or consequential damages
          arising from your use of the Service, including loss of data or financial loss resulting from
          reliance on automated categorizations or analytics.
        </p>
      </Section>

      <Section title="11. Termination">
        <p>
          You may delete your account at any time from the account settings page. Upon deletion, your
          personal data and uploaded financial data will be permanently erased within 30 days, subject to
          any legal retention obligations.
        </p>
        <p>
          We may suspend or terminate accounts that violate these Terms, with or without notice.
        </p>
      </Section>

      <Section title="12. Governing Law">
        <p>
          These Terms are governed by the laws of the Netherlands. Any disputes shall be subject to the
          exclusive jurisdiction of the competent courts in the Netherlands.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          Questions about these Terms? Email us at{' '}
          <a href="mailto:support@lumen.app" className="text-lumen-accent underline underline-offset-2">support@lumen.app</a>.
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
