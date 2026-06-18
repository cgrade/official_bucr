'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import {
  Users, UserCheck, UserX, CreditCard, Mail, Phone, Calendar,
  AlertTriangle, Plus, Download, Eye, MoreHorizontal, Star,
  Activity, Wallet, Clock, CheckCircle
} from 'lucide-react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'credits' | 'add' | 'view' | 'suspend'>('credits');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', phone: '', password: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => usersApi.getAll({ page, limit: 20, search: search || undefined }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => usersApi.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User suspended');
      setShowModal(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to suspend user'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => usersApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User activated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to activate user'),
  });

  const adjustCreditsMutation = useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number; reason: string }) =>
      usersApi.adjustCredits(id, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Credits adjusted');
      setShowModal(false);
      setCreditAmount('');
      setCreditReason('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to adjust credits'),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: { name: string; email: string; phone?: string; password: string }) =>
      usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User created successfully');
      setShowModal(false);
      setNewUserForm({ name: '', email: '', phone: '', password: '' });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted');
      setShowModal(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete user'),
  });

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination || { page: 1, total: 0, totalPages: 1 };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { icon: CheckCircle, color: 'text-green-700 bg-green-50 border-green-200', label: 'Active' },
      suspended: { icon: AlertTriangle, color: 'text-red-700 bg-red-50 border-red-200', label: 'Suspended' },
      inactive: { icon: Clock, color: 'text-slate-700 bg-slate-50 border-slate-200', label: 'Inactive' },
    };
    
    const badge = badges[status as keyof typeof badges] || badges.active;
    const IconComponent = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        <IconComponent className="h-3 w-3" />
        {badge.label}
      </span>
    );
  };

  const columns = [
    {
      key: 'user' as const,
      label: 'User',
      render: (user: any) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 dark:text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              ID: {user.id.slice(0, 8)}...
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact' as const,
      label: 'Contact',
      render: (user: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3 text-slate-400" />
            <span className="text-slate-900 dark:text-white truncate">{user.email}</span>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3 w-3 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">{user.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'credits' as const,
      label: 'Credits',
      render: (user: any) => (
        <div className="text-center">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary-500" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {user.creditsBalance || 0}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {formatCurrency((user.creditsBalance || 0) * 100)}
          </p>
        </div>
      ),
    },
    {
      key: 'status' as const,
      label: 'Status',
      render: (user: any) => getStatusBadge(user.status || 'active'),
    },
    {
      key: 'activity' as const,
      label: 'Activity',
      render: (user: any) => (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-400">
              {user.totalBookings || 0} bookings
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400" />
            <span className="text-slate-600 dark:text-slate-400">
              {user.totalReviews || 0} reviews
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'joined' as const,
      label: 'Joined',
      render: (user: any) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {formatDate(user.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions' as const,
      label: 'Actions',
      render: (user: any) => (
        <div className="flex items-center gap-2">
          <button 
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => { setSelectedUser(user); setModalType('credits'); setShowModal(true); }}
            title="Adjust credits"
          >
            <CreditCard className="h-4 w-4 text-primary-500" />
          </button>
          
          {user.status === 'suspended' ? (
            <button
              onClick={() => activateMutation.mutate(user.id)}
              disabled={activateMutation.isPending}
              className="p-1.5 rounded-lg hover:bg-green-50 hover:text-green-600 transition-colors"
              title="Activate user"
            >
              <UserCheck className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedUser(user);
                setModalType('suspend');
                setSuspendReason('');
                setShowModal(true);
              }}
              className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Suspend user"
            >
              <UserX className="h-4 w-4" />
            </button>
          )}
          
          <button 
            onClick={() => {
              setSelectedUser(user);
              setModalType('view');
              setShowModal(true);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="View details"
          >
            <Eye className="h-4 w-4 text-slate-500" />
          </button>
          
          <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <MoreHorizontal className="h-4 w-4 text-slate-500" />
          </button>
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">User Management</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage platform users and their credits ({pagination.total} total)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <Download className="h-4 w-4" />
              <span className="text-sm font-medium">Export</span>
            </button>
            <button 
              onClick={() => {
                setSelectedUser(null);
                setModalType('add');
                setNewUserForm({ name: '', email: '', phone: '', password: '' });
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Add User</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{pagination.total}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {users.filter((u: any) => u.status !== 'suspended').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Credits</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {users.reduce((acc: number, u: any) => acc + (u.creditsBalance || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Suspended</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {users.filter((u: any) => u.status === 'suspended').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={users}
          columns={columns}
          isLoading={isLoading}
          currentPage={page}
          totalPages={pagination.totalPages}
          pageSize={20}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          searchPlaceholder="Search by name, email, or phone..."
        />

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="glass-card rounded-2xl p-6 w-full max-w-md bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {modalType === 'add' && 'Add New User'}
                  {modalType === 'view' && 'User Details'}
                  {modalType === 'credits' && 'Adjust Credits'}
                  {modalType === 'suspend' && 'Suspend User'}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Add User Form */}
              {modalType === 'add' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Full Name</label>
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={newUserForm.name}
                      onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Email</label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Phone (optional)</label>
                    <input
                      type="tel"
                      placeholder="+234..."
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Password</label>
                    <input
                      type="password"
                      placeholder="Min 8 characters"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
                        return toast.error('Please fill in all required fields');
                      }
                      createUserMutation.mutate(newUserForm);
                    }}
                    disabled={createUserMutation.isPending}
                    className="w-full mt-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50"
                  >
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              )}

              {/* View User Details */}
              {modalType === 'view' && selectedUser && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                      {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
                      <p className="text-sm text-slate-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Phone</span>
                      <span className="text-slate-900 dark:text-white">{selectedUser.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Credits Balance</span>
                      <span className="text-slate-900 dark:text-white font-semibold">{selectedUser.creditsBalance || 0}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Status</span>
                      {getStatusBadge(selectedUser.status || 'active')}
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Total Bookings</span>
                      <span className="text-slate-900 dark:text-white">{selectedUser.totalBookings || 0}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Joined</span>
                      <span className="text-slate-900 dark:text-white">{formatDate(selectedUser.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setModalType('credits'); }}
                      className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
                    >
                      Adjust Credits
                    </button>
                    <button
                      onClick={() => deleteUserMutation.mutate(selectedUser.id)}
                      disabled={deleteUserMutation.isPending}
                      className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}

              {/* Adjust Credits Form */}
              {modalType === 'credits' && selectedUser && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 mb-2">{selectedUser.firstName} {selectedUser.lastName}</p>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Amount (+/-)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50 or -20"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Reason</label>
                    <input
                      placeholder="Reason for adjustment"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!creditAmount || !creditReason) return toast.error('Enter amount and reason');
                      adjustCreditsMutation.mutate({
                        id: selectedUser.id,
                        amount: parseInt(creditAmount),
                        reason: creditReason,
                      });
                    }}
                    disabled={adjustCreditsMutation.isPending}
                    className="w-full px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50"
                  >
                    {adjustCreditsMutation.isPending ? 'Adjusting...' : 'Adjust Credits'}
                  </button>
                </div>
              )}

              {/* Suspend User Form */}
              {modalType === 'suspend' && selectedUser && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Suspending: {selectedUser.firstName} {selectedUser.lastName}</p>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Reason for suspension</label>
                    <textarea
                      placeholder="Enter reason..."
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!suspendReason) return toast.error('Please provide a reason');
                      suspendMutation.mutate({ id: selectedUser.id, reason: suspendReason });
                    }}
                    disabled={suspendMutation.isPending}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50"
                  >
                    {suspendMutation.isPending ? 'Suspending...' : 'Suspend User'}
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
