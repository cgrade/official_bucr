'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Bell, Mail, Loader2, CalendarCheck, XCircle, Receipt, Megaphone, ExternalLink } from 'lucide-react';

const CATEGORY: Record<string, { label: string; icon: any; color: string }> = {
  reservation:  { label: 'Reservation',  icon: CalendarCheck, color: '#4ade80' },
  cancellation: { label: 'Cancellation', icon: XCircle,       color: '#f87171' },
  invoice:      { label: 'Billing',      icon: Receipt,       color: '#c9a84c' },
  broadcast:    { label: 'Announcement', icon: Megaphone,     color: '#60a5fa' },
  system:       { label: 'System',       icon: Bell,          color: '#7a8fa6' },
  message:      { label: 'Message',      icon: Mail,          color: '#7a8fa6' },
};

export default function MessagesPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['vendor-messages'], queryFn: () => authApi.getMessages() });
  const messages: any[] = data?.data?.messages ?? [];
  const [open, setOpen] = useState<string | null>(null);

  const markRead = useMutation({
    mutationFn: (id: string) => authApi.markMessageRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-messages'] }),
  });

  const toggle = (m: any) => {
    setOpen((cur) => (cur === m.id ? null : m.id));
    if (!m.isRead) markRead.mutate(m.id);
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-[#f5f0e8] flex items-center gap-2">
        <Bell className="h-7 w-7 text-[#c9a84c]" /> Message Center
      </h1>
      <p className="mt-1 text-[14px] text-[#7a8fa6]">Reservations, cancellations, invoices and announcements — all your Bucr correspondence in one place. Important items are also emailed to you.</p>

      {isLoading ? (
        <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#7a8fa6]" /></div>
      ) : messages.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-10 text-center">
          <Mail className="h-9 w-9 mx-auto text-[#c9a84c]" />
          <p className="mt-3 text-[#f5f0e8]">No messages yet</p>
          <p className="text-[13px] text-[#7a8fa6]">Notifications and messages will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {messages.map((m) => {
            const cat = CATEGORY[m.category] ?? CATEGORY.message;
            const Icon = cat.icon;
            return (
              <button key={m.id} onClick={() => toggle(m)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${m.isRead ? 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]' : 'border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.06)]'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-[#f5f0e8] flex items-center gap-2 min-w-0">
                    {!m.isRead && <span className="h-2 w-2 rounded-full bg-[#c9a84c] flex-shrink-0" />}
                    <Icon className="h-4 w-4 flex-shrink-0" style={{ color: cat.color }} />
                    <span className="truncate">{m.subject}</span>
                  </p>
                  <span className="text-[11px] text-[#7a8fa6] flex-shrink-0">{formatDate(m.createdAt)}</span>
                </div>
                <div className="mt-1 ml-6">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: cat.color }}>{cat.label}</span>
                </div>
                {open === m.id && (
                  <div className="mt-3 ml-6">
                    <p className="text-[14px] text-[#cdd8e6] whitespace-pre-line">{m.body}</p>
                    {m.link && (
                      <span
                        onClick={(e) => { e.stopPropagation(); router.push(m.link); }}
                        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#c9a84c] hover:underline cursor-pointer"
                      >
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
