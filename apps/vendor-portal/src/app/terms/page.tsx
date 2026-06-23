import Link from 'next/link';
import { BucrWordmark } from '@/components/ui/BucrWordmark';

export const metadata = { title: 'Terms of Service · Bucr' };

const SECTIONS: { h: string; body: string }[] = [
  { h: '1. Accounts', body: 'You must provide accurate, complete information when creating an account and are responsible for keeping your credentials secure. You must be the authorised representative of any business you register.' },
  { h: '2. Credits', body: 'Bucr credits are platform access credits used to confirm reservations and pay for platform services. 1 credit = ₦10. Credits are non-refundable to cash, non-withdrawable, and operate within a closed loop. Unused credits expire 90 days after purchase; a reminder is sent 30 days before expiry.' },
  { h: '3. Reservations & deposits', body: 'A flat credit deposit confirms a reservation, regardless of party size. When a guest checks in, the deposit is returned in full plus a 3% bonus.' },
  { h: '4. Cancellations', body: 'Guest cancellations are refunded as follows: 24 hours or more before the booking — 100%; between 12 and 24 hours — 50%; under 12 hours — 0%. If a vendor cancels, the guest receives a 100% refund plus a 10% compensation bonus — and that 10% bonus is paid by the vendor from their marketing-credit wallet. A vendor must therefore hold at least 10% of the deposit in credits to cancel; the cancellation is blocked if the wallet balance is insufficient.' },
  { h: '5. No-shows', body: 'If a guest does not show up, 40% of the deposit is forfeited (the guest keeps 60%). Of the forfeited amount, 30% of the original deposit goes to the vendor as non-cashable marketing credits and 10% to Bucr.' },
  { h: '6. Vendor terms', body: 'Vendors are billed a per-cover success fee on seated guests, charged per head (the fee is multiplied by the party size — a table of four is charged four covers), reduced by subscription tier. The fee is always a flat amount per head, never a percentage of the bill. Vendors may subscribe to paid tiers. Vendor credits are earned via no-show compensation and promotions, can only be spent on Bucr marketing inventory, and can never be withdrawn to cash.' },
  { h: '7. Acceptable use', body: 'You agree not to misuse the platform, including creating fake reservations, abusing referrals or gifting, or engaging in fraudulent activity.' },
  { h: '8. Contact', body: 'Questions about these terms? Email us at support@bucr.ng.' },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0f2547] text-[#f5f0e8]">
      <header className="border-b border-[rgba(201,168,76,0.18)] px-6 py-4 flex items-center justify-between">
        <Link href="/login"><BucrWordmark height={30} /></Link>
        <Link href="/login" className="text-[13px] font-semibold text-[#c9a84c] hover:underline">Back to sign in</Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-display text-4xl font-semibold mb-1">Terms of Service</h1>
        <p className="text-[13px] text-[#7a8fa6] mb-8">Last updated: June 2026</p>
        <p className="text-[15px] text-[rgba(245,240,232,0.85)] leading-relaxed mb-8">
          Welcome to Bucr. By creating an account or using the platform, you agree to these terms.
          These terms are being finalised with counsel and may be updated; the current version always
          governs your use.
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
          See also our <Link href="/privacy" className="text-[#c9a84c] hover:underline">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}
