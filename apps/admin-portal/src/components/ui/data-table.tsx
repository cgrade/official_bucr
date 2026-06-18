'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  Filter,
  Download,
  MoreHorizontal 
} from 'lucide-react';

interface Column<T> {
  key: keyof T | 'actions';
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  className?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
  showPagination?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  onPageChange,
  onSearch,
  onSort,
  className,
  searchPlaceholder = "Search...",
  showSearch = true,
  showPagination = true,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleSort = (key: keyof T) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: pageSize }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4">
          {columns.map((_, j) => (
            <div
              key={j}
              className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn('glass-card rounded-2xl overflow-hidden', className)}>
      {/* Header */}
      {showSearch && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filter</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Download className="h-4 w-4" />
                <span className="text-sm font-medium">Export</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100',
                    column.sortable && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors',
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(column.key as keyof T)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortKey === column.key && (
                      <span className="text-primary-500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <LoadingSkeleton />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="text-slate-500 dark:text-slate-400">
                    <p className="text-lg font-medium">No data found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-4 py-4 text-sm text-slate-900 dark:text-slate-100',
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(item)
                        : column.key === 'actions'
                        ? null
                        : String(item[column.key] || '-')
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.length)} of {data.length} results
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange?.(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange?.(pageNum)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        currentPage === pageNum
                          ? 'bg-primary-500 text-white'
                          : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => onPageChange?.(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
