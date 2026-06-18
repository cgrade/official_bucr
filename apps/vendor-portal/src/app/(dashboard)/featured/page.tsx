'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featuredApi, experiencesApi, specialOffersApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Star,
  Sparkles,
  Gift,
  Clock,
  Coins,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function FeaturedPage() {
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [selectedExperience, setSelectedExperience] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<string>('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const { data: featuredData, isLoading } = useQuery({
    queryKey: ['featured'],
    queryFn: () => featuredApi.getData(),
  });

  const { data: experiencesData } = useQuery({
    queryKey: ['experiences'],
    queryFn: () => experiencesApi.getAll(),
  });

  const { data: offersData } = useQuery({
    queryKey: ['special-offers'],
    queryFn: () => specialOffersApi.getAll(),
  });

  const purchaseMutation = useMutation({
    mutationFn: featuredApi.purchase,
    onSuccess: (data) => {
      toast.success(data.message || 'Featured spot purchased successfully!');
      queryClient.invalidateQueries({ queryKey: ['featured'] });
      setShowPurchaseModal(false);
      setSelectedPackage(null);
      setSelectedExperience('');
      setSelectedOffer('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to purchase featured spot');
    },
  });

  const handlePurchase = () => {
    if (!selectedPackage) return;

    const payload: any = { packageId: selectedPackage.id };
    if (selectedPackage.type === 'experience' && selectedExperience) {
      payload.experienceId = selectedExperience;
    }
    if (selectedPackage.type === 'offer' && selectedOffer) {
      payload.offerId = selectedOffer;
    }

    purchaseMutation.mutate(payload);
  };

  const openPurchaseModal = (pkg: any) => {
    setSelectedPackage(pkg);
    setSelectedExperience('');
    setSelectedOffer('');
    setShowPurchaseModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
      </div>
    );
  }

  const { activeSpots = [], pastSpots = [], availablePackages = [], walletBalance = 0 } = featuredData?.data || {};
  const experiences = experiencesData?.data || [];
  const offers = offersData?.data || [];

  const getPackageIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return <Building2 className="h-6 w-6" />;
      case 'experience':
        return <Sparkles className="h-6 w-6" />;
      case 'offer':
        return <Gift className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'from-blue-500 to-indigo-500';
      case 'experience':
        return 'from-purple-500 to-pink-500';
      case 'offer':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

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
                Featured Spots
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Get more visibility with featured placements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl">
            <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              {walletBalance.toLocaleString()} credits
            </span>
          </div>
        </div>
      </header>

      <main className="px-8 py-8 max-w-7xl mx-auto">
        {/* Active Featured Spots */}
        {activeSpots.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Active Featured Spots
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeSpots.map((spot: any) => (
                <div
                  key={spot.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-green-200 dark:border-green-800 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${getTypeColor(spot.type)} text-white`}>
                      {getPackageIcon(spot.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {spot.package?.name}
                      </h3>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium uppercase">
                        {spot.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span>Ends {formatDistanceToNow(new Date(spot.endDate), { addSuffix: true })}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {format(new Date(spot.startDate), 'MMM d')} - {format(new Date(spot.endDate), 'MMM d, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available Packages */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Available Packages
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availablePackages.map((pkg: any) => (
              <div
                key={pkg.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${getTypeColor(pkg.type)} text-white mb-4`}>
                  {getPackageIcon(pkg.type)}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  {pkg.name}
                </h3>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase mb-3">
                  {pkg.type}
                </span>
                {pkg.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {pkg.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold">{pkg.creditsCost}</span> credits
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold">{pkg.durationDays}</span> days
                  </div>
                </div>
                <button
                  onClick={() => openPurchaseModal(pkg)}
                  disabled={walletBalance < pkg.creditsCost}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {walletBalance < pkg.creditsCost ? 'Insufficient Credits' : 'Purchase'}
                </button>
              </div>
            ))}
          </div>
          {availablePackages.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No featured packages available at the moment</p>
            </div>
          )}
        </section>

        {/* Past Featured Spots */}
        {pastSpots.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" />
              Past Featured Spots
            </h2>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Package</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {pastSpots.map((spot: any) => (
                    <tr key={spot.id}>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white font-medium">
                        {spot.package?.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 capitalize">
                        {spot.type}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {format(new Date(spot.startDate), 'MMM d')} - {format(new Date(spot.endDate), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {spot.creditsPaid}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Purchase Featured Spot
            </h3>
            
            <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${getTypeColor(selectedPackage.type)} text-white`}>
                  {getPackageIcon(selectedPackage.type)}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">{selectedPackage.name}</h4>
                  <span className="text-xs text-slate-500 uppercase">{selectedPackage.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                <span><strong>{selectedPackage.creditsCost}</strong> credits</span>
                <span><strong>{selectedPackage.durationDays}</strong> days</span>
              </div>
            </div>

            {/* Experience Selection */}
            {selectedPackage.type === 'experience' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Select Experience to Feature
                </label>
                <select
                  value={selectedExperience}
                  onChange={(e) => setSelectedExperience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">Choose an experience...</option>
                  {experiences.map((exp: any) => (
                    <option key={exp.id} value={exp.id}>{exp.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Offer Selection */}
            {selectedPackage.type === 'offer' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Select Offer to Feature
                </label>
                <select
                  value={selectedOffer}
                  onChange={(e) => setSelectedOffer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">Choose an offer...</option>
                  {offers.map((offer: any) => (
                    <option key={offer.id} value={offer.id}>{offer.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <span className="text-sm text-amber-700 dark:text-amber-300">Your balance:</span>
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {walletBalance.toLocaleString()} credits
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurchase}
                disabled={
                  purchaseMutation.isPending ||
                  (selectedPackage.type === 'experience' && !selectedExperience) ||
                  (selectedPackage.type === 'offer' && !selectedOffer)
                }
                className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {purchaseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Purchase'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
