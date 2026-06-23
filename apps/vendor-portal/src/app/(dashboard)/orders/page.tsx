'use client';

import Link from 'next/link';
import { ShoppingBag, Clock, ArrowRight } from 'lucide-react';

export default function OrdersPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f2547] px-8 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] mx-auto">
          <ShoppingBag className="h-9 w-9 text-[#c9a84c]" />
        </div>
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[rgba(201,168,76,0.3)] text-[#c9a84c] text-[10px] font-bold tracking-[0.18em] uppercase">
            <Clock className="h-3 w-3" />
            Coming Soon
          </span>
        </div>
        <h1 className="font-display text-4xl font-semibold text-[#f5f0e8]">Online Orders</h1>
        <p className="text-[#7a8fa6] leading-relaxed">
          Takeout and delivery order management is being built and will launch as a paid upgrade.
          Your core reservation business is fully supported today.
        </p>
        <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.15)] rounded-xl p-5 text-left space-y-2.5">
          <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#7a8fa6] mb-3">What&apos;s coming</p>
          {['Real-time takeout & delivery orders','Order status management (confirm → prepare → ready)','Delivery zone configuration','Order analytics & peak-hour insights'].map(item => (
            <div key={item} className="flex items-start gap-2 text-[13px] text-[rgba(245,240,232,0.7)]">
              <span className="text-[#c9a84c] mt-0.5">◆</span>{item}
            </div>
          ))}
        </div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-[13px] text-[#c9a84c] hover:text-[#f5f0e8] transition-colors">
          Back to Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
