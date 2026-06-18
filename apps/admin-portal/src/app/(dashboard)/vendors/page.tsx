'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { vendorsApi, documentsApi } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { formatDate, cn } from '@/lib/utils';
import { 
  Store, CheckCircle, XCircle, Clock, Eye, MoreHorizontal, 
  Star, MapPin, Calendar, AlertTriangle, Plus, Download,
  FileText, ExternalLink, Loader2
} from 'lucide-react';

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'view' | 'suspend'>('add');
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [vendorDocs, setVendorDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    businessName: '',
    email: '',
    phone: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    subscriptionTier: 'basic' as 'basic' | 'pro' | 'premium',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-vendors', page, search],
    queryFn: () => vendorsApi.getAll({ page, limit: 20, search: search || undefined }),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => vendorsApi.verify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success('Vendor verified successfully');
    },
    onError: () => toast.error('Failed to verify vendor'),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => vendorsApi.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success('Vendor suspended');
      setShowModal(false);
      setSuspendReason('');
    },
    onError: () => toast.error('Failed to suspend vendor'),
  });

  const createVendorMutation = useMutation({
    mutationFn: (data: typeof newVendorForm) => vendorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success('Vendor created successfully');
      setShowModal(false);
      setNewVendorForm({ businessName: '', email: '', phone: '', ownerName: '', ownerEmail: '', ownerPassword: '', subscriptionTier: 'basic' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create vendor'),
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id: string) => vendorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success('Vendor deleted');
      setShowModal(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete vendor'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => vendorsApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success('Vendor activated');
    },
    onError: () => toast.error('Failed to activate vendor'),
  });

  const approveDocMutation = useMutation({
    mutationFn: (docId: string) => documentsApi.approve(docId),
    onSuccess: () => {
      toast.success('Document approved');
      if (selectedVendor) fetchVendorDocs(selectedVendor.id);
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
    onError: () => toast.error('Failed to approve document'),
  });

  const rejectDocMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => documentsApi.reject(id, reason),
    onSuccess: () => {
      toast.success('Document rejected');
      setRejectingDocId(null);
      setRejectReason('');
      if (selectedVendor) fetchVendorDocs(selectedVendor.id);
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
    onError: () => toast.error('Failed to reject document'),
  });

  const fetchVendorDocs = async (vendorId: string) => {
    setLoadingDocs(true);
    try {
      const result = await documentsApi.getByVendor(vendorId);
      setVendorDocs(result.data?.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      setVendorDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const openViewModal = async (vendor: any) => {
    setSelectedVendor(vendor);
    setModalType('view');
    setShowModal(true);
    setVendorDocs([]);
    await fetchVendorDocs(vendor.id);
  };

  // Handle both response formats: data.vendors or just data as array
  const responseData = data?.data;
  const vendors = responseData?.vendors || (Array.isArray(responseData) ? responseData : []);
  const pagination = responseData?.pagination || { page: 1, total: vendors.length, totalPages: 1 };

  const getStatusBadge = (status: string) => {
    const badges = {
      approved: { icon: CheckCircle, color: 'text-green-700 bg-green-50 border-green-200', label: 'Verified' },
      pending: { icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Pending' },
      rejected: { icon: AlertTriangle, color: 'text-orange-700 bg-orange-50 border-orange-200', label: 'Suspended' },
    };
    
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const IconComponent = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <IconComponent className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      basic: 'text-slate-700 bg-slate-50 border-slate-200',
      pro: 'text-blue-700 bg-blue-50 border-blue-200', 
      premium: 'text-purple-700 bg-purple-50 border-purple-200'
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${colors[tier as keyof typeof colors] || colors.basic}`}>
        <Star className="h-3 w-3" />
        {tier?.charAt(0).toUpperCase() + tier?.slice(1)}
      </span>
    );
  };

  const columns = [
    {
      key: 'businessName' as const,
      label: 'Vendor',
      render: (vendor: any) => {
        const logoUrl = vendor.logo 
          ? (vendor.logo.startsWith('http') ? vendor.logo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${vendor.logo}`)
          : null;
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-10 w-10 object-cover" />
              ) : (
                <Store className="h-5 w-5 text-slate-500" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-white truncate">
                {vendor.businessName}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {vendor.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'location' as const,
      label: 'Location',
      render: (vendor: any) => (
        <div className="flex items-center gap-1.5 text-sm">
          <MapPin className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600 dark:text-slate-400">
            {vendor.city && vendor.state ? `${vendor.city}, ${vendor.state}` : 'Not specified'}
          </span>
        </div>
      ),
    },
    {
      key: 'verificationStatus' as const,
      label: 'Status',
      render: (vendor: any) => getStatusBadge(vendor.verificationStatus),
    },
    {
      key: 'subscriptionTier' as const,
      label: 'Plan',
      render: (vendor: any) => getTierBadge(vendor.subscriptionTier),
    },
    {
      key: 'stats' as const,
      label: 'Performance',
      render: (vendor: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">
              {vendor.totalBookings || 0} bookings
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Star className="h-3 w-3 text-amber-400" />
            <span className="text-slate-600 dark:text-slate-400">
              {vendor.averageRating ? `${vendor.averageRating.toFixed(1)} rating` : 'No ratings'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt' as const,
      label: 'Joined',
      render: (vendor: any) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {formatDate(vendor.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions' as const,
      label: 'Actions',
      render: (vendor: any) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => openViewModal(vendor)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4 text-slate-500" />
          </button>
          
          {vendor.verificationStatus === 'pending' && (
            <button
              onClick={() => verifyMutation.mutate(vendor.id)}
              disabled={verifyMutation.isPending}
              className="p-1.5 rounded-lg hover:bg-green-50 hover:text-green-600 transition-colors"
              title="Verify vendor"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          
          {vendor.verificationStatus === 'approved' && (
            <button
              onClick={() => { setSelectedVendor(vendor); setModalType('suspend'); setSuspendReason(''); setShowModal(true); }}
              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Suspend vendor"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
          
          {vendor.verificationStatus === 'rejected' && (
            <button
              onClick={() => activateMutation.mutate(vendor.id)}
              disabled={activateMutation.isPending}
              className="p-1.5 rounded-lg hover:bg-green-50 hover:text-green-600 transition-colors"
              title="Reactivate vendor"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Failed to load vendors
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            There was an error loading the vendor data. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Vendor Management</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage and monitor all registered vendors ({pagination.total} total)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Download className="h-4 w-4" />
              <span className="text-sm font-medium">Export</span>
            </button>
            <button 
              onClick={() => { setSelectedVendor(null); setModalType('add'); setNewVendorForm({ businessName: '', email: '', phone: '', ownerName: '', ownerEmail: '', ownerPassword: '', subscriptionTier: 'basic' }); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Add Vendor</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Verified</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {vendors.filter((v: any) => v.verificationStatus === 'approved').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pending</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {vendors.filter((v: any) => v.verificationStatus === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Premium</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {vendors.filter((v: any) => v.subscriptionTier === 'premium').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Suspended</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {vendors.filter((v: any) => v.verificationStatus === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={vendors}
          columns={columns}
          isLoading={isLoading}
          currentPage={page}
          totalPages={pagination.totalPages}
          pageSize={20}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchPlaceholder="Search vendors by name, email, or location..."
        />

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="glass-card rounded-2xl p-6 w-full max-w-lg bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {modalType === 'add' && 'Add New Vendor'}
                  {modalType === 'view' && 'Vendor Details'}
                  {modalType === 'suspend' && 'Suspend Vendor'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Add Vendor Form */}
              {modalType === 'add' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Business Name</label>
                      <input type="text" value={newVendorForm.businessName} onChange={(e) => setNewVendorForm({ ...newVendorForm, businessName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="Restaurant Name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Business Email</label>
                      <input type="email" value={newVendorForm.email} onChange={(e) => setNewVendorForm({ ...newVendorForm, email: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="info@restaurant.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Business Phone</label>
                    <input type="tel" value={newVendorForm.phone} onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="+234..." />
                  </div>
                  <hr className="border-slate-200 dark:border-slate-700" />
                  <p className="text-sm font-medium text-slate-500">Owner Account</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Owner Name</label>
                      <input type="text" value={newVendorForm.ownerName} onChange={(e) => setNewVendorForm({ ...newVendorForm, ownerName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Owner Email</label>
                      <input type="email" value={newVendorForm.ownerEmail} onChange={(e) => setNewVendorForm({ ...newVendorForm, ownerEmail: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="owner@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Owner Password</label>
                    <input type="password" value={newVendorForm.ownerPassword} onChange={(e) => setNewVendorForm({ ...newVendorForm, ownerPassword: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="Min 8 characters" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Subscription Tier</label>
                    <select value={newVendorForm.subscriptionTier} onChange={(e) => setNewVendorForm({ ...newVendorForm, subscriptionTier: e.target.value as any })} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <option value="basic">Basic - ₦75,000/month</option>
                      <option value="pro">Pro - ₦145,000/month</option>
                      <option value="premium">Premium - ₦250,000/month</option>
                    </select>
                  </div>
                  <button onClick={() => { if (!newVendorForm.businessName || !newVendorForm.email || !newVendorForm.ownerName || !newVendorForm.ownerEmail || !newVendorForm.ownerPassword) { toast.error('Please fill all required fields'); return; } createVendorMutation.mutate(newVendorForm); }} disabled={createVendorMutation.isPending} className="w-full px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50">
                    {createVendorMutation.isPending ? 'Creating...' : 'Create Vendor'}
                  </button>
                </div>
              )}

              {/* View Vendor Details */}
              {modalType === 'view' && selectedVendor && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                      {selectedVendor.logo ? (
                        <img 
                          src={selectedVendor.logo.startsWith('http') ? selectedVendor.logo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${selectedVendor.logo}`} 
                          alt="" 
                          className="h-16 w-16 object-cover" 
                        />
                      ) : (
                        <Store className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{selectedVendor.businessName}</p>
                      <p className="text-sm text-slate-500">{selectedVendor.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800"><span className="text-slate-500">Phone</span><span>{selectedVendor.phone || 'Not provided'}</span></div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800"><span className="text-slate-500">Status</span>{getStatusBadge(selectedVendor.verificationStatus)}</div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800"><span className="text-slate-500">Plan</span>{getTierBadge(selectedVendor.subscriptionTier)}</div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800"><span className="text-slate-500">Bookings</span><span>{selectedVendor.totalBookings || 0}</span></div>
                    <div className="flex justify-between py-2"><span className="text-slate-500">Joined</span><span>{formatDate(selectedVendor.createdAt)}</span></div>
                  </div>

                  {/* Documents Section */}
                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Verification Documents
                    </h4>
                    
                    {loadingDocs ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                      </div>
                    ) : vendorDocs.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No documents uploaded</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {vendorDocs.map((doc: any) => (
                          <div key={doc.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900 dark:text-white text-sm">
                                    {doc.type === 'cac' ? 'CAC Certificate' : 
                                     doc.type === 'owner_id' ? 'Owner ID' : 
                                     doc.type === 'tin' ? 'Tax ID (TIN)' : 
                                     doc.type === 'food_safety' ? 'Food Safety Cert' : doc.type}
                                  </span>
                                  {doc.isRequired && <span className="text-xs text-red-500">Required</span>}
                                </div>
                                <p className="text-xs text-slate-500 truncate mt-1">{doc.fileName || 'Document'}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  {doc.status === 'approved' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
                                      <CheckCircle className="h-3 w-3" /> Approved
                                    </span>
                                  )}
                                  {doc.status === 'pending' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                                      <Clock className="h-3 w-3" /> Pending
                                    </span>
                                  )}
                                  {doc.status === 'rejected' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
                                      <XCircle className="h-3 w-3" /> Rejected
                                    </span>
                                  )}
                                </div>
                                {doc.rejectionReason && (
                                  <p className="text-xs text-red-500 mt-1">Reason: {doc.rejectionReason}</p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <a
                                  href={doc.fileUrl?.startsWith('http') ? doc.fileUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${doc.fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                  title="View document"
                                >
                                  <ExternalLink className="h-4 w-4 text-slate-500" />
                                </a>
                                
                                {doc.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => approveDocMutation.mutate(doc.id)}
                                      disabled={approveDocMutation.isPending}
                                      className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                                      title="Approve"
                                    >
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    </button>
                                    <button
                                      onClick={() => setRejectingDocId(doc.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                      title="Reject"
                                    >
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Reject reason input */}
                            {rejectingDocId === doc.id && (
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <textarea
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Enter rejection reason..."
                                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none"
                                  rows={2}
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => { setRejectingDocId(null); setRejectReason(''); }}
                                    className="px-3 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!rejectReason.trim()) { toast.error('Please enter a reason'); return; }
                                      rejectDocMutation.mutate({ id: doc.id, reason: rejectReason });
                                    }}
                                    disabled={rejectDocMutation.isPending}
                                    className="px-3 py-1 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                                  >
                                    {rejectDocMutation.isPending ? 'Rejecting...' : 'Reject'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {selectedVendor.verificationStatus === 'pending' && (
                      <button 
                        onClick={() => { verifyMutation.mutate(selectedVendor.id); setShowModal(false); }} 
                        disabled={verifyMutation.isPending}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50"
                      >
                        {verifyMutation.isPending ? 'Verifying...' : 'Verify Vendor'}
                      </button>
                    )}
                    {selectedVendor.verificationStatus === 'approved' && (
                      <button 
                        onClick={() => { setModalType('suspend'); setSuspendReason(''); }}
                        className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600"
                      >
                        Suspend Vendor
                      </button>
                    )}
                    <button 
                      onClick={() => deleteVendorMutation.mutate(selectedVendor.id)} 
                      disabled={deleteVendorMutation.isPending} 
                      className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleteVendorMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}

              {/* Suspend Vendor Form */}
              {modalType === 'suspend' && selectedVendor && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Suspending: {selectedVendor.businessName}</p>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Reason for suspension</label>
                    <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" placeholder="Enter reason..." />
                  </div>
                  <button onClick={() => { if (!suspendReason) { toast.error('Please provide a reason'); return; } suspendMutation.mutate({ id: selectedVendor.id, reason: suspendReason }); }} disabled={suspendMutation.isPending} className="w-full px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50">
                    {suspendMutation.isPending ? 'Suspending...' : 'Suspend Vendor'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
