'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('vendor_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return <>{children}</>;
}
