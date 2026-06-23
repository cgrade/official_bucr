const SECTIONS = [
  { h: '1. Your account', body: 'Provide accurate information and keep your login secure. You must be 18+ to hold an account.' },
  { h: '2. Credits', body: 'Bucr credits are platform access credits used to confirm reservations. 1 credit = ₦10. Credits are non-refundable to cash, non-withdrawable, and expire 90 days after purchase (a reminder is sent 30 days before).' },
  { h: '3. Reservations & deposits', body: 'A flat, refundable credit deposit confirms your table regardless of party size. Check in at the venue and your deposit is returned in full, plus a 3% bonus.' },
  { h: '4. Cancellations', body: '24 hours or more before the booking — 100% refund; 12–24 hours — 50%; under 12 hours — 0%. If the restaurant cancels, you receive a full refund plus a 10% bonus.' },
  { h: '5. No-shows', body: 'If you don’t show up, 40% of the deposit is forfeited (you keep 60%). The forfeited amount compensates the restaurant and the platform.' },
  { h: '6. Acceptable use', body: 'Don’t misuse the platform — no fake reservations, referral/gift abuse, or fraudulent activity.' },
  { h: '7. Contact', body: 'Questions? Email support@bucr.ng.' },
];

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <h1 className="font-display text-4xl font-semibold text-ink">Terms of Service</h1>
      <p className="text-[13px] text-muted mt-1 mb-8">Last updated: June 2026 · These terms are being finalised with counsel; the current version governs your use.</p>
      <div className="space-y-7">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-[17px] font-semibold text-[#c9a84c] mb-1.5">{s.h}</h2>
            <p className="text-[14px] text-body leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
