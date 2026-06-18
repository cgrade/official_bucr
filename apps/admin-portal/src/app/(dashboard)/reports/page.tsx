'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FileText, Download, Calendar, Users, Store, CreditCard,
  TrendingUp, ShoppingBag, Filter,
} from 'lucide-react';

type ReportType = 'users' | 'vendors' | 'reservations' | 'orders' | 'credits' | 'revenue';

const reportTypes: { id: ReportType; name: string; icon: any; description: string }[] = [
  { id: 'users', name: 'User Report', icon: Users, description: 'User registrations, activity, and retention' },
  { id: 'vendors', name: 'Vendor Report', icon: Store, description: 'Vendor performance and metrics' },
  { id: 'reservations', name: 'Reservation Report', icon: Calendar, description: 'Booking statistics and trends' },
  { id: 'orders', name: 'Order Report', icon: ShoppingBag, description: 'Takeout and delivery analytics' },
  { id: 'credits', name: 'Credit Report', icon: CreditCard, description: 'Credit circulation and transactions' },
  { id: 'revenue', name: 'Revenue Report', icon: TrendingUp, description: 'Platform revenue and earnings' },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('users');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isGenerating, setIsGenerating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-report', selectedReport, dateRange],
    queryFn: () => reportsApi.generate(selectedReport, dateRange),
    enabled: false,
  });

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await refetch();
      toast.success('Report generated successfully');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!data?.data) {
      toast.error('No report data to export');
      return;
    }
    
    // Convert report data to CSV
    const reportData = data.data;
    let csvContent = '';
    
    // Add headers and rows based on report type
    if (reportData.rows && reportData.headers) {
      csvContent = reportData.headers.join(',') + '\n';
      reportData.rows.forEach((row: any) => {
        csvContent += Object.values(row).join(',') + '\n';
      });
    } else {
      // Fallback for simple key-value data
      csvContent = Object.entries(reportData)
        .map(([key, value]) => `${key},${value}`)
        .join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  const report = data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-slate-500 mt-1">Generate and export system reports</p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {reportTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedReport(type.id)}
            className={`glass-card rounded-xl p-4 text-left transition-all duration-200 ${
              selectedReport === type.id
                ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <type.icon className={`w-6 h-6 mb-2 ${
              selectedReport === type.id ? 'text-primary-500' : 'text-slate-400'
            }`} />
            <h3 className={`font-medium text-sm ${
              selectedReport === type.id ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-white'
            }`}>
              {type.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{type.description}</p>
          </button>
        ))}
      </div>

      {/* Filters & Actions */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? (
                <>Generating...</>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
            {report && (
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Report Results */}
      {report ? (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            {reportTypes.find(r => r.id === selectedReport)?.name} Results
          </h2>

          {/* Summary Stats */}
          {report.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(report.summary).map(([key, value]) => (
                <div key={key} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <p className="text-sm text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {typeof value === 'number' 
                      ? key.includes('revenue') || key.includes('amount') 
                        ? formatCurrency(value as number)
                        : formatNumber(value as number)
                      : String(value)
                    }
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Data Table */}
          {report.rows && report.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    {report.headers?.map((header: string) => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {report.rows.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      {Object.values(row).map((cell: any, cellIdx: number) => (
                        <td key={cellIdx} className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {(!report.rows || report.rows.length === 0) && !report.summary && (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No data available for the selected period</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No Report Generated
          </h3>
          <p className="text-slate-500 mb-6">
            Select a report type, choose a date range, and click &quot;Generate Report&quot; to view data
          </p>
        </div>
      )}
    </div>
  );
}
