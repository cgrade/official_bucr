'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Download, RefreshCw, Loader2 } from 'lucide-react';
import { revenueApi } from '@/lib/api';

const REVENUE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'credit_spread',      label: 'Credit Spread' },
  { value: 'breakage',           label: 'Breakage' },
  { value: 'cover_fee',          label: 'Cover Fee' },
  { value: 'gift_fee',           label: 'Gift Fee' },
  { value: 'noshow_platform_share', label: 'No-show Share' },
  { value: 'subscription',       label: 'Subscription' },
  { value: 'featured',           label: 'Featured' },
];

const TYPE_COLORS: Record<string, string> = {
  credit_spread:       '#c9a84c',
  breakage:            '#7a8fa6',
  cover_fee:           '#34d399',
  gift_fee:            '#f87171',
  noshow_platform_share: '#f59e0b',
  subscription:        '#818cf8',
  featured:            '#fb923c',
};

function formatNgn(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n);
}

function thisMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

export default function RevenuePage() {
  const [month, setMonth]   = useState(thisMonth());
  const [type,  setType]    = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['platform-revenue', month, type],
    queryFn: () => revenueApi.getByPeriod({ month, type: type || undefined }),
  });

  const handleExportCsv = useCallback(async () => {
    try {
      const csv = await revenueApi.getCsv({ month, type: type || undefined });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `bucr-revenue-${month}${type ? `-${type}` : ''}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // error handled by axios interceptor
    }
  }, [month, type]);

  const aggregates: any[] = data?.data?.aggregates ?? [];
  const totalNgn: number  = data?.data?.totalNgn    ?? 0;

  // Group by type for the summary row
  const byType = aggregates.reduce((acc: any, row: any) => {
    if (!acc[row.type]) acc[row.type] = 0;
    acc[row.type] += row._sum?.amountNgn ?? 0;
    return acc;
  }, {} as Record<string, number>);

  // handleCsvExport defined above as handleExportCsv via revenueApi

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f2547] border-b border-[rgba(201,168,76,0.18)]">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]">
              <TrendingUp className="h-6 w-6 text-[#0f2547]" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold text-[#f5f0e8]">Platform Revenue</h1>
              <p className="text-sm text-[#7a8fa6]">Recognised revenue by line and month</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(201,168,76,0.25)] text-[#7a8fa6] hover:text-[#f5f0e8] hover:border-[#c9a84c] text-sm transition-colors">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c9a84c] text-[#0f2547] font-semibold text-sm hover:bg-[#f5f0e8] transition-colors">
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-8">

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7a8fa6] mb-1.5">Month</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="h-10 px-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-sm focus:outline-none focus:border-[#c9a84c]" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7a8fa6] mb-1.5">Revenue Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="h-10 px-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-sm focus:outline-none focus:border-[#c9a84c] appearance-none min-w-[160px]">
              {REVENUE_TYPES.map(t => <option key={t.value} value={t.value} className="bg-[#0f2547]">{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Total KPI */}
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.2)] rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#7a8fa6]">Total Revenue — {month}</p>
            <p className="text-4xl font-display font-semibold text-[#f5f0e8] mt-1">{formatNgn(totalNgn)}</p>
          </div>
          <div className="h-16 w-px bg-[rgba(201,168,76,0.2)]" />
          <div className="text-right">
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#7a8fa6]">Revenue lines</p>
            <p className="text-4xl font-display font-semibold text-[#c9a84c] mt-1">{Object.keys(byType).length}</p>
          </div>
        </div>

        {/* By-type summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(byType).map(([t, amount]) => (
            <div key={t} className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-4 hover:border-[rgba(201,168,76,0.35)] transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[t] ?? '#c9a84c' }} />
                <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#7a8fa6]">
                  {t.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xl font-semibold text-[#f5f0e8]">{formatNgn(amount as number)}</p>
            </div>
          ))}
        </div>

        {/* Detail table */}
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(201,168,76,0.12)]">
            <h2 className="font-display text-[17px] font-semibold text-[#f5f0e8]">Breakdown</h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
            </div>
          ) : aggregates.length === 0 ? (
            <div className="py-12 text-center text-[#7a8fa6] text-sm">
              No revenue data for this period
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(201,168,76,0.1)]">
                  {['Month', 'Type', 'Count', 'Amount (₦)'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-[10px] font-semibold tracking-[0.15em] uppercase text-[#7a8fa6]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aggregates.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-[rgba(201,168,76,0.06)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-6 py-3 text-sm text-[#f5f0e8]">{row.billingMonth}</td>
                    <td className="px-6 py-3">
                      <span className="flex items-center gap-2 text-sm text-[#f5f0e8]">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[row.type] ?? '#c9a84c' }} />
                        {row.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-[#7a8fa6]">{row._count?.id ?? '—'}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-[#c9a84c]">{formatNgn(row._sum?.amountNgn ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
