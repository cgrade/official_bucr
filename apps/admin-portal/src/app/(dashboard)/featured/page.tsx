'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featuredApi, vendorsApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Star,
  Sparkles,
  Gift,
  Clock,
  Coins,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Building2,
  Search,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';

type TabType = 'packages' | 'spots';
type FeaturedType = 'restaurant' | 'experience' | 'offer';

const initialPackageForm = {
  name: '',
  type: 'restaurant' as FeaturedType,
  description: '',
  creditsCost: 100,
  durationDays: 7,
  isActive: true,
  sortOrder: 0,
};

export default function FeaturedPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('packages');
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [packageForm, setPackageForm] = useState(initialPackageForm);
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Queries
  const { data: packagesData, isLoading: loadingPackages } = useQuery({
    queryKey: ['featured-packages', typeFilter],
    queryFn: () => featuredApi.getPackages({ type: typeFilter || undefined }),
    enabled: activeTab === 'packages',
  });

  const { data: spotsData, isLoading: loadingSpots } = useQuery({
    queryKey: ['featured-spots', typeFilter],
    queryFn: () => featuredApi.getSpots({ type: typeFilter || undefined }),
    enabled: activeTab === 'spots',
  });

  // Mutations
  const createPackageMutation = useMutation({
    mutationFn: featuredApi.createPackage,
    onSuccess: () => {
      toast.success('Package created successfully');
      queryClient.invalidateQueries({ queryKey: ['featured-packages'] });
      closePackageModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create package');
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => featuredApi.updatePackage(id, payload),
    onSuccess: () => {
      toast.success('Package updated successfully');
      queryClient.invalidateQueries({ queryKey: ['featured-packages'] });
      closePackageModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update package');
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: featuredApi.deletePackage,
    onSuccess: () => {
      toast.success('Package deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['featured-packages'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete package');
    },
  });

  const deleteSpotMutation = useMutation({
    mutationFn: featuredApi.deleteSpot,
    onSuccess: () => {
      toast.success('Featured spot removed');
      queryClient.invalidateQueries({ queryKey: ['featured-spots'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove spot');
    },
  });

  const openPackageModal = (pkg?: any) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPackageForm({
        name: pkg.name,
        type: pkg.type,
        description: pkg.description || '',
        creditsCost: pkg.creditsCost,
        durationDays: pkg.durationDays,
        isActive: pkg.isActive,
        sortOrder: pkg.sortOrder || 0,
      });
    } else {
      setEditingPackage(null);
      setPackageForm(initialPackageForm);
    }
    setShowPackageModal(true);
  };

  const closePackageModal = () => {
    setShowPackageModal(false);
    setEditingPackage(null);
    setPackageForm(initialPackageForm);
  };

  const handlePackageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPackage) {
      updatePackageMutation.mutate({ id: editingPackage.id, payload: packageForm });
    } else {
      createPackageMutation.mutate(packageForm);
    }
  };

  const getPackageIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return <Building2 className="h-5 w-5" />;
      case 'experience':
        return <Sparkles className="h-5 w-5" />;
      case 'offer':
        return <Gift className="h-5 w-5" />;
      default:
        return <Star className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'experience':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'offer':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const packages = packagesData?.data || [];
  const spots = spotsData?.data?.spots || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
              <Star className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Featured Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage featured packages and vendor spots
              </p>
            </div>
          </div>
          {activeTab === 'packages' && (
            <button
              onClick={() => openPackageModal()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Package
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="px-8 flex gap-1 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'packages'
                ? 'text-amber-600 border-amber-500'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Packages
          </button>
          <button
            onClick={() => setActiveTab('spots')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'spots'
                ? 'text-amber-600 border-amber-500'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Active Spots
          </button>
        </div>
      </header>

      <main className="px-8 py-8 max-w-7xl mx-auto">
        {/* Filter */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-500">Filter by type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">All Types</option>
            <option value="restaurant">Restaurant</option>
            <option value="experience">Experience</option>
            <option value="offer">Offer</option>
          </select>
        </div>

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <div>
            {loadingPackages ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : packages.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No featured packages yet</p>
                <button
                  onClick={() => openPackageModal()}
                  className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
                >
                  Create your first package
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Package</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Credits</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Uses</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {packages.map((pkg: any) => (
                      <tr key={pkg.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${getTypeColor(pkg.type)}`}>
                              {getPackageIcon(pkg.type)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{pkg.name}</p>
                              {pkg.description && (
                                <p className="text-xs text-slate-500 truncate max-w-xs">{pkg.description}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium uppercase ${getTypeColor(pkg.type)}`}>
                            {pkg.type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Coins className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">{pkg.creditsCost}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                            <Clock className="h-4 w-4" />
                            <span>{pkg.durationDays} days</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {pkg.isActive ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle className="h-4 w-4" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-sm">
                              <XCircle className="h-4 w-4" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {pkg._count?.featuredSpots || 0}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openPackageModal(pkg)}
                              className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this package?')) {
                                  deletePackageMutation.mutate(pkg.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Spots Tab */}
        {activeTab === 'spots' && (
          <div>
            {loadingSpots ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : spots.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active featured spots</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Package</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Credits</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Source</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {spots.map((spot: any) => (
                      <tr key={spot.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {spot.vendor?.logo ? (
                              <img
                                src={spot.vendor.logo.startsWith('http') ? spot.vendor.logo : `${process.env.NEXT_PUBLIC_API_URL}${spot.vendor.logo}`}
                                alt=""
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                            <span className="font-medium text-slate-900 dark:text-white">
                              {spot.vendor?.businessName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {spot.package?.name}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium uppercase ${getTypeColor(spot.type)}`}>
                            {spot.type}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {format(new Date(spot.startDate), 'MMM d')} - {format(new Date(spot.endDate), 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {spot.creditsPaid > 0 ? (
                            <span className="text-amber-600 font-medium">{spot.creditsPaid}</span>
                          ) : (
                            <span className="text-slate-400">Free</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {spot.addedByAdmin ? (
                            <span className="text-blue-600">Admin</span>
                          ) : (
                            <span className="text-green-600">Purchased</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this featured spot?')) {
                                deleteSpotMutation.mutate(spot.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Package Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              {editingPackage ? 'Edit Package' : 'Create Package'}
            </h3>
            
            <form onSubmit={handlePackageSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Package Name
                </label>
                <input
                  type="text"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={packageForm.type}
                  onChange={(e) => setPackageForm({ ...packageForm, type: e.target.value as FeaturedType })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  disabled={!!editingPackage}
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="experience">Experience</option>
                  <option value="offer">Offer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Credits Cost
                  </label>
                  <input
                    type="number"
                    value={packageForm.creditsCost}
                    onChange={(e) => setPackageForm({ ...packageForm, creditsCost: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={packageForm.durationDays}
                    onChange={(e) => setPackageForm({ ...packageForm, durationDays: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={packageForm.isActive}
                  onChange={(e) => setPackageForm({ ...packageForm, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isActive" className="text-sm text-slate-700 dark:text-slate-300">
                  Active (available for purchase)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closePackageModal}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPackageMutation.isPending || updatePackageMutation.isPending}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {(createPackageMutation.isPending || updatePackageMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingPackage ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
