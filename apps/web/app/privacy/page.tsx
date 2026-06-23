const SECTIONS = [
  { h: '1. What we collect', body: 'Account details (name, email, phone, country), reservation and transaction history, device/usage data, and approximate location when you enable it.' },
  { h: '2. How we use it', body: 'To run reservations and the credit system, prevent fraud and no-show abuse, provide support, send service messages, and improve the product.' },
  { h: '3. Payments', body: 'Card and bank payments are processed by Paystack. Bucr does not store full card numbers.' },
  { h: '4. Sharing', body: 'We share only what’s needed to deliver the service — e.g. your reservation details with the restaurant you booked. We do not sell your personal data.' },
  { h: '5. Your rights (NDPA 2023)', body: 'You may request access to, correction of, or deletion of your personal data in line with the Nigeria Data Protection Act 2023.' },
  { h: '6. Contact', body: 'Privacy questions or data requests? Email support@bucr.ng.' },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-14">
      <h1 className="font-display text-4xl font-semibold text-ink">Privacy Policy</h1>
      <p className="text-[13px] text-muted mt-1 mb-8">Last updated: June 2026 · Consistent with the Nigeria Data Protection Act 2023.</p>
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
