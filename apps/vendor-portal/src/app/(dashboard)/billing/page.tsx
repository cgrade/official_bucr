'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Receipt, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const STATUS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending',  color: '#c9a84c', icon: Clock },
  overdue: { label: 'Overdue',  color: '#f87171', icon: AlertTriangle },
  paid:    { label: 'Paid',     color: '#4ade80', icon: CheckCircle2 },
  waived:  { label: 'Waived',   color: '#7a8fa6', icon: CheckCircle2 },
};

export default function BillingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['vendor-invoices'], queryFn: () => authApi.getInvoices() });
  const invoices: any[] = data?.data?.invoices ?? [];
  const outstanding = data?.data?.outstanding ?? 0;

  const pay = useMutation({
    mutationFn: (id: string) => authApi.payInvoice(id),
    onSuccess: (res) => {
      const url = res.data?.authorizationUrl;
      if (url) window.location.href = url;
      else { toast.error('Could not start payment'); qc.invalidateQueries({ queryKey: ['vendor-invoices'] }); }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.response?.data?.error || 'Payment could not be started'),
  });

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-[#f5f0e8] flex items-center gap-2">
        <Receipt className="h-7 w-7 text-[#c9a84c]" /> Billing
      </h1>
      <p className="mt-1 text-[14px] text-[#7a8fa6]">Per-cover success-fee invoices, issued every two weeks. You have 1 week to pay each invoice; reminders are sent every 48 hours until paid.</p>

      <div className="mt-5 rounded-2xl border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.06)] p-5">
        <p className="text-[12px] uppercase tracking-wider text-[#7a8fa6]">Outstanding balance</p>
        <p className="mt-1 text-3xl font-bold text-[#f5f0e8]">₦{outstanding.toLocaleString()}</p>
      </div>

      {isLoading ? (
        <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#7a8fa6]" /></div>
      ) : invoices.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-10 text-center">
          <Receipt className="h-9 w-9 mx-auto text-[#c9a84c]" />
          <p className="mt-3 text-[#f5f0e8]">No invoices yet</p>
          <p className="text-[13px] text-[#7a8fa6]">Per-cover invoices appear here once diners start checking in.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {invoices.map((inv) => {
            const st = STATUS[inv.status] ?? STATUS.pending;
            const Icon = st.icon;
            const payable = inv.status === 'pending' || inv.status === 'overdue';
            return (
              <div key={inv.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-[#f5f0e8]">₦{inv.amountNgn.toLocaleString()} <span className="text-[12px] font-normal text-[#7a8fa6]">· {inv.coverCount} cover{inv.coverCount === 1 ? '' : 's'}</span></p>
                  <p className="text-[12px] text-[#7a8fa6]">
                    Issued {formatDate(inv.issuedAt)} · {inv.status === 'paid' ? `Paid ${formatDate(inv.paidAt)}` : `Due ${formatDate(inv.dueDate)}`}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: st.color }}>
                    <Icon className="h-3 w-3" /> {st.label}
                  </span>
                </div>
                {payable && (
                  <button onClick={() => pay.mutate(inv.id)} disabled={pay.isPending}
                    className="flex-shrink-0 rounded-lg bg-[#c9a84c] px-4 h-10 text-[14px] font-semibold text-[#0f2547] hover:bg-[#d4b85f] disabled:opacity-60">
                    {pay.isPending && pay.variables === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay now'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-[12px] text-[#7a8fa6]">Payments are processed securely by Paystack. Bucr never collects your guests' bills — only the per-cover platform fee is billed to you here.</p>
    </div>
  );
}
