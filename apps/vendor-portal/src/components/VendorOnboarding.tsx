'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { settingsApi, menuApi } from '@/lib/api';
import {
  CheckCircle2, Circle, X, Sparkles, ArrowRight,
  Building2, UtensilsCrossed, Clock, FileCheck,
} from 'lucide-react';

const DISMISS_KEY = 'vendor-onboarding-dismissed';

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  done: boolean;
}

export function VendorOnboarding() {
  const [dismissed, setDismissed] = useState(true); // default hidden until we read storage

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['onboarding-profile'],
    queryFn: () => settingsApi.getProfile(),
    enabled: !dismissed,
  });
  const { data: menu } = useQuery({
    queryKey: ['onboarding-menu'],
    queryFn: () => menuApi.getItems(),
    enabled: !dismissed,
  });

  const p: any = profile?.data || {};
  const menuItems: any[] = (menu as any)?.data || [];
  const branches: any[] = p.branches || [];
  const docs: any[] = p.documents || [];

  const hasProfile = Boolean(p.logo && p.description);
  const hasMenu = menuItems.length > 0;
  const hasHours = branches.some(
    (b) => Array.isArray(b.operatingHours) && b.operatingHours.some((h: any) => h && h.isClosed === false)
  );
  const hasDocs =
    docs.some((d) => d.type === 'cac') && docs.some((d) => d.type === 'owner_id');

  const items: ChecklistItem[] = [
    { key: 'profile', label: 'Complete your profile', description: 'Add your logo and a short description', href: '/settings', icon: Building2, done: hasProfile },
    { key: 'menu', label: 'Add your menu', description: 'List your dishes so guests know what to expect', href: '/menu', icon: UtensilsCrossed, done: hasMenu },
    { key: 'hours', label: 'Set operating hours', description: 'Tell guests when you’re open', href: '/settings', icon: Clock, done: hasHours },
    { key: 'docs', label: 'Upload verification documents', description: 'CAC certificate and a valid owner ID', href: '/documents', icon: FileCheck, done: hasDocs },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  // Hide once dismissed, or once everything is complete.
  if (dismissed || allDone) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="rounded-2xl border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.06)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c9a84c]">
            <Sparkles className="h-5 w-5 text-[#0f2547]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#f5f0e8]">Welcome to Bucr — let’s get you set up</h2>
            <p className="text-[13px] text-[#7a8fa6]">
              Complete these steps so guests can discover and book your venue. {doneCount}/{items.length} done.
            </p>
          </div>
        </div>
        <button onClick={dismiss} className="text-[#7a8fa6] hover:text-[#f5f0e8] transition-colors" aria-label="Dismiss">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
        <div className="h-full rounded-full bg-[#c9a84c] transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>

      {/* Checklist */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl border p-4 transition-all ${
                item.done
                  ? 'border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.05)]'
                  : 'border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(201,168,76,0.4)]'
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-[#7a8fa6]" />
              )}
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-semibold ${item.done ? 'text-[#7a8fa6] line-through' : 'text-[#f5f0e8]'}`}>
                  {item.label}
                </p>
                <p className="truncate text-[11px] text-[#7a8fa6]">{item.description}</p>
              </div>
              {!item.done && (
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#c9a84c] opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
