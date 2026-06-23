'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth.store';

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, ready, checkAuth } = useAuthStore();
  useEffect(() => { if (ready && !isAuthenticated) router.push('/login?redirect=/account/edit'); }, [ready, isAuthenticated, router]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  useEffect(() => { if (user) { setName(user.name || ''); setPhone(user.phone || ''); } }, [user]);

  const save = useMutation({
    mutationFn: () => usersApi.updateProfile({ name: name.trim(), phone: phone.trim() }),
    onSuccess: async () => { toast.success('Profile updated'); await checkAuth(); router.push('/account'); },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Could not update'),
  });

  if (!ready || !isAuthenticated || !user) return <div className="max-w-md mx-auto px-5 py-20 text-center text-[#7a8fa6]">Loading…</div>;

  return (
    <div className="max-w-md mx-auto px-5 py-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[14px] text-[#7a8fa6] hover:text-[#0f2547] mb-5"><ArrowLeft className="h-4 w-4" /> Back</button>
      <h1 className="font-display text-3xl font-semibold text-[#0f2547]">Edit profile</h1>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="card p-6 mt-6 space-y-4">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email" value={user.email} disabled className="opacity-60 cursor-not-allowed" />
        <Button type="submit" size="lg" className="w-full" loading={save.isPending}>Save changes</Button>
      </form>
    </div>
  );
}
