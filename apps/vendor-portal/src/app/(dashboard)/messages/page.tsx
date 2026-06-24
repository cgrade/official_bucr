'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Bell, Mail, Loader2 } from 'lucide-react';

export default function MessagesPage() {
  const qc = useQueryClient();
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
      <p className="mt-1 text-[14px] text-[#7a8fa6]">Announcements and messages from the Bucr team. You also receive these by email.</p>

      {isLoading ? (
        <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#7a8fa6]" /></div>
      ) : messages.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-10 text-center">
          <Mail className="h-9 w-9 mx-auto text-[#c9a84c]" />
          <p className="mt-3 text-[#f5f0e8]">No messages yet</p>
          <p className="text-[13px] text-[#7a8fa6]">Messages from the Bucr team will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {messages.map((m) => (
            <button key={m.id} onClick={() => toggle(m)}
              className={`w-full text-left rounded-xl border p-4 transition-colors ${m.isRead ? 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]' : 'border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.06)]'}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[#f5f0e8] flex items-center gap-2">
                  {!m.isRead && <span className="h-2 w-2 rounded-full bg-[#c9a84c]" />}
                  {m.subject}
                </p>
                <span className="text-[11px] text-[#7a8fa6] flex-shrink-0">{formatDate(m.createdAt)}</span>
              </div>
              {open === m.id && <p className="mt-3 text-[14px] text-[#cdd8e6] whitespace-pre-line">{m.body}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
