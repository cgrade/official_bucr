'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star, MapPin, Phone, Clock, ShieldCheck, Users, ArrowLeft, Heart, Navigation, ChefHat, ChevronDown } from 'lucide-react';
import { vendorsApi, reservationsApi, favoritesApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { getImageUrl, getReservationDeposit, formatNaira, creditsToNaira, formatDate, cn } from '@/lib/utils';

const TIMES = ['12:00', '12:30', '13:00', '13:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Tab = 'overview' | 'menu' | 'photos' | 'reviews';

export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({ queryKey: ['vendor', slug], queryFn: () => vendorsApi.getBySlug(slug), enabled: !!slug });
  const vendor = data?.data;

  const [tab, setTab] = useState<Tab>('overview');
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [partySize, setPartySize] = useState(2);
  const [favorited, setFavorited] = useState(false);
  // Optional pre-order: itemId -> { name, price, quantity }
  const [preorder, setPreorder] = useState<Record<string, { name: string; price: number | null; quantity: number }>>({});
  const [showPreorder, setShowPreorder] = useState(false);
  useEffect(() => { if (vendor?.isFavorited != null) setFavorited(!!vendor.isFavorited); }, [vendor?.isFavorited]);

  const preorderCount = Object.values(preorder).reduce((s, i) => s + i.quantity, 0);
  const setQty = (id: string, name: string, price: number | null, qty: number) =>
    setPreorder((cur) => {
      const next = { ...cur };
      if (qty <= 0) delete next[id]; else next[id] = { name, price, quantity: qty };
      return next;
    });

  const book = useMutation({
    mutationFn: () => reservationsApi.create({
      vendorId: vendor.id, date, time, partySize,
      preorderItems: Object.entries(preorder).map(([menuItemId, v]) => ({ menuItemId, name: v.name, quantity: v.quantity })),
    }),
    onSuccess: (res) => {
      toast.success('Reservation confirmed!');
      const id = (res.data as any)?.id;
      router.push(id ? `/bookings/${id}` : '/bookings');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || err.response?.data?.message || 'Could not complete reservation'),
  });

  const toggleFavorite = useMutation({
    mutationFn: () => (favorited ? favoritesApi.remove(vendor.id) : favoritesApi.add(vendor.id)),
    onMutate: () => setFavorited((f) => !f),
    onError: () => { setFavorited((f) => !f); toast.error('Could not update saved'); },
  });

  const onReserve = () => { if (!isAuthenticated) { router.push(`/login?redirect=/venue/${slug}`); return; } book.mutate(); };
  const onToggleFavorite = () => { if (!isAuthenticated) { router.push(`/login?redirect=/venue/${slug}`); return; } toggleFavorite.mutate(); };

  if (isLoading) return <div className="max-w-5xl mx-auto px-5 py-20 text-center text-muted">Loading…</div>;
  if (!vendor) return (
    <div className="max-w-5xl mx-auto px-5 py-20 text-center">
      <p className="text-lg text-ink">Restaurant not found</p>
      <Button variant="outline" className="mt-4" onClick={() => router.push('/restaurants')}>Browse restaurants</Button>
    </div>
  );

  const img = getImageUrl(vendor.coverImage || vendor.gallery?.[0]?.url || vendor.logo);
  const branch = vendor.branches?.[0];
  const deposit = getReservationDeposit(vendor.venueType, vendor.customDepositCredits);
  const menu: any[] = (vendor.menu ?? []).filter((c: any) => (c.items?.length ?? 0) > 0);
  const popularDishes: any[] = vendor.popularDishes ?? [];
  const gallery: any[] = vendor.gallery ?? [];
  const reviews: any[] = vendor.reviews ?? [];
  const hours: any[] = Array.isArray(branch?.operatingHours) ? branch.operatingHours : [];

  const TABS: { id: Tab; label: string; show: boolean }[] = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'menu', label: 'Menu', show: menu.length > 0 },
    { id: 'photos', label: 'Photos', show: gallery.length > 0 },
    { id: 'reviews', label: `Reviews${vendor.totalReviews ? ` (${vendor.totalReviews})` : ''}`, show: true },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="relative h-[42vh] min-h-[280px] bg-[#0f2547]">
        {img && <img src={img} alt={vendor.businessName} className="w-full h-full object-cover opacity-80" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2547] via-transparent to-transparent" />
        <button onClick={() => router.back()} className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0f2547]"><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={onToggleFavorite} aria-label="Save" className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
          <Heart className={cn('h-5 w-5', favorited ? 'text-red-500' : 'text-[#0f2547]')} fill={favorited ? '#ef4444' : 'none'} />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-5 -mt-16 relative grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Main */}
        <div>
          {/* Header card */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl font-semibold text-ink">{vendor.businessName}</h1>
                <p className="mt-1 text-[14px] text-muted">
                  {(vendor.cuisineTypes?.join(' · ')) || 'Restaurant'}
                  {vendor.priceLevel ? <span className="text-[#c9a84c]"> · {'₦'.repeat(vendor.priceLevel)}</span> : null}
                </p>
              </div>
              {vendor.averageRating ? (
                <span className="flex items-center gap-1 text-[15px] font-semibold text-ink">
                  <Star className="h-4 w-4 text-[#c9a84c]" fill="#c9a84c" /> {vendor.averageRating.toFixed(1)}
                  <span className="text-[12px] text-muted font-normal">({vendor.totalReviews || 0})</span>
                </span>
              ) : null}
            </div>
            {vendor.bookWithConfidence && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(201,168,76,0.12)] px-3 py-1 text-[12px] font-semibold text-ink">
                <ShieldCheck className="h-3.5 w-3.5 text-[#c9a84c]" /> Book with Confidence
              </div>
            )}
            {vendor.displaySettings?.promoEnabled && vendor.displaySettings?.promoMessage && (
              <div className="mt-3 rounded-xl bg-[rgba(201,168,76,0.1)] px-4 py-2.5 text-[13px] text-ink">🎉 {vendor.displaySettings.promoMessage}</div>
            )}
          </div>

          {/* Tabs */}
          <div className="sticky top-16 z-10 mt-6 -mx-5 px-5 bg-[var(--bg-blur)] backdrop-blur border-b border-line">
            <div className="flex gap-1 overflow-x-auto">
              {TABS.filter((t) => t.show).map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn('px-4 py-3 text-[14px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                    tab === t.id ? 'border-[#c9a84c] text-ink' : 'border-transparent text-muted hover:text-ink')}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="mt-6 space-y-6">
              {vendor.description && (
                <section className="card p-6">
                  <h2 className="font-display text-2xl font-semibold text-ink mb-2">About</h2>
                  <p className="text-[14px] text-body leading-relaxed whitespace-pre-line">{vendor.description}</p>
                </section>
              )}
              <section className="card p-6">
                <h2 className="font-display text-2xl font-semibold text-ink mb-3">Location & hours</h2>
                <div className="space-y-2 text-[14px] text-body">
                  {branch?.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#c9a84c]" /> {branch.address}{branch.city ? `, ${branch.city}` : ''}</p>}
                  {branch?.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#c9a84c]" /> {branch.phone}</p>}
                </div>
                {(branch?.latitude && branch?.longitude) && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#c9a84c] hover:underline">
                    <Navigation className="h-4 w-4" /> Get directions
                  </a>
                )}
                {hours.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
                    {[...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
                      <div key={h.dayOfWeek} className="flex justify-between border-b border-line py-1">
                        <span className="text-muted">{DAY_LABELS[h.dayOfWeek] ?? `Day ${h.dayOfWeek}`}</span>
                        <span className="text-ink">{h.isClosed ? 'Closed' : `${h.openTime} – ${h.closeTime}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              {popularDishes.length > 0 && (
                <section className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-2xl font-semibold text-ink">Popular dishes</h2>
                    {menu.length > 0 && <button onClick={() => setTab('menu')} className="text-[13px] font-semibold text-[#c9a84c] hover:underline">Full menu</button>}
                  </div>
                  {/* Ranked by how often diners pre-order them */}
                  <div className="divide-y divide-line">
                    {popularDishes.map((d: any) => (
                      <div key={d.id} className="flex gap-3 py-3 first:pt-0">
                        {getImageUrl(d.image) ? <img src={getImageUrl(d.image)!} alt={d.name} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" /> : <div className="h-14 w-14 rounded-lg bg-surface2 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-ink text-[14px]">{d.name}</p>
                            {d.price != null && <p className="text-[13px] font-semibold text-[#c9a84c] whitespace-nowrap">{formatNaira(Number(d.price))}</p>}
                          </div>
                          {d.description && <p className="text-[12px] text-muted line-clamp-1">{d.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* MENU */}
          {tab === 'menu' && (
            <div className="mt-6 space-y-6">
              {menu.map((cat) => (
                <section key={cat.id} className="card p-6">
                  <h2 className="font-display text-2xl font-semibold text-ink">{cat.name}</h2>
                  {cat.description && <p className="text-[13px] text-muted mt-0.5 mb-3">{cat.description}</p>}
                  <div className="mt-3 divide-y divide-line">
                    {cat.items.map((d: any) => (
                      <div key={d.id} className="flex gap-4 py-3.5">
                        {getImageUrl(d.image) ? <img src={getImageUrl(d.image)!} alt={d.name} className="h-20 w-20 rounded-lg object-cover flex-shrink-0" /> : null}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium text-ink">{d.name}</p>
                            {d.price != null && <p className="text-[14px] font-semibold text-[#c9a84c] whitespace-nowrap">{formatNaira(Number(d.price))}</p>}
                          </div>
                          {d.description && <p className="text-[13px] text-muted mt-0.5">{d.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* PHOTOS */}
          {tab === 'photos' && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {gallery.map((g) => (
                <div key={g.id} className="aspect-square rounded-xl overflow-hidden bg-surface2">
                  <img src={getImageUrl(g.url)!} alt={g.caption || vendor.businessName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          )}

          {/* REVIEWS */}
          {tab === 'reviews' && (
            <div className="mt-6">
              <div className="card p-6 flex items-center gap-6">
                <div className="text-center">
                  <p className="font-display text-5xl font-semibold text-ink">{vendor.averageRating ? vendor.averageRating.toFixed(1) : '—'}</p>
                  <div className="flex justify-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} className="h-4 w-4" fill={n <= Math.round(vendor.averageRating || 0) ? '#c9a84c' : 'none'} color="#c9a84c" />)}
                  </div>
                  <p className="text-[12px] text-muted mt-1">{vendor.totalReviews || 0} reviews</p>
                </div>
              </div>
              {reviews.length > 0 ? (
                <div className="card mt-4 divide-y divide-line">
                  {reviews.map((rv) => (
                    <div key={rv.id} className="p-5">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-ink text-[14px]">{rv.user?.name || 'Guest'}</p>
                        <span className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className="h-3.5 w-3.5" fill={n <= rv.rating ? '#c9a84c' : 'none'} color="#c9a84c" />)}</span>
                      </div>
                      {(rv.text || rv.comment) && <p className="mt-1.5 text-[14px] text-body">{rv.text || rv.comment}</p>}
                      {rv.vendorResponse && (
                        <div className="mt-2 rounded-lg bg-[var(--fill)] px-3 py-2 text-[13px]"><span className="font-semibold text-ink">Response: </span><span className="text-body">{rv.vendorResponse}</span></div>
                      )}
                      <p className="mt-1.5 text-[12px] text-muted">{formatDate(rv.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mt-6 text-center">No reviews yet — be the first after your visit.</p>
              )}
            </div>
          )}
        </div>

        {/* Reserve panel */}
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-ink">Reserve a table</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">Date</label>
                <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 rounded-xl border border-line bg-surface px-3 text-ink focus:outline-none focus:border-[#c9a84c]" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">Time</label>
                <div className="flex flex-wrap gap-1.5">
                  {TIMES.map((t) => (
                    <button key={t} onClick={() => setTime(t)}
                      className={cn('px-2.5 h-8 rounded-lg text-[12px] font-medium border',
                        time === t ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-ink' : 'border-line text-muted')}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-muted mb-1">Party size</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPartySize(Math.max(1, partySize - 1))} className="h-9 w-9 rounded-lg border border-line text-ink text-lg">−</button>
                  <span className="flex items-center gap-1.5 text-ink font-semibold"><Users className="h-4 w-4 text-[#c9a84c]" /> {partySize}</span>
                  <button onClick={() => setPartySize(Math.min(20, partySize + 1))} className="h-9 w-9 rounded-lg border border-line text-ink text-lg">+</button>
                </div>
              </div>
            </div>

            {/* Optional pre-order */}
            {menu.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <button onClick={() => setShowPreorder((s) => !s)} className="flex w-full items-center justify-between text-[13px] font-semibold text-ink">
                  <span className="flex items-center gap-1.5"><ChefHat className="h-4 w-4 text-[#c9a84c]" /> Pre-order dishes (optional){preorderCount > 0 ? ` · ${preorderCount}` : ''}</span>
                  <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', showPreorder && 'rotate-180')} />
                </button>
                {showPreorder && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] text-muted">Help the kitchen prep ahead — you still pay for the meal at the venue.</p>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {menu.flatMap((c) => c.items).map((it: any) => {
                        const q = preorder[it.id]?.quantity ?? 0;
                        return (
                          <div key={it.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[13px] text-ink truncate">{it.name}</p>
                              {it.price != null && <p className="text-[11px] text-[#c9a84c]">{formatNaira(Number(it.price))}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => setQty(it.id, it.name, it.price ?? null, q - 1)} className="h-7 w-7 rounded-lg border border-line text-ink">−</button>
                              <span className="w-5 text-center text-[13px] text-ink">{q}</span>
                              <button onClick={() => setQty(it.id, it.name, it.price ?? null, q + 1)} className="h-7 w-7 rounded-lg border border-line text-ink">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 rounded-xl bg-[rgba(201,168,76,0.08)] p-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-muted">Refundable deposit</span>
                <span className="font-bold text-ink">{formatNaira(creditsToNaira(deposit))}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted">{deposit.toLocaleString()} credits · flat, any party size. Returned +3% when you check in.</p>
            </div>
            <Button size="lg" className="w-full mt-4" loading={book.isPending} onClick={onReserve}>
              {isAuthenticated ? 'Confirm reservation' : 'Sign in to reserve'}
            </Button>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-muted"><Clock className="h-3 w-3" /> Free cancellation 24h+ before</p>
          </div>
        </div>
      </div>
    </div>
  );
}
