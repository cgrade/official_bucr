'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, Loader2, Users } from 'lucide-react';
import { broadcastApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const AUDIENCES = [
  { id: 'all', label: 'All vendors' },
  { id: 'basic', label: 'Basic tier' },
  { id: 'pro', label: 'Pro tier' },
  { id: 'elite', label: 'Elite tier' },
] as const;

export default function BroadcastPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'basic' | 'pro' | 'elite'>('all');

  const send = useMutation({
    mutationFn: () => broadcastApi.send({ subject: subject.trim(), body: body.trim(), audience }),
    onSuccess: (d) => { toast.success(d.message || `Sent to ${d.data?.recipients} vendors`); setSubject(''); setBody(''); },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.response?.data?.error || 'Failed to send'),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2"><Send className="w-6 h-6 text-[#c9a84c]" /> Broadcast</h1>
        <p className="text-[#7a8fa6] mt-1">Send a message to vendors. It appears in their portal message center and is emailed to them.</p>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[#f5f0e8] mb-1.5">Audience</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AUDIENCES.map((a) => (
              <button key={a.id} onClick={() => setAudience(a.id)}
                className={cn('h-10 rounded-lg border text-[13px] font-medium flex items-center justify-center gap-1.5',
                  audience === a.id ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-[#f5f0e8]' : 'border-[rgba(255,255,255,0.12)] text-[#7a8fa6]')}>
                <Users className="w-3.5 h-3.5" /> {a.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#f5f0e8] mb-1.5">Subject</label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Holiday hours reminder" />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-[#f5f0e8] mb-1.5">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="Write your message to vendors…"
            className="w-full rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] p-3 text-[14px] text-[#f5f0e8] focus:outline-none focus:border-[#c9a84c]" />
        </div>
        <Button className="w-full gap-2" disabled={send.isPending || subject.trim().length < 2 || body.trim().length < 2} onClick={() => send.mutate()}>
          {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send broadcast
        </Button>
        <p className="text-[12px] text-[#7a8fa6]">Requires the <code className="text-[#c9a84c]">notifications.send</code> permission (super admin, ops manager, or support).</p>
      </div>
    </div>
  );
}
