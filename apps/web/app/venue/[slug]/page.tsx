'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star, MapPin, Phone, Clock, ShieldCheck, Users, ArrowLeft } from 'lucide-react';
import { vendorsApi, reservationsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { getImageUrl, getReservationDeposit, formatNaira, creditsToNaira, cn } from '@/lib/utils';

const TIMES = ['12:00', '12:30', '13:00', '13:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading } = useQuery({ queryKey: ['vendor', slug], queryFn: () => vendorsApi.getBySlug(slug), enabled: !!slug });
  const vendor = data?.data;

  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [partySize, setPartySize] = useState(2);

  const book = useMutation({
    mutationFn: () => reservationsApi.create({ vendorId: vendor.id, date, time, partySize }),
    onSuccess: (res) => {
      toast.success('Reservation confirmed!');
      const id = (res.data as any)?.id;
      router.push(id ? `/bookings?new=${id}` : '/bookings');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || err.response?.data?.message || 'Could not complete reservation'),
  });

  const onReserve = () => {
    if (!isAuthenticated) { router.push(`/login?redirect=/venue/${slug}`); return; }
    book.mutate();
  };

  if (isLoading) return <div className="max-w-5xl mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;
  if (!vendor) return (
    <div className="max-w-5xl mx-auto px-5 py-20 text-center">
      <p className="text-lg text-[#0f2547]">Restaurant not found</p>
      <Button variant="outline" className="mt-4" onClick={() => router.push('/restaurants')}>Browse restaurants</Button>
    </div>
  );

  const img = getImageUrl(vendor.coverImage || vendor.galleryImages?.[0]?.url || vendor.logo);
  const branch = vendor.branches?.[0] || vendor.mainBranch;
  const deposit = getReservationDeposit(vendor.venueType, vendor.customDepositCredits);
  const menu: any[] = (vendor.menus?.flatMap((m: any) => m.items || []) ?? vendor.menuItems ?? []).slice(0, 6);

  return (
    <div>
      {/* Hero */}
      <div className="relative h-[42vh] min-h-[280px] bg-[#0f2547]">
        {img && <img src={img} alt={vendor.businessName} className="w-full h-full object-cover opacity-80" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2547] via-transparent to-transparent" />
        <button onClick={() => router.back()} className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0f2547]">
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-5 -mt-16 relative grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Main */}
        <div>
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl font-semibold text-[#0f2547]">{vendor.businessName}</h1>
                <p className="mt-1 text-[14px] text-[#7a8fa6]">
                  {(vendor.cuisineTypes?.join(' · ')) || 'Restaurant'}
                  {vendor.priceLevel ? <span className="text-[#c9a84c]"> · {'₦'.repeat(vendor.priceLevel)}</span> : null}
                </p>
              </div>
              {vendor.averageRating ? (
                <span className="flex items-center gap-1 text-[15px] font-semibold text-[#0f2547]">
                  <Star className="h-4 w-4 text-[#c9a84c]" fill="#c9a84c" /> {vendor.averageRating.toFixed(1)}
                  <span className="text-[12px] text-[#7a8fa6] font-normal">({vendor.totalReviews || 0})</span>
                </span>
              ) : null}
            </div>

            {vendor.bookWithConfidence && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[rgba(201,168,76,0.12)] px-3 py-1 text-[12px] font-semibold text-[#0f2547]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#c9a84c]" /> Book with Confidence
              </div>
            )}

            {vendor.description && <p className="mt-4 text-[14px] text-[#3a4a5f] leading-relaxed">{vendor.description}</p>}

            <div className="mt-5 space-y-2 text-[14px] text-[#3a4a5f]">
              {branch?.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#c9a84c]" /> {branch.address}{branch.city ? `, ${branch.city}` : ''}</p>}
              {branch?.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#c9a84c]" /> {branch.phone}</p>}
            </div>
          </div>

          {menu.length > 0 && (
            <div className="card p-6 mt-6">
              <h2 className="font-display text-2xl font-semibold text-[#0f2547] mb-4">Popular dishes</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {menu.map((d) => (
                  <div key={d.id} className="flex gap-3">
                    {getImageUrl(d.image) ? (
                      <img src={getImageUrl(d.image)!} alt={d.name} className="h-16 w-16 rounded-lg object-cover" />
                    ) : <div className="h-16 w-16 rounded-lg bg-[#eef1f5]" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#0f2547] text-[14px] truncate">{d.name}</p>
                      <p className="text-[12px] text-[#7a8fa6] line-clamp-2">{d.description}</p>
                      <p className="text-[13px] font-semibold text-[#c9a84c] mt-0.5">{formatNaira(Number(d.price || 0))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reserve panel */}
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-[#0f2547]">Reserve a table</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#7a8fa6] mb-1">Date</label>
                <input type="date" value={date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[rgba(15,37,71,0.18)] px-3 text-[#0f2547] focus:outline-none focus:border-[#c9a84c]" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#7a8fa6] mb-1">Time</label>
                <div className="flex flex-wrap gap-1.5">
                  {TIMES.map((t) => (
                    <button key={t} onClick={() => setTime(t)}
                      className={cn('px-2.5 h-8 rounded-lg text-[12px] font-medium border',
                        time === t ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-[#0f2547]' : 'border-[rgba(15,37,71,0.15)] text-[#7a8fa6]')}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#7a8fa6] mb-1">Party size</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPartySize(Math.max(1, partySize - 1))} className="h-9 w-9 rounded-lg border border-[rgba(15,37,71,0.18)] text-[#0f2547] text-lg">−</button>
                  <span className="flex items-center gap-1.5 text-[#0f2547] font-semibold"><Users className="h-4 w-4 text-[#c9a84c]" /> {partySize}</span>
                  <button onClick={() => setPartySize(Math.min(20, partySize + 1))} className="h-9 w-9 rounded-lg border border-[rgba(15,37,71,0.18)] text-[#0f2547] text-lg">+</button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[rgba(201,168,76,0.08)] p-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[#7a8fa6]">Refundable deposit</span>
                <span className="font-bold text-[#0f2547]">{formatNaira(creditsToNaira(deposit))}</span>
              </div>
              <p className="mt-1 text-[11px] text-[#7a8fa6]">{deposit.toLocaleString()} credits · flat, any party size. Returned +3% when you check in.</p>
            </div>

            <Button size="lg" className="w-full mt-4" loading={book.isPending} onClick={onReserve}>
              {isAuthenticated ? 'Confirm reservation' : 'Sign in to reserve'}
            </Button>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-[#7a8fa6]"><Clock className="h-3 w-3" /> Free cancellation 24h+ before</p>
          </div>
        </div>
      </div>
    </div>
  );
}
