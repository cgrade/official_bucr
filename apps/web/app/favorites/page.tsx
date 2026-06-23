'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { favoritesApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { RestaurantCard, type VendorLite } from '@/components/RestaurantCard';
import { useAuthStore } from '@/stores/auth.store';

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/favorites'); }, [ready, isAuthenticated, router]);

  const { data, isLoading } = useQuery({ queryKey: ['favorites'], queryFn: () => favoritesApi.getAll(), enabled: isAuthenticated });
  const favorites: VendorLite[] = ((data?.data as any) ?? []).map((f: any) => f.vendor ?? f).filter(Boolean);

  if (!ready || !isAuthenticated) return <div className="max-w-6xl mx-auto px-5 py-20 text-center text-muted">Loading…</div>;

  return (
    <div className="max-w-6xl mx-auto px-5 py-10">
      <h1 className="font-display text-4xl font-semibold text-ink flex items-center gap-2"><Heart className="h-7 w-7 text-[#c9a84c]" fill="#c9a84c" /> Saved</h1>
      {isLoading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card aspect-[4/3] animate-pulse bg-surface2" />)}</div>
      ) : favorites.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((v) => <RestaurantCard key={v.id} vendor={v} />)}</div>
      ) : (
        <div className="mt-12 text-center">
          <Heart className="h-10 w-10 mx-auto text-[#c9a84c]" />
          <p className="text-lg text-ink mt-3">No saved restaurants yet</p>
          <p className="text-sm text-muted">Tap the heart on any restaurant to save it here.</p>
          <Link href="/restaurants"><Button className="mt-5">Find a restaurant</Button></Link>
        </div>
      )}
    </div>
  );
}
