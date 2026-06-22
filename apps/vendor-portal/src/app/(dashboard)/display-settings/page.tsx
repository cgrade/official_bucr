'use client';
import FeatureGate from '@/components/ui/FeatureGate';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { displaySettingsApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Sparkles,
  Trophy,
  Image as ImageIcon,
  Star,
  UtensilsCrossed,
  Megaphone,
  Save,
  Loader2,
  Smartphone,
  Settings2,
} from 'lucide-react';

interface DisplaySettings {
  showExperiences: boolean;
  showSpecialOffers: boolean;
  showAchievements: boolean;
  showGallery: boolean;
  showReviews: boolean;
  showMenu: boolean;
  promoMessage: string | null;
  promoEnabled: boolean;
}

function DisplaySettingsPageInner() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<DisplaySettings>({
    showExperiences: true,
    showSpecialOffers: true,
    showAchievements: true,
    showGallery: true,
    showReviews: true,
    showMenu: true,
    promoMessage: null,
    promoEnabled: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['display-settings'],
    queryFn: () => displaySettingsApi.get(),
  });

  useEffect(() => {
    if (data?.data) {
      setSettings(data.data);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (newSettings: Partial<DisplaySettings>) => displaySettingsApi.update(newSettings),
    onSuccess: () => {
      toast.success('Display settings updated');
      queryClient.invalidateQueries({ queryKey: ['display-settings'] });
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  const handleToggle = (key: keyof DisplaySettings) => {
    const newValue = !settings[key];
    setSettings({ ...settings, [key]: newValue });
    updateMutation.mutate({ [key]: newValue });
  };

  const handlePromoSave = () => {
    updateMutation.mutate({
      promoMessage: settings.promoMessage,
      promoEnabled: settings.promoEnabled,
    });
  };

  const settingsItems = [
    {
      key: 'showMenu' as const,
      label: 'Menu',
      description: 'Show your menu to mobile app users',
      icon: UtensilsCrossed,
      color: 'text-[#c9a84c]',
      bgColor: 'bg-[#c9a84c]/10',
    },
    {
      key: 'showGallery' as const,
      label: 'Gallery',
      description: 'Display photo gallery on your venue page',
      icon: ImageIcon,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      key: 'showExperiences' as const,
      label: 'Experiences',
      description: 'Show special dining experiences and events',
      icon: Sparkles,
      color: 'text-tertiary-500',
      bgColor: 'bg-tertiary-500/10',
    },
    {
      key: 'showAchievements' as const,
      label: 'Achievements & Badges',
      description: 'Display your trust badges and achievements',
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      key: 'showReviews' as const,
      label: 'Reviews',
      description: 'Allow users to see customer reviews',
      icon: Star,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      key: 'showSpecialOffers' as const,
      label: 'Special Offers',
      description: 'Display promotional offers and discounts',
      icon: Megaphone,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1d3a]">
      <header className="sticky top-0 z-10 bg-[#0f2547] border-b border-[rgba(201,168,76,0.18)]">
        <div className="px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f2547] shadow-lg shadow-primary-500/30">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f5f0e8]">
                Display Settings
              </h1>
              <p className="text-[#7a8fa6]">
                Control what mobile app users can see on your venue page
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-4xl mx-auto">
        {/* Feature Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Settings2 className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-[#f5f0e8]">
              Visibility Controls
            </h2>
          </div>

          <div className="space-y-4">
            {settingsItems.map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.bgColor}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-[#f5f0e8]">{item.label}</p>
                    <p className="text-sm text-[#7a8fa6]">{item.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(item.key)}
                  disabled={updateMutation.isPending}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    settings[item.key]
                      ? 'bg-[#c9a84c]'
                      : 'bg-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      settings[item.key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Promo Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Megaphone className="h-5 w-5 text-pink-500" />
            <h2 className="text-lg font-semibold text-[#f5f0e8]">
              Promotional Banner
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.04)]">
              <div>
                <p className="font-medium text-[#f5f0e8]">Enable Promo Banner</p>
                <p className="text-sm text-[#7a8fa6]">
                  Show a promotional message at the top of your venue page
                </p>
              </div>
              <button
                onClick={() => {
                  const newValue = !settings.promoEnabled;
                  setSettings({ ...settings, promoEnabled: newValue });
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  settings.promoEnabled
                    ? 'bg-[#c9a84c]'
                    : 'bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                    settings.promoEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.promoEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">
                  Promo Message (max 500 characters)
                </label>
                <textarea
                  value={settings.promoMessage || ''}
                  onChange={(e) => setSettings({ ...settings, promoMessage: e.target.value })}
                  placeholder="e.g., 🎉 20% off all orders this weekend! Use code WEEKEND20"
                  className="w-full rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  rows={3}
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7a8fa6]">
                    {(settings.promoMessage || '').length}/500 characters
                  </span>
                  <Button
                    onClick={handlePromoSave}
                    disabled={updateMutation.isPending}
                    className="btn-gradient gap-2"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Promo
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-[#f5f0e8]">
              Mobile Preview
            </h2>
          </div>

          <div className="bg-[rgba(255,255,255,0.05)] rounded-xl p-4">
            <p className="text-sm text-slate-600 text-[#7a8fa6] mb-4">
              Users will see the following sections on your venue page:
            </p>
            <div className="flex flex-wrap gap-2">
              {settings.showMenu && (
                <span className="px-3 py-1 rounded-full bg-[#c9a84c]/10 dark:bg-[#c9a84c]/15 text-[#a07830] dark:text-[#e8d49a] text-sm font-medium">
                  Menu
                </span>
              )}
              {settings.showGallery && (
                <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-medium">
                  Gallery
                </span>
              )}
              {settings.showExperiences && (
                <span className="px-3 py-1 rounded-full bg-tertiary-100 dark:bg-tertiary-900/30 text-tertiary-600 dark:text-tertiary-400 text-sm font-medium">
                  Experiences
                </span>
              )}
              {settings.showAchievements && (
                <span className="px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                  Achievements
                </span>
              )}
              {settings.showReviews && (
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium">
                  Reviews
                </span>
              )}
              {settings.showSpecialOffers && (
                <span className="px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-sm font-medium">
                  Special Offers
                </span>
              )}
              {settings.promoEnabled && settings.promoMessage && (
                <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-sm font-medium">
                  Promo Banner
                </span>
              )}
            </div>
            {!settings.showMenu && !settings.showGallery && !settings.showExperiences && 
             !settings.showAchievements && !settings.showReviews && !settings.showSpecialOffers && (
              <p className="text-sm text-[#7a8fa6] mt-2">
                ⚠️ All sections are hidden. Users will only see basic venue info.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function DisplaySettingsPage() { return <FeatureGate feature="display_settings"><DisplaySettingsPageInner /></FeatureGate>; }
