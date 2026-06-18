'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Settings, CreditCard, Bell, Shield, Users, Store,
  Save, RefreshCw, DollarSign, Percent, Clock,
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { admin, hasPermission } = useAuthStore();
  const canEdit = hasPermission('settings.update') || admin?.role === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => settingsApi.getAll(),
  });

  const updateMutation = useMutation({
    mutationFn: (settings: Record<string, any>) => settingsApi.update(settings),
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: () => toast.error('Failed to update settings'),
  });

  const settings = data?.data || {};

  // Local state for form
  const [creditSettings, setCreditSettings] = useState({
    purchaseRate: settings.creditPurchaseRate || 100,
    minPurchase: settings.minCreditPurchase || 10,
    maxPurchase: settings.maxCreditPurchase || 10000,
    expiryMonths: settings.creditExpiryMonths || 6,
  });

  const [reservationSettings, setReservationSettings] = useState({
    standardCredits: settings.standardReservationCredits || 50,
    groupCredits: settings.groupReservationCredits || 100,
    largePartyCredits: settings.largePartyCredits || 200,
    cancellationHours24: settings.cancellation24HoursRefund || 100,
    cancellationHours12: settings.cancellation12HoursRefund || 50,
    noShowPenalty: settings.noShowPenalty || 100,
  });

  const [vendorSettings, setVendorSettings] = useState({
    basicPrice: settings.basicSubscriptionPrice || 75000,
    proPrice: settings.proSubscriptionPrice || 145000,
    premiumPrice: settings.premiumSubscriptionPrice || 250000,
    verificationRequired: settings.vendorVerificationRequired ?? true,
  });

  const handleSaveCreditSettings = () => {
    updateMutation.mutate({
      creditPurchaseRate: creditSettings.purchaseRate,
      minCreditPurchase: creditSettings.minPurchase,
      maxCreditPurchase: creditSettings.maxPurchase,
      creditExpiryMonths: creditSettings.expiryMonths,
    });
  };

  const handleSaveReservationSettings = () => {
    updateMutation.mutate({
      standardReservationCredits: reservationSettings.standardCredits,
      groupReservationCredits: reservationSettings.groupCredits,
      largePartyCredits: reservationSettings.largePartyCredits,
      cancellation24HoursRefund: reservationSettings.cancellationHours24,
      cancellation12HoursRefund: reservationSettings.cancellationHours12,
      noShowPenalty: reservationSettings.noShowPenalty,
    });
  };

  const handleSaveVendorSettings = () => {
    updateMutation.mutate({
      basicSubscriptionPrice: vendorSettings.basicPrice,
      proSubscriptionPrice: vendorSettings.proPrice,
      premiumSubscriptionPrice: vendorSettings.premiumPrice,
      vendorVerificationRequired: vendorSettings.verificationRequired,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 mt-1">Configure system-wide settings</p>
      </div>

      {!canEdit && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            You don&apos;t have permission to edit settings. Contact a super admin for access.
          </p>
        </div>
      )}

      {/* Credit Settings */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-tertiary-500">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Credit Settings</h2>
            <p className="text-sm text-slate-500">Configure credit purchase and expiry rules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Purchase Rate (₦ per credit)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="number"
                value={creditSettings.purchaseRate}
                onChange={(e) => setCreditSettings(s => ({ ...s, purchaseRate: Number(e.target.value) }))}
                className="pl-10"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Expiry Period (months)
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="number"
                value={creditSettings.expiryMonths}
                onChange={(e) => setCreditSettings(s => ({ ...s, expiryMonths: Number(e.target.value) }))}
                className="pl-10"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Min Purchase (credits)
            </label>
            <Input
              type="number"
              value={creditSettings.minPurchase}
              onChange={(e) => setCreditSettings(s => ({ ...s, minPurchase: Number(e.target.value) }))}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Max Purchase (credits)
            </label>
            <Input
              type="number"
              value={creditSettings.maxPurchase}
              onChange={(e) => setCreditSettings(s => ({ ...s, maxPurchase: Number(e.target.value) }))}
              disabled={!canEdit}
            />
          </div>
        </div>

        {canEdit && (
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveCreditSettings} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Credit Settings
            </Button>
          </div>
        )}
      </div>

      {/* Reservation Settings */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reservation Settings</h2>
            <p className="text-sm text-slate-500">Configure reservation credits and cancellation policies</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Standard (1-2 guests)
            </label>
            <Input
              type="number"
              value={reservationSettings.standardCredits}
              onChange={(e) => setReservationSettings(s => ({ ...s, standardCredits: Number(e.target.value) }))}
              disabled={!canEdit}
            />
            <p className="text-xs text-slate-500 mt-1">Credits required</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Group (3-6 guests)
            </label>
            <Input
              type="number"
              value={reservationSettings.groupCredits}
              onChange={(e) => setReservationSettings(s => ({ ...s, groupCredits: Number(e.target.value) }))}
              disabled={!canEdit}
            />
            <p className="text-xs text-slate-500 mt-1">Credits required</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Large Party (7+)
            </label>
            <Input
              type="number"
              value={reservationSettings.largePartyCredits}
              onChange={(e) => setReservationSettings(s => ({ ...s, largePartyCredits: Number(e.target.value) }))}
              disabled={!canEdit}
            />
            <p className="text-xs text-slate-500 mt-1">Credits required</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <h3 className="font-medium text-slate-900 dark:text-white mb-4">Cancellation Policy</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                24+ hours refund %
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={reservationSettings.cancellationHours24}
                  onChange={(e) => setReservationSettings(s => ({ ...s, cancellationHours24: Number(e.target.value) }))}
                  disabled={!canEdit}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                12-24 hours refund %
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={reservationSettings.cancellationHours12}
                  onChange={(e) => setReservationSettings(s => ({ ...s, cancellationHours12: Number(e.target.value) }))}
                  disabled={!canEdit}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                No-show penalty %
              </label>
              <div className="relative">
                <Input
                  type="number"
                  value={reservationSettings.noShowPenalty}
                  onChange={(e) => setReservationSettings(s => ({ ...s, noShowPenalty: Number(e.target.value) }))}
                  disabled={!canEdit}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveReservationSettings} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Reservation Settings
            </Button>
          </div>
        )}
      </div>

      {/* Vendor Settings */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vendor Settings</h2>
            <p className="text-sm text-slate-500">Configure vendor subscription pricing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Basic Plan (₦/month)
            </label>
            <Input
              type="number"
              value={vendorSettings.basicPrice}
              onChange={(e) => setVendorSettings(s => ({ ...s, basicPrice: Number(e.target.value) }))}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Pro Plan (₦/month)
            </label>
            <Input
              type="number"
              value={vendorSettings.proPrice}
              onChange={(e) => setVendorSettings(s => ({ ...s, proPrice: Number(e.target.value) }))}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Premium Plan (₦/month)
            </label>
            <Input
              type="number"
              value={vendorSettings.premiumPrice}
              onChange={(e) => setVendorSettings(s => ({ ...s, premiumPrice: Number(e.target.value) }))}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={vendorSettings.verificationRequired}
              onChange={(e) => setVendorSettings(s => ({ ...s, verificationRequired: e.target.checked }))}
              disabled={!canEdit}
              className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Require document verification for vendor activation
            </span>
          </label>
        </div>

        {canEdit && (
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveVendorSettings} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Vendor Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
