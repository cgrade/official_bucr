'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth.store';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isAuthenticated, ready } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/account/password'); }, [ready, isAuthenticated, router]);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const save = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => { toast.success('Password changed'); router.push('/account'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Could not change password'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (next !== confirm) { toast.error('Passwords do not match'); return; }
    save.mutate();
  };

  if (!ready || !isAuthenticated) return <div className="max-w-md mx-auto px-5 py-20 text-center text-muted">Loading…</div>;

  return (
    <div className="max-w-md mx-auto px-5 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[14px] text-muted hover:text-ink mb-5"><ArrowLeft className="h-4 w-4" /> Back</button>
      <h1 className="font-display text-3xl font-semibold text-ink">Change password</h1>
      <form onSubmit={onSubmit} className="card p-6 mt-6 space-y-4">
        <Input label="Current password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <Input label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
        <Input label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" size="lg" className="w-full" loading={save.isPending}>Update password</Button>
      </form>
    </div>
  );
}
