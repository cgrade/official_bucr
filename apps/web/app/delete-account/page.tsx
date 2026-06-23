import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delete your account — Bucr',
  description: 'How to delete your Bucr account and the data we remove or retain.',
};

export default function DeleteAccountPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <h1 className="font-display text-4xl font-semibold text-ink">Delete your account</h1>
      <p className="mt-2 text-muted">You can permanently delete your Bucr account and personal data at any time.</p>

      <section className="card p-6 mt-8">
        <h2 className="text-[17px] font-semibold text-[#c9a84c] mb-2">Option 1 — in the app (fastest)</h2>
        <ol className="list-decimal list-inside space-y-1.5 text-[14px] text-body leading-relaxed">
          <li>Open the Bucr app (or sign in on the web).</li>
          <li>Go to <strong>Account → Privacy &amp; data</strong> (mobile) or <strong>Account</strong> (web).</li>
          <li>Tap <strong>Delete account</strong> and confirm.</li>
        </ol>
      </section>

      <section className="card p-6 mt-5">
        <h2 className="text-[17px] font-semibold text-[#c9a84c] mb-2">Option 2 — request by email</h2>
        <p className="text-[14px] text-body leading-relaxed">
          Email <a href="mailto:support@bucr.ng?subject=Delete%20my%20account" className="text-[#c9a84c] hover:underline">support@bucr.ng</a> from
          the address on your account with the subject “Delete my account”. We verify ownership and complete deletion within 30 days.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-[17px] font-semibold text-ink mb-2">What is deleted</h2>
        <p className="text-[14px] text-body leading-relaxed">
          Your profile (name, email, phone), saved restaurants, reviews, notifications, device tokens, and remaining
          non-refundable credit balance are permanently removed.
        </p>
        <h2 className="text-[17px] font-semibold text-ink mb-2 mt-5">What we retain (and why)</h2>
        <p className="text-[14px] text-body leading-relaxed">
          For legal, tax, fraud-prevention and dispute-resolution reasons we retain a limited record of completed transactions
          (e.g. payment/credit ledger entries) for the period required by Nigerian law, after which it is deleted. This data is
          dissociated from your profile where possible. See our{' '}
          <Link href="/privacy" className="text-[#c9a84c] hover:underline">Privacy Policy</Link>.
        </p>
      </section>

      <p className="mt-8 text-[13px] text-muted">Questions? <a href="mailto:support@bucr.ng" className="text-[#c9a84c] hover:underline">support@bucr.ng</a></p>
    </div>
  );
}
