'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { eventsApi } from '@/lib/api';
import { getImageUrl, formatNaira, formatDate } from '@/lib/utils';

export default function EventsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['events'], queryFn: () => eventsApi.getUpcoming({ limit: 24 }) });
  const events: any[] = (data?.data as any)?.items ?? (data?.data as any)?.events ?? data?.data ?? [];

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-semibold text-[#0f2547]">Events</h1>
      <p className="mt-1 text-[#7a8fa6]">Tasting menus, chef’s tables, live nights and more.</p>

      {isLoading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card aspect-[4/3] animate-pulse bg-[#eef1f5]" />)}
        </div>
      ) : events.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const img = getImageUrl(e.coverImage || e.image);
            const price = e.ticketPrice ?? e.price;
            return (
              <Link key={e.id} href={`/event/${e.id}`} className="group card overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative aspect-[4/3] bg-[#eef1f5] overflow-hidden">
                  {img ? (
                    <img src={img} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : <div className="w-full h-full flex items-center justify-center"><Ticket className="h-10 w-10 text-[#c9a84c]" /></div>}
                  {e.category && <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#0f2547]">{e.category}</span>}
                </div>
                <div className="p-4">
                  <h3 className="font-display text-[19px] font-semibold text-[#0f2547] leading-tight">{e.title}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#7a8fa6]"><Calendar className="h-3.5 w-3.5" /> {formatDate(e.startDate || e.date)}</p>
                  {(e.venue?.businessName || e.location) && (
                    <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#7a8fa6]"><MapPin className="h-3.5 w-3.5" /> {e.venue?.businessName || e.location}</p>
                  )}
                  {price != null && <p className="mt-2 text-[14px] font-semibold text-[#c9a84c]">{formatNaira(Number(price))}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-16 text-center text-[#7a8fa6]">
          <Ticket className="h-10 w-10 mx-auto text-[#c9a84c]" />
          <p className="mt-3 text-lg text-[#0f2547]">No upcoming events</p>
          <p className="text-sm">Check back soon for special dining experiences.</p>
        </div>
      )}
    </div>
  );
}
