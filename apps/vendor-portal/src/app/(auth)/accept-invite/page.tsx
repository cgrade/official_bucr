'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BucrWordmark } from '@/components/ui/BucrWordmark';

function AcceptInviteForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{ email: string; name: string; role: string; businessName: string } | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError('Missing invite token.'); setLoading(false); return; }
    api.get(`/vendor/team/accept?token=${token}`)
      .then((r) => { const d = r.data.data; setInvite(d); setName(d.name || ''); })
      .catch((e) => setError(e?.response?.data?.error || 'This invitation is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirm) return toast.error('Passwords do not match');
    setSubmitting(true);
    try {
      await api.post('/vendor/team/accept', { token, name: name.trim(), password });
      toast.success('Invitation accepted — you can now sign in.');
      router.push('/login');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center text-[#7a8fa6] py-20">Loading invitation…</p>;

  if (error || !invite) {
    return (
      <div className="text-center py-16">
        <p className="text-[#f87171]">{error || 'Invalid invitation.'}</p>
        <Link href="/login" className="mt-4 inline-block text-[#c9a84c] hover:underline">Back to sign in</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <BucrWordmark height={34} />
        <h1 className="mt-5 font-display text-2xl font-semibold text-[#f5f0e8]">Join {invite.businessName}</h1>
        <p className="mt-1 text-[14px] text-[#7a8fa6]">You were invited as <span className="text-[#c9a84c] font-medium">{invite.role}</span> · {invite.email}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#f5f0e8] mb-1.5">Your name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#f5f0e8] mb-1.5">Create password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#f5f0e8] mb-1.5">Confirm password</label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Accepting…' : 'Accept & set password'}</Button>
      </form>
      <p className="mt-5 text-center text-[13px] text-[#7a8fa6]">Already set up? <Link href="/login" className="text-[#c9a84c] hover:underline">Sign in</Link></p>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<p className="text-center text-[#7a8fa6] py-20">Loading…</p>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
