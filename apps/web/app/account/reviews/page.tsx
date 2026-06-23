'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Star } from 'lucide-react';
import { reviewsApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate, cn } from '@/lib/utils';

function ReviewsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const reservationId = params.get('reservation');
  const { isAuthenticated, ready } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/account/reviews'); }, [ready, isAuthenticated, router]);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['my-reviews'], queryFn: () => reviewsApi.getMine(), enabled: isAuthenticated });
  const reviews: any[] = (data?.data as any)?.items ?? data?.data ?? [];

  const submit = useMutation({
    mutationFn: () => reviewsApi.create({ reservationId: reservationId!, rating, comment: comment.trim() || undefined }),
    onSuccess: () => { toast.success('Thanks for your review!'); qc.invalidateQueries({ queryKey: ['my-reviews'] }); router.push('/account/reviews'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Could not submit review'),
  });

  if (!ready || !isAuthenticated) return <div className="py-20 text-center text-muted">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[14px] text-muted hover:text-ink mb-5"><ArrowLeft className="h-4 w-4" /> Back</button>

      {reservationId && (
        <div className="card p-6 mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">Leave a review</h1>
          <div className="mt-4 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
                <Star className={cn('h-8 w-8', n <= rating ? 'text-[#c9a84c]' : 'text-[rgba(15,37,71,0.18)]')} fill={n <= rating ? '#c9a84c' : 'none'} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Tell others about your experience…"
            className="mt-4 w-full rounded-xl border border-line p-3 text-[14px] text-ink focus:outline-none focus:border-[#c9a84c]" />
          <Button className="w-full mt-3" loading={submit.isPending} onClick={() => submit.mutate()}>Submit review</Button>
        </div>
      )}

      <h2 className="font-display text-2xl font-semibold text-ink mb-4">Your reviews</h2>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-24 animate-pulse bg-surface2" />)}</div>
      ) : reviews.length ? (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink">{r.vendor?.businessName || 'Restaurant'}</h3>
                <span className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className="h-3.5 w-3.5" fill={n <= r.rating ? '#c9a84c' : 'none'} color="#c9a84c" />)}</span>
              </div>
              {r.comment && <p className="mt-2 text-[14px] text-body">{r.comment}</p>}
              <p className="mt-2 text-[12px] text-muted">{formatDate(r.createdAt)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">You haven’t left any reviews yet. Reviews unlock after a completed visit.</p>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-5 py-20 text-center text-muted">Loading…</div>}>
      <ReviewsContent />
    </Suspense>
  );
}
