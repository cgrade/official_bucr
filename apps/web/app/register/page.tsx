'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { BucrWordmark } from '@/components/ui/BucrWordmark';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRIES = [
  { name: 'Nigeria', dialCode: '+234', regex: /^(\+234|0)[789][01]\d{8}$/, placeholder: '0801 234 5678', currency: '₦ NGN' },
  { name: 'Ghana', dialCode: '+233', regex: /^(\+233|0)[235]\d{8}$/, placeholder: '024 123 4567', currency: 'GH₵ GHS' },
  { name: 'Kenya', dialCode: '+254', regex: /^(\+254|0)[17]\d{8}$/, placeholder: '0712 345 678', currency: 'KSh KES' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [country, setCountry] = useState('Nigeria');
  const cfg = COUNTRIES.find((c) => c.name === country)!;
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState(false);

  const pw = useMemo(() => ({
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
  }), [form.password]);
  const pwOk = Object.values(pw).every(Boolean);

  const errors = {
    name: form.name.trim().length < 2 ? 'Enter your full name' : '',
    email: !EMAIL_RE.test(form.email.trim()) ? 'Enter a valid email' : '',
    phone: !cfg.regex.test(form.phone.trim().replace(/\s/g, '')) ? `Enter a valid ${country} number` : '',
    password: !pwOk ? 'Meet all password requirements' : '',
  };
  const valid = !Object.values(errors).some(Boolean) && agreed;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!agreed) { toast.error('Please accept the Terms & Privacy Policy'); return; }
    if (!valid) return;
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim().replace(/\s/g, ''),
        password: form.password,
        country,
      });
      toast.success('Welcome to Bucr 🎉');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-14">
      <div className="text-center mb-8">
        <BucrWordmark height={36} />
        <h1 className="mt-6 font-display text-3xl font-semibold text-[#0f2547]">Create your account</h1>
        <p className="mt-1 text-[14px] text-[#7a8fa6]">Book tables that are actually waiting for you.</p>
      </div>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#0f2547] mb-1.5">Country</label>
          <div className="grid grid-cols-3 gap-2">
            {COUNTRIES.map((c) => (
              <button key={c.name} type="button" onClick={() => setCountry(c.name)}
                className={cn('h-10 rounded-lg border text-[13px] font-medium transition-colors',
                  country === c.name ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-[#0f2547]' : 'border-[rgba(15,37,71,0.18)] text-[#7a8fa6] hover:border-[#c9a84c]')}>
                {c.name}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-[#7a8fa6]">Sets your phone format · prices shown in {cfg.currency}</p>
        </div>
        <Input label="Full name" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={touched ? errors.name : ''} />
        <Input label="Email" type="email" placeholder="you@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={touched ? errors.email : ''} />
        <div>
          <label className="block text-[13px] font-medium text-[#0f2547] mb-1.5">Phone number</label>
          <div className="flex gap-2">
            <span className="inline-flex items-center px-3 rounded-xl border border-[rgba(15,37,71,0.18)] bg-[rgba(15,37,71,0.03)] text-[14px] font-medium text-[#c9a84c]">{cfg.dialCode}</span>
            <Input type="tel" placeholder={cfg.placeholder} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={touched ? errors.phone : ''} />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#0f2547] mb-1.5">Password</label>
          <div className="relative">
            <Input type={show ? 'text' : 'password'} placeholder="Create a strong password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8fa6]">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.password.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
              {[['8+ characters', pw.length], ['Uppercase', pw.upper], ['Lowercase', pw.lower], ['Number', pw.number]].map(([label, ok]) => (
                <span key={label as string} className={cn('flex items-center gap-1', ok ? 'text-emerald-600' : 'text-[#7a8fa6]')}>
                  <Check className="h-3 w-3" /> {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <label className="flex items-start gap-2 text-[12px] text-[#7a8fa6] cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-[#c9a84c]" />
          <span>I agree to Bucr’s{' '}
            <Link href="/terms" className="text-[#c9a84c] hover:underline">Terms of Service</Link> and{' '}
            <Link href="/privacy" className="text-[#c9a84c] hover:underline">Privacy Policy</Link>.
          </span>
        </label>
        <Button type="submit" size="lg" className="w-full" loading={isLoading}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-[14px] text-[#7a8fa6]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[#c9a84c] hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
