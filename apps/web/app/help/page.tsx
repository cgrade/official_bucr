'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Mail, Phone, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQS = [
  { q: 'What are Bucr credits?', a: 'Credits are platform access credits used to confirm reservations. 1 credit = ₦10. They’re refundable to your balance per our policies, non-cashable, and expire 90 days after purchase.' },
  { q: 'Why do I pay a deposit to book?', a: 'A small, refundable credit deposit confirms your table so restaurants can rely on your booking. Check in at the venue and you get it all back, plus a 3% bonus.' },
  { q: 'What happens if I don’t show up?', a: 'You forfeit 40% of the deposit (you keep 60%). The forfeited portion compensates the restaurant for the held table and the platform.' },
  { q: 'How do I cancel and get a refund?', a: '24 hours or more before — 100% refund. 12–24 hours — 50%. Under 12 hours — 0%. If the restaurant cancels, you get a full refund plus a 10% bonus.' },
  { q: 'How do I check in at the restaurant?', a: 'Open your reservation and show the QR code, or give the host your PIN. Your deposit is released the moment you’re checked in.' },
  { q: 'Do credits expire?', a: 'Yes — 90 days after purchase. We send a reminder 30 days before so you can use them in time.' },
  { q: 'How do I pay for my meal?', a: 'You pay the restaurant directly at the venue, as usual. Bucr only handles the reservation deposit.' },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-semibold text-ink">Help & support</h1>
      <p className="mt-1 text-muted">Answers to common questions — and how to reach us.</p>

      <div className="card mt-6 divide-y divide-line">
        {FAQS.map((f, i) => (
          <div key={i}>
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
              <span className="text-[15px] font-medium text-ink">{f.q}</span>
              <ChevronDown className={cn('h-5 w-5 text-[#c9a84c] transition-transform flex-shrink-0', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="px-5 pb-4 -mt-1 text-[14px] text-body leading-relaxed">{f.a}</p>}
          </div>
        ))}
      </div>

      <h2 className="font-display text-2xl font-semibold text-ink mt-10 mb-3">Still need help?</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        <a href="mailto:support@bucr.ng" className="card p-5 text-center hover:shadow-md transition-shadow">
          <Mail className="h-6 w-6 mx-auto text-[#c9a84c]" /><p className="mt-2 text-[13px] font-semibold text-ink">Email</p><p className="text-[12px] text-muted">support@bucr.ng</p>
        </a>
        <a href="tel:+2348146104740" className="card p-5 text-center hover:shadow-md transition-shadow">
          <Phone className="h-6 w-6 mx-auto text-[#c9a84c]" /><p className="mt-2 text-[13px] font-semibold text-ink">Call</p><p className="text-[12px] text-muted">+234 814 610 474</p>
        </a>
        <a href="https://wa.me/2348146104740" target="_blank" rel="noopener noreferrer" className="card p-5 text-center hover:shadow-md transition-shadow">
          <MessageCircle className="h-6 w-6 mx-auto text-[#c9a84c]" /><p className="mt-2 text-[13px] font-semibold text-ink">WhatsApp</p><p className="text-[12px] text-muted">Chat with us</p>
        </a>
      </div>

      <p className="mt-8 text-center text-[13px] text-muted">See also our <Link href="/terms" className="text-[#c9a84c] hover:underline">Terms</Link> and <Link href="/privacy" className="text-[#c9a84c] hover:underline">Privacy Policy</Link>.</p>
    </div>
  );
}
