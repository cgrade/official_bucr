'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { 
  FileText, CheckCircle, XCircle, Clock, Eye, 
  Download, Building2, AlertTriangle, ExternalLink,
  Search, Filter
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface VendorDocument {
  id: string;
  vendorId: string;
  type: 'cac' | 'tin' | 'owner_id' | 'food_safety';
  fileUrl: string;
  fileName: string | null;
  status: 'pending' | 'approved' | 'rejected';
  isRequired: boolean;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  vendor: {
    id: string;
    businessName: string;
    email: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
  };
}

const documentTypeLabels: Record<string, string> = {
  cac: 'CAC Certificate',
  tin: 'Tax ID (TIN)',
  owner_id: 'Owner ID',
  food_safety: 'Food Safety Certificate',
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState<VendorDocument | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-documents', page, statusFilter],
    queryFn: () => documentsApi.getAll({ page, limit: 20, status: statusFilter }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => documentsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Document approved successfully');
      setSelectedDoc(null);
      setShowPreviewModal(false);
    },
    onError: () => toast.error('Failed to approve document'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => documentsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Document rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedDoc(null);
    },
    onError: () => toast.error('Failed to reject document'),
  });

  const documents: VendorDocument[] = data?.data?.documents || data?.data || [];
  const pagination = data?.data?.pagination || { page: 1, total: 0, totalPages: 1 };

  const getStatusBadge = (status: string) => {
    const badges = {
      approved: { icon: CheckCircle, color: 'text-green-700 bg-green-50 border-green-200', label: 'Approved' },
      pending: { icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Pending' },
      rejected: { icon: XCircle, color: 'text-red-700 bg-red-50 border-red-200', label: 'Rejected' },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', badge.color)}>
        <Icon className="h-3.5 w-3.5" />
        {badge.label}
      </span>
    );
  };

  const getDocumentUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  const handleApprove = (doc: VendorDocument) => {
    approveMutation.mutate(doc.id);
  };

  const handleReject = () => {
    if (!selectedDoc || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    rejectMutation.mutate({ id: selectedDoc.id, reason: rejectReason });
  };

  const openRejectModal = (doc: VendorDocument) => {
    setSelectedDoc(doc);
    setShowRejectModal(true);
  };

  const openPreviewModal = (doc: VendorDocument) => {
    setSelectedDoc(doc);
    setShowPreviewModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Document Review</h1>
          <p className="text-slate-500 dark:text-slate-400">Review and verify vendor documents</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setStatusFilter('pending')}
          className={cn(
            'p-4 rounded-xl border transition-all text-left',
            statusFilter === 'pending'
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-amber-300'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {documents.filter(d => d.status === 'pending').length || '—'}
              </p>
              <p className="text-sm text-slate-500">Pending Review</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('approved')}
          className={cn(
            'p-4 rounded-xl border transition-all text-left',
            statusFilter === 'approved'
              ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-green-300'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">—</p>
              <p className="text-sm text-slate-500">Approved</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={cn(
            'p-4 rounded-xl border transition-all text-left',
            statusFilter === 'rejected'
              ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-red-300'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">—</p>
              <p className="text-sm text-slate-500">Rejected</p>
            </div>
          </div>
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-2 text-slate-500">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">No documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {doc.vendor?.businessName || 'Unknown Vendor'}
                          </p>
                          <p className="text-sm text-slate-500">{doc.vendor?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-900 dark:text-white">
                          {documentTypeLabels[doc.type] || doc.type}
                        </span>
                        {doc.isRequired && (
                          <span className="text-xs text-red-500">*</span>
                        )}
                      </div>
                      {doc.fileName && (
                        <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">
                          {doc.fileName}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(doc.status)}
                      {doc.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate">
                          {doc.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatDate(doc.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openPreviewModal(doc)}
                          className="p-2 text-slate-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={getDocumentUrl(doc.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {doc.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(doc)}
                              disabled={approveMutation.isPending}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openRejectModal(doc)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Reject Document
              </h3>
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Please provide a reason for rejecting this {documentTypeLabels[selectedDoc.type]} 
              from <strong>{selectedDoc.vendor?.businessName}</strong>.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
              rows={3}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedDoc(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {documentTypeLabels[selectedDoc.type]}
                </h3>
                <p className="text-sm text-slate-500">
                  {selectedDoc.vendor?.businessName} • {selectedDoc.fileName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setSelectedDoc(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-800">
              {selectedDoc.fileUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={getDocumentUrl(selectedDoc.fileUrl)}
                  className="w-full h-[60vh] rounded-lg"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={getDocumentUrl(selectedDoc.fileUrl)}
                  alt="Document Preview"
                  className="max-w-full h-auto mx-auto rounded-lg shadow-lg"
                />
              )}
            </div>

            {selectedDoc.status === 'pending' && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    openRejectModal(selectedDoc);
                  }}
                  className="flex-1 px-4 py-2 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4 inline mr-2" />
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedDoc)}
                  disabled={approveMutation.isPending}
                  className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  {approveMutation.isPending ? 'Approving...' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
