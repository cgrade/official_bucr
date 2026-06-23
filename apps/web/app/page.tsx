'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck, RefreshCw, CalendarCheck, ArrowRight, CalendarDays } from 'lucide-react';
import { vendorsApi, featuredApi } from '@/lib/api';
import { RestaurantCard, type VendorLite } from '@/components/RestaurantCard';
import { useAuthStore } from '@/stores/auth.store';

const STEPS = [
  { icon: Search, title: 'Find your table', desc: 'Browse top restaurants and pick a date, time and party size.' },
  { icon: ShieldCheck, title: 'Confirm with credits', desc: 'A small, refundable credit deposit locks in your table — no more lost bookings.' },
  { icon: CalendarCheck, title: 'Show up', desc: 'Check in with your QR or PIN at the venue.' },
  { icon: RefreshCw, title: 'Get it back +3%', desc: 'Your deposit returns instantly with a 3% bonus. No-shows forfeit part of it.' },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const { data: featuredData } = useQuery({ queryKey: ['featured'], queryFn: () => featuredApi.getAll() });
  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ['vendors', 'home'],
    queryFn: () => vendorsApi.getAll({ limit: 8 }),
  });

  const featured: VendorLite[] = (featuredData?.data?.featuredRestaurants ?? []).map((f: any) => f.vendor).filter(Boolean);
  const vendors: VendorLite[] = (vendorsData?.data as any)?.items ?? vendorsData?.data ?? [];

  return (
    <>
      {/* Hero */}
      <section className="bg-[#0f2547] text-[#f5f0e8]">
        <div className="max-w-6xl mx-auto px-5 py-20 md:py-28 text-center">
          <p className="text-[12px] font-semibold tracking-[0.25em] uppercase text-[#c9a84c]">Restaurant reservations · Nigeria</p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl font-semibold leading-[1.05]">
            Your table,<br /><em className="not-italic text-[#c9a84c]">actually waiting.</em>
          </h1>
          <p className="mt-5 text-[16px] text-[rgba(245,240,232,0.75)] max-w-xl mx-auto leading-relaxed">
            Reserve at Nigeria’s best restaurants with a small, refundable credit deposit. Show up and get it back — plus a bonus.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/restaurants" className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-[#c9a84c] text-[#070f1e] font-semibold hover:bg-[#b8973f] transition-colors">
              <Search className="h-5 w-5" /> Find a restaurant
            </Link>
            <Link href={isAuthenticated ? '/bookings' : '/register'} className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl border border-[rgba(201,168,76,0.4)] text-[#f5f0e8] font-semibold hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              {isAuthenticated ? <><CalendarDays className="h-5 w-5" /> My reservations</> : 'Create free account'}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-5 py-14">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[12px] font-semibold tracking-wider uppercase text-[#c9a84c]">Featured</p>
              <h2 className="font-display text-3xl font-semibold text-ink">Spotlight restaurants</h2>
            </div>
            <Link href="/restaurants" className="text-[14px] font-medium text-[#c9a84c] hover:underline flex items-center gap-1">
              See all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((v) => <RestaurantCard key={v.id} vendor={v} />)}
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how-it-works" className="bg-surface2">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <div className="text-center mb-10">
            <p className="text-[12px] font-semibold tracking-wider uppercase text-[#c9a84c]">How it works</p>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink">Booking that actually holds</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(201,168,76,0.12)] mb-4">
                  <s.icon className="h-5 w-5 text-[#c9a84c]" />
                </div>
                <p className="text-[12px] font-bold text-[#c9a84c] mb-1">Step {i + 1}</p>
                <h3 className="font-semibold text-ink mb-1.5">{s.title}</h3>
                <p className="text-[13px] text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-3xl font-semibold text-ink">Popular right now</h2>
          <Link href="/restaurants" className="text-[14px] font-medium text-[#c9a84c] hover:underline flex items-center gap-1">
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card aspect-[4/3] animate-pulse bg-surface2" />)}
          </div>
        ) : vendors.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {vendors.slice(0, 8).map((v) => <RestaurantCard key={v.id} vendor={v} />)}
          </div>
        ) : (
          <p className="text-muted">No restaurants yet — check back soon.</p>
        )}
      </section>
    </>
  );
}
