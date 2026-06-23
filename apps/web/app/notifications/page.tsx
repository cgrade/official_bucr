'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate, cn } from '@/lib/utils';

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated, ready } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/notifications'); }, [ready, isAuthenticated, router]);

  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsApi.getAll({ limit: 50 }), enabled: isAuthenticated });
  const items: any[] = (data?.data as any)?.items ?? (data?.data as any)?.notifications ?? data?.data ?? [];

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (!ready || !isAuthenticated) return <div className="max-w-2xl mx-auto px-5 py-20 text-center text-muted">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-ink">Notifications</h1>
        {items.some((n) => !n.read && !n.isRead) && (
          <button onClick={() => markAll.mutate()} className="flex items-center gap-1.5 text-[13px] font-medium text-[#c9a84c] hover:underline"><CheckCheck className="h-4 w-4" /> Mark all read</button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="card h-16 animate-pulse bg-surface2" />)}</div>
      ) : items.length ? (
        <div className="card mt-6 divide-y divide-line">
          {items.map((n) => {
            const unread = !(n.read || n.isRead);
            return (
              <button key={n.id} onClick={() => unread && markOne.mutate(n.id)} className={cn('w-full text-left flex gap-3 px-5 py-4', unread && 'bg-[rgba(201,168,76,0.05)]')}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(201,168,76,0.12)] flex-shrink-0"><Bell className="h-4 w-4 text-[#c9a84c]" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-ink">{n.title}</p>
                  {n.body && <p className="text-[13px] text-muted mt-0.5">{n.body || n.message}</p>}
                  <p className="text-[11px] text-muted mt-1">{formatDate(n.createdAt)}</p>
                </div>
                {unread && <span className="h-2 w-2 rounded-full bg-[#c9a84c] mt-2 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 text-center text-muted">
          <Bell className="h-10 w-10 mx-auto text-[#c9a84c]" />
          <p className="mt-3 text-lg text-ink">No notifications</p>
          <p className="text-sm">You’re all caught up.</p>
        </div>
      )}
    </div>
  );
}
