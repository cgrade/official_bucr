'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Star, Flag, EyeOff, Check, Loader2 } from 'lucide-react';
import { reviewsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function AdminReviewsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-reviews'], queryFn: () => reviewsApi.getReported({ reported: true }) });
  const reviews: any[] = data?.data?.reviews ?? [];

  const moderate = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'hide' | 'dismiss' }) => reviewsApi.moderate(id, action),
    onSuccess: (_d, v) => { toast.success(v.action === 'hide' ? 'Review hidden' : 'Report dismissed'); qc.invalidateQueries({ queryKey: ['admin-reviews'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2"><Flag className="w-6 h-6 text-[#c9a84c]" /> Reported Reviews</h1>
        <p className="text-[#7a8fa6] mt-1">Vendors flag suspicious or false reviews here. Hide a confirmed false review, or dismiss an unfounded report.</p>
      </div>

      {isLoading ? (
        <p className="text-[#7a8fa6]">Loading…</p>
      ) : error ? (
        <div className="glass-card rounded-xl p-8 text-center text-[#f5f0e8]">You don&apos;t have permission to moderate reviews.</div>
      ) : reviews.length === 0 ? (
        <div className="glass-card rounded-xl p-10 text-center">
          <Check className="w-9 h-9 mx-auto text-emerald-400 mb-3" />
          <p className="text-[#f5f0e8]">No reported reviews. All clear.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className="w-3.5 h-3.5" fill={n <= r.rating ? '#c9a84c' : 'none'} color="#c9a84c" />)}
                    </span>
                    <span className="text-[12px] text-[#7a8fa6]">by {r.user?.name || 'Guest'} · {r.vendor?.businessName}</span>
                    {!r.isVisible && <span className="text-[10px] rounded-full bg-red-500/15 text-red-400 px-2 py-0.5">Hidden</span>}
                  </div>
                  {r.text && <p className="mt-1.5 text-[14px] text-[#cdd8e6]">{r.text}</p>}
                  {r.reportReason && (
                    <p className="mt-2 text-[12px] text-[#c9a84c]"><span className="font-semibold">Vendor&apos;s report:</span> {r.reportReason}</p>
                  )}
                  <p className="mt-1 text-[11px] text-[#7a8fa6]">Reported {r.reportedAt ? formatDate(r.reportedAt) : ''}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                  onClick={() => moderate.mutate({ id: r.id, action: 'hide' })} disabled={moderate.isPending}>
                  <EyeOff className="w-3.5 h-3.5" /> Hide review
                </Button>
                <Button variant="outline" size="sm"
                  onClick={() => moderate.mutate({ id: r.id, action: 'dismiss' })} disabled={moderate.isPending}>
                  {moderate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Dismiss report
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
