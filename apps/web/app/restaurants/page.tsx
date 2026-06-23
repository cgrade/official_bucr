'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { vendorsApi } from '@/lib/api';
import { RestaurantCard, type VendorLite } from '@/components/RestaurantCard';
import { cn } from '@/lib/utils';

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Top rated' },
  { id: 'price_low', label: 'Price: Low' },
  { id: 'price_high', label: 'Price: High' },
];

export default function RestaurantsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState('recommended');

  // simple debounce
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
  }

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', 'browse', debounced, sort],
    queryFn: () => vendorsApi.getAll({ limit: 24, ...(debounced ? { search: debounced } : {}), ...(sort !== 'recommended' ? { sort } : {}) }),
  });
  const vendors: VendorLite[] = (data?.data as any)?.items ?? data?.data ?? [];
  const total = (data?.data as any)?.pagination?.total ?? vendors.length;

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-semibold text-[#0f2547]">Find a restaurant</h1>
      <p className="mt-1 text-[#7a8fa6]">Discover and reserve tables across Nigeria.</p>

      <form
        onSubmit={(e) => { e.preventDefault(); setDebounced(search.trim()); }}
        className="mt-6 flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7a8fa6]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants or cuisines…"
            className="w-full h-12 pl-11 pr-4 rounded-xl border border-[rgba(15,37,71,0.18)] bg-white text-[#0f2547] placeholder:text-[#7a8fa6] focus:outline-none focus:border-[#c9a84c] focus:ring-2 focus:ring-[rgba(201,168,76,0.3)]"
          />
        </div>
        <button type="submit" className="h-12 px-6 rounded-xl bg-[#c9a84c] text-[#070f1e] font-semibold hover:bg-[#b8973f]">Search</button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button key={s.id} onClick={() => setSort(s.id)}
            className={cn('px-3.5 h-9 rounded-full text-[13px] font-medium border transition-colors',
              sort === s.id ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-[#0f2547]' : 'border-[rgba(15,37,71,0.15)] text-[#7a8fa6] hover:border-[#c9a84c]')}>
            {s.label}
          </button>
        ))}
      </div>

      <p className="mt-6 text-[13px] text-[#7a8fa6]">{total} {total === 1 ? 'place' : 'places'}{debounced ? ` for “${debounced}”` : ''}</p>

      {isLoading ? (
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card aspect-[4/3] animate-pulse bg-[#eef1f5]" />)}
        </div>
      ) : vendors.length ? (
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => <RestaurantCard key={v.id} vendor={v} />)}
        </div>
      ) : (
        <div className="mt-12 text-center text-[#7a8fa6]">
          <p className="text-lg">No restaurants found</p>
          <p className="text-sm mt-1">Try a different search.</p>
        </div>
      )}
    </div>
  );
}
