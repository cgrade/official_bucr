import Link from 'next/link';
import { BucrWordmark } from '@/components/ui/BucrWordmark';

export const metadata = { title: 'Privacy Policy · Bucr' };

const SECTIONS: { h: string; body: string }[] = [
  { h: '1. What we collect', body: 'Account details (name, email, phone, country), business details for vendors, reservation and transaction history, device and usage data, and approximate location when you enable it.' },
  { h: '2. How we use it', body: 'To operate reservations and the credit system, prevent fraud and no-show abuse, provide support, send service messages (confirmations, reminders, expiry notices), and improve the platform.' },
  { h: '3. Payments', body: 'Card and bank payments are processed by Paystack. Bucr does not store full card numbers.' },
  { h: '4. Sharing', body: 'We share only what is needed to deliver the service — e.g. your reservation details with the vendor you booked. We do not sell your personal data.' },
  { h: '5. Your rights (NDPA 2023)', body: 'You may request access to, correction of, or deletion of your personal data, and may object to certain processing, in line with the Nigeria Data Protection Act 2023.' },
  { h: '6. Retention', body: 'We keep data for as long as your account is active and as required for legal, accounting and fraud-prevention purposes.' },
  { h: '7. Contact', body: 'Privacy questions or data requests? Email support@bucr.ng.' },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0f2547] text-[#f5f0e8]">
      <header className="border-b border-[rgba(201,168,76,0.18)] px-6 py-4 flex items-center justify-between">
        <Link href="/login"><BucrWordmark height={30} /></Link>
        <Link href="/login" className="text-[13px] font-semibold text-[#c9a84c] hover:underline">Back to sign in</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl font-semibold mb-1">Privacy Policy</h1>
        <p className="text-[13px] text-[#7a8fa6] mb-8">Last updated: June 2026</p>
        <p className="text-[15px] text-[rgba(245,240,232,0.85)] leading-relaxed mb-8">
          Bucr is committed to protecting your data. This policy explains what we collect and why,
          consistent with the Nigeria Data Protection Act 2023.
        </p>
        <div className="space-y-7">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-[17px] font-semibold text-[#c9a84c] mb-1.5">{s.h}</h2>
              <p className="text-[14px] text-[rgba(245,240,232,0.8)] leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-[12px] text-[rgba(122,143,166,0.6)]">
          See also our <Link href="/terms" className="text-[#c9a84c] hover:underline">Terms of Service</Link>.
        </p>
      </main>
    </div>
  );
}
