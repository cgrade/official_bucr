'use client';
import Link from 'next/link';
import { ShoppingBag, Clock, ArrowRight } from 'lucide-react';

export default function OrdersPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a1d3a] px-8 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.25)] mx-auto">
          <ShoppingBag className="h-9 w-9 text-[#c9a84c]" />
        </div>
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[rgba(201,168,76,0.3)] text-[#c9a84c] text-[10px] font-bold tracking-[0.18em] uppercase">
            <Clock className="h-3 w-3" /> Coming Soon
          </span>
        </div>
        <h1 className="font-display text-4xl font-semibold text-[#f5f0e8]">Online Orders</h1>
        <p className="text-[#7a8fa6] leading-relaxed">
          Takeout and delivery order oversight will be available once the vendor-side orders feature launches.
        </p>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-[13px] text-[#c9a84c] hover:text-[#f5f0e8] transition-colors">
          Back to Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
