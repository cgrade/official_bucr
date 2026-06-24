'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, SlidersHorizontal, Map as MapIcon, List, Navigation, X, Star } from 'lucide-react';
import { vendorsApi, configApi } from '@/lib/api';
import { RestaurantCard, type VendorLite } from '@/components/RestaurantCard';
import { VendorsMap } from '@/components/VendorsMap';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const CUISINES = ['Nigerian', 'African', 'Continental', 'Chinese', 'Lebanese', 'Italian', 'Seafood', 'Grill', 'Fast Food', 'Pastries', 'Vegan'];
const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Top rated' },
  { id: 'price_low', label: 'Price: Low' },
  { id: 'price_high', label: 'Price: High' },
];
const PRICES = [1, 2, 3, 4];

export default function RestaurantsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [sort, setSort] = useState('recommended');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);

  // filters
  const [prices, setPrices] = useState<number[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [openNow, setOpenNow] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);

  // debounce the free-text search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const effectiveSort = coords && sort === 'recommended' ? 'distance' : sort;

  const { data: priceRangeData } = useQuery({ queryKey: ['price-ranges'], queryFn: () => configApi.getPriceRanges(), staleTime: 5 * 60_000 });
  const priceRanges: Array<{ level: number; symbol: string; label: string }> = (priceRangeData?.data as any)?.ranges ?? [];
  const rangeLabel = (level: number) => priceRanges.find((r) => r.level === level)?.label;

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', 'browse', debounced, cuisine, sort, prices, minRating, openNow, coords, radiusKm],
    queryFn: () => vendorsApi.getAll({
      limit: 48,
      ...(debounced ? { search: debounced } : {}),
      ...(cuisine ? { cuisineType: cuisine } : {}),
      ...(effectiveSort !== 'recommended' ? { sort: effectiveSort } : {}),
      ...(prices.length ? { priceLevel: [...prices].sort().join(',') } : {}),
      ...(minRating ? { minRating } : {}),
      ...(openNow ? { openNow: true } : {}),
      ...(coords ? { lat: coords.lat, lng: coords.lng, radiusKm } : {}),
    }),
  });
  const vendors: VendorLite[] = (data?.data as any)?.items ?? data?.data ?? [];
  const total = (data?.data as any)?.pagination?.total ?? vendors.length;

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Location not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); toast.success('Showing places near you'); },
      () => toast.error('Could not get your location'),
    );
  };

  const togglePrice = (p: number) => setPrices((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const activeFilterCount = prices.length + (minRating ? 1 : 0) + (openNow ? 1 : 0) + (coords ? 1 : 0);
  const clearFilters = () => { setPrices([]); setMinRating(0); setOpenNow(false); setCoords(null); };

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-semibold text-ink">Find a restaurant</h1>
      <p className="mt-1 text-muted">Discover and reserve tables across Nigeria.</p>

      {/* Search */}
      <div className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants or cuisines…"
            className="w-full h-12 pl-11 pr-4 rounded-xl border border-line bg-surface text-ink placeholder:text-muted focus:outline-none focus:border-[#c9a84c] focus:ring-2 focus:ring-[rgba(201,168,76,0.3)]"
          />
        </div>
        <button onClick={() => setShowFilters((s) => !s)}
          className={cn('h-12 px-4 rounded-xl border flex items-center gap-2 text-[14px] font-medium', activeFilterCount ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.1)] text-ink' : 'border-line text-ink')}>
          <SlidersHorizontal className="h-4 w-4" /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </button>
      </div>

      {/* Cuisine categories */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setCuisine(null)} className={cn('px-3.5 h-9 rounded-full text-[13px] font-medium border whitespace-nowrap', !cuisine ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-ink' : 'border-line text-muted hover:text-ink')}>All</button>
        {CUISINES.map((c) => (
          <button key={c} onClick={() => setCuisine(cuisine === c ? null : c)}
            className={cn('px-3.5 h-9 rounded-full text-[13px] font-medium border whitespace-nowrap', cuisine === c ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-ink' : 'border-line text-muted hover:text-ink')}>{c}</button>
        ))}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-5 mt-4 space-y-4">
          <div>
            <p className="text-[13px] font-semibold text-ink mb-2">Price <span className="text-muted font-normal">(spend per person)</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRICES.map((p) => (
                <button key={p} onClick={() => togglePrice(p)}
                  className={cn('h-auto py-2 px-3 rounded-lg border text-left transition-colors', prices.includes(p) ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)]' : 'border-line hover:border-[#c9a84c]')}>
                  <span className="block text-[14px] font-semibold text-[#c9a84c]">{'₦'.repeat(p)}</span>
                  {rangeLabel(p) && <span className="block text-[11px] text-muted mt-0.5">{rangeLabel(p)}</span>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink mb-2">Minimum rating</p>
            <div className="flex gap-2">
              {[0, 3, 3.5, 4, 4.5].map((r) => (
                <button key={r} onClick={() => setMinRating(r)} className={cn('h-9 px-3 rounded-lg border text-[13px] font-medium flex items-center gap-1', minRating === r ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-ink' : 'border-line text-muted')}>
                  {r === 0 ? 'Any' : <>{r}<Star className="h-3 w-3 text-[#c9a84c]" fill="#c9a84c" /></>}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setOpenNow((v) => !v)} className={cn('h-9 px-4 rounded-lg border text-[13px] font-medium', openNow ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-ink' : 'border-line text-muted')}>Open now</button>
            <button onClick={coords ? () => setCoords(null) : useMyLocation} className={cn('h-9 px-4 rounded-lg border text-[13px] font-medium flex items-center gap-1.5', coords ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-ink' : 'border-line text-muted')}>
              <Navigation className="h-3.5 w-3.5" /> {coords ? `Near me · ${radiusKm}km` : 'Near me'}
            </button>
            {coords && (
              <input type="range" min={1} max={50} value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} className="accent-[#c9a84c] flex-1 min-w-[120px]" />
            )}
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-[13px] font-medium text-muted hover:text-ink"><X className="h-3.5 w-3.5" /> Clear filters</button>
          )}
        </div>
      )}

      {/* Sort + view toggle */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <button key={s.id} onClick={() => setSort(s.id)}
              className={cn('px-3.5 h-9 rounded-full text-[13px] font-medium border', sort === s.id ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-ink' : 'border-line text-muted hover:text-ink')}>{s.label}</button>
          ))}
        </div>
        <div className="flex rounded-lg border border-line overflow-hidden flex-shrink-0">
          <button onClick={() => setView('list')} className={cn('h-9 px-3 flex items-center gap-1.5 text-[13px] font-medium', view === 'list' ? 'bg-[rgba(201,168,76,0.12)] text-ink' : 'text-muted')}><List className="h-4 w-4" /> List</button>
          <button onClick={() => setView('map')} className={cn('h-9 px-3 flex items-center gap-1.5 text-[13px] font-medium', view === 'map' ? 'bg-[rgba(201,168,76,0.12)] text-ink' : 'text-muted')}><MapIcon className="h-4 w-4" /> Map</button>
        </div>
      </div>

      <p className="mt-5 text-[13px] text-muted">{total} {total === 1 ? 'place' : 'places'}{debounced ? ` for “${debounced}”` : ''}{cuisine ? ` · ${cuisine}` : ''}</p>

      {view === 'map' ? (
        <div className="mt-3"><VendorsMap vendors={vendors as any} /></div>
      ) : isLoading ? (
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card aspect-[4/3] animate-pulse bg-surface2" />)}
        </div>
      ) : vendors.length ? (
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v) => <RestaurantCard key={v.id} vendor={v} />)}
        </div>
      ) : (
        <div className="mt-12 text-center text-muted">
          <p className="text-lg text-ink">No restaurants found</p>
          <p className="text-sm mt-1">Try a different search or clear filters.</p>
          {activeFilterCount > 0 && <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear filters</Button>}
        </div>
      )}
    </div>
  );
}
