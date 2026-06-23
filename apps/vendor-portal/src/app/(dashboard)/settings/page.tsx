'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth.store';
import { settingsApi, branchApi, authApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Settings,
  Building2,
  Clock,
  Bell,
  CreditCard,
  Shield,
  Users,
  MapPin,
  Phone,
  Mail,
  Globe,
  Save,
  Camera,
  Trash2,
  Loader2,
  Plus,
  Navigation,
} from 'lucide-react';

// Dynamically import MapPicker — it needs mapbox-gl which is browser-only
const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl bg-[rgba(255,255,255,0.05)] animate-pulse flex items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-[#7a8fa6]" />
    </div>
  ),
});

const settingsSections = [
  { id: 'business',      label: 'Business Info',        icon: Building2 },
  { id: 'reservations',  label: 'Reservations',         icon: CreditCard },
  { id: 'locations',     label: 'Locations & Map',      icon: MapPin },
  { id: 'hours',         label: 'Business Hours',       icon: Clock },
  { id: 'notifications', label: 'Notifications',        icon: Bell },
  { id: 'payments',      label: 'Payment Settings',     icon: CreditCard },
  { id: 'security',      label: 'Security',             icon: Shield },
  { id: 'team',          label: 'Team Members',         icon: Users },
];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('business');
  const { vendor, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteAccount = () => {
    if (!window.confirm(
      'This will permanently delete your account and anonymise all personal data as required by NDPA 2023.\n\n' +
      'Transaction records are retained for financial compliance. This cannot be undone.\n\n' +
      'Type "DELETE" in the next prompt to confirm.'
    )) return;
    const typed = window.prompt('Type DELETE to confirm account deletion:');
    if (typed !== 'DELETE') {
      toast.info('Account deletion cancelled');
      return;
    }
    authApi.deleteAccount().then(() => {
      toast.success('Account deleted. Logging out…');
      logout();
      router.push('/login');
    }).catch(() => toast.error('Deletion failed. Contact support@bucr.ng'));
  };

  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const inviteMutation = useMutation({
    mutationFn: (email: string) => authApi.inviteTeamMember(email),
    onSuccess: () => {
      toast.success("Invitation sent! They'll receive an email to join your team.");
      setInviteEmail('');
      setShowInviteModal(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to send invitation'),
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    businessName: vendor?.businessName || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    website: '',
    address: '',
    description: '',
    priceLevel: 2, // 1=₦ … 4=₦₦₦₦
  });

  // Reservation settings state
  const [depositMode, setDepositMode] = useState<'global' | 'custom'>('global');
  const [customDepositCredits, setCustomDepositCredits] = useState('');
  const depositMutation = useMutation({
    mutationFn: (credits: number | null) =>
      settingsApi.updateProfile({ customDepositCredits: credits }),
    onSuccess: () => toast.success('Deposit setting saved'),
    onError: () => toast.error('Failed to save deposit setting'),
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Hours form state
  const [hoursForm, setHoursForm] = useState<Record<string, { isOpen: boolean; open: string; close: string }>>(
    daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: { isOpen: true, open: '09:00', close: '22:00' } }), {})
  );

  // Notifications form state
  const [notificationsForm, setNotificationsForm] = useState({
    newReservations: true,
    cancellations: true,
    newOrders: true,
    newReviews: true,
    weeklyReports: true,
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  // Fetch profile data
  const { data: profileData } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
    onSuccess: (data: any) => {
      if (data?.data?.customDepositCredits != null) {
        setDepositMode('custom');
        setCustomDepositCredits(String(data.data.customDepositCredits));
      } else {
        setDepositMode('global');
      }
      if (data?.data?.priceLevel) {
        setProfileForm((f) => ({ ...f, priceLevel: data.data.priceLevel }));
      }
    },
  } as any);

  // Fetch hours data
  const { data: hoursData } = useQuery({
    queryKey: ['settings-hours'],
    queryFn: () => settingsApi.getHours(),
    onSuccess: (data: any) => {
      if (data?.data?.hours) {
        const hrs = data.data.hours.reduce((acc: any, h: any) => ({
          ...acc, [h.day]: { isOpen: h.isOpen, open: h.open || '09:00', close: h.close || '22:00' }
        }), {});
        setHoursForm((prev) => ({ ...prev, ...hrs }));
      }
    },
  } as any);

  // Fetch notifications data
  const { data: notificationsData } = useQuery({
    queryKey: ['settings-notifications'],
    queryFn: () => settingsApi.getNotifications(),
    onSuccess: (data: any) => {
      if (data?.data) {
        setNotificationsForm((prev) => ({ ...prev, ...data.data }));
      }
    },
  } as any);

  // Fetch payment data
  const { data: paymentData } = useQuery({
    queryKey: ['settings-payment'],
    queryFn: () => settingsApi.getPayment(),
    onSuccess: (data: any) => {
      if (data?.data) {
        setPaymentForm((prev) => ({ ...prev, ...data.data }));
      }
    },
  } as any);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => settingsApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: (formData: FormData) => settingsApi.updateLogo(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      toast.success('Logo updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    },
  });

  // Update hours mutation
  const updateHoursMutation = useMutation({
    mutationFn: (hours: any[]) => settingsApi.updateHours(hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-hours'] });
      toast.success('Business hours updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update hours');
    },
  });

  // Update notifications mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: (settings: any) => settingsApi.updateNotifications(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-notifications'] });
      toast.success('Notification preferences updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update notifications');
    },
  });

  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: (payment: any) => settingsApi.updatePayment(payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-payment'] });
      toast.success('Payment settings updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update payment');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => 
      settingsApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  const handleSaveProfile = useCallback(() => {
    // Filter out empty values and address (not in backend schema)
    const payload: Record<string, any> = {};
    if (profileForm.businessName) payload.businessName = profileForm.businessName;
    if (profileForm.email) payload.email = profileForm.email;
    if (profileForm.phone) payload.phone = profileForm.phone;
    if (profileForm.website) payload.website = profileForm.website;
    if (profileForm.description) payload.description = profileForm.description;
    if (profileForm.priceLevel) payload.priceLevel = profileForm.priceLevel;

    updateProfileMutation.mutate(payload);
  }, [profileForm, updateProfileMutation]);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('logo', files[0]);
      uploadLogoMutation.mutate(formData);
    }
    e.target.value = '';
  }, [uploadLogoMutation]);

  const handleChangePassword = useCallback(() => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  }, [passwordForm, changePasswordMutation]);

  const isSaving = updateProfileMutation.isPending;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-[rgba(201,168,76,0.18)] dark:border-[rgba(201,168,76,0.12)]">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(201,168,76,0.1)]">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f5f0e8]">Settings</h1>
              <p className="text-sm text-[#7a8fa6]">Manage your restaurant settings</p>
            </div>
          </div>
          
          <Button className="btn-gradient gap-2" onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-[rgba(201,168,76,0.18)] dark:border-[rgba(201,168,76,0.12)] p-4">
          <nav className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-[#c9a84c] text-[#070f1e] font-semibold'
                    : 'text-[#7a8fa6] hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                <section.icon className="h-5 w-5" />
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 p-8 overflow-auto">
          {activeSection === 'business' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-[#f5f0e8] mb-1">Business Information</h2>
                <p className="text-sm text-[#7a8fa6]">Update your restaurant details</p>
              </div>

              {/* Logo Upload */}
              <div className="glass-card rounded-2xl p-6">
                <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Restaurant Logo</label>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-20 w-20 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
                    {(profileData as any)?.data?.logo ? (
                      <img
                        src={(profileData as any).data.logo.startsWith('http') ? (profileData as any).data.logo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${(profileData as any).data.logo}`}
                        alt="Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      vendor?.businessName?.charAt(0) || 'R'
                    )}
                  </div>
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadLogoMutation.isPending}
                    >
                      {uploadLogoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                      {uploadLogoMutation.isPending ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                    <p className="text-xs text-[#7a8fa6] mt-2">PNG, JPG, SVG up to 2MB</p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Business Name</label>
                  <Input 
                    value={profileForm.businessName}
                    onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Email</label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8fa6]" />
                      <Input 
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="h-11 rounded-xl pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Phone</label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8fa6]" />
                      <Input 
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="h-11 rounded-xl pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Website</label>
                  <div className="relative mt-1.5">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8fa6]" />
                    <Input 
                      value={profileForm.website}
                      onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                      placeholder="https://yourrestaurant.com" 
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Address</label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-[#7a8fa6]" />
                    <textarea 
                      rows={3}
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] px-4 py-3 pl-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Enter your restaurant address"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Description</label>
                  <textarea
                    rows={4}
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Tell customers about your restaurant..."
                  />
                </div>

                {/* Price level — diner-facing budget signal */}
                <div>
                  <label className="text-sm font-medium text-[rgba(245,240,232,0.7)]">Price Level</label>
                  <p className="text-[12px] text-[#7a8fa6] mt-0.5 mb-2">
                    Helps diners gauge your typical spend. Shown on your listing and used for budget filtering &amp; sorting.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { level: 1, label: '₦',    hint: 'Budget' },
                      { level: 2, label: '₦₦',   hint: 'Moderate' },
                      { level: 3, label: '₦₦₦',  hint: 'Upscale' },
                      { level: 4, label: '₦₦₦₦', hint: 'Fine dining' },
                    ].map((p) => {
                      const active = profileForm.priceLevel === p.level;
                      return (
                        <button
                          key={p.level}
                          type="button"
                          onClick={() => setProfileForm({ ...profileForm, priceLevel: p.level })}
                          className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-colors ${
                            active
                              ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)]'
                              : 'border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(201,168,76,0.4)]'
                          }`}
                        >
                          <span className={`text-base font-bold ${active ? 'text-[#c9a84c]' : 'text-[#f5f0e8]'}`}>{p.label}</span>
                          <span className="text-[10px] text-[#7a8fa6]">{p.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'reservations' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#f5f0e8] mb-1">Reservation Deposit</h2>
                <p className="text-[13px] text-[#7a8fa6]">
                  Set how many credits diners must deposit to confirm a reservation at your venue.
                  This is a flat amount per reservation — party size does not change it. The deposit is fully refunded when the diner checks in (plus a 3% bonus).
                </p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-5">
                {/* Mode selector */}
                <div className="space-y-3">
                  <button
                    onClick={() => { setDepositMode('global'); depositMutation.mutate(null); }}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      depositMode === 'global'
                        ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.06)]'
                        : 'border-[rgba(201,168,76,0.18)] hover:border-[rgba(201,168,76,0.3)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${depositMode === 'global' ? 'border-[#c9a84c] bg-[#c9a84c]' : 'border-[#7a8fa6]'}`}>
                      {depositMode === 'global' && <div className="w-2 h-2 rounded-full bg-[#070f1e]" />}
                    </div>
                    <div>
                      <p className="font-semibold text-[#f5f0e8]">Use venue-type default</p>
                      <p className="text-[12px] text-[#7a8fa6] mt-1">
                        A flat deposit per reservation based on your venue type — Fine Dining ₦20k · Upscale Casual ₦15k · Lounge / Casual ₦10k. Party size does not change it.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setDepositMode('custom')}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                      depositMode === 'custom'
                        ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.06)]'
                        : 'border-[rgba(201,168,76,0.18)] hover:border-[rgba(201,168,76,0.3)]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${depositMode === 'custom' ? 'border-[#c9a84c] bg-[#c9a84c]' : 'border-[#7a8fa6]'}`}>
                      {depositMode === 'custom' && <div className="w-2 h-2 rounded-full bg-[#070f1e]" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[#f5f0e8]">Set your own flat deposit</p>
                      <p className="text-[12px] text-[#7a8fa6] mt-1">One flat credit amount charged per reservation, regardless of party size</p>
                    </div>
                  </button>
                </div>

                {/* Custom amount input */}
                {depositMode === 'custom' && (
                  <div className="space-y-4 pl-2">
                    {/* Venue-type suggestions */}
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#7a8fa6] mb-2">
                        Suggested by venue type
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Fine Dining', credits: 2000, ngn: '₦20,000' },
                          { label: 'Upscale Casual', credits: 1500, ngn: '₦15,000' },
                          { label: 'Lounge', credits: 1000, ngn: '₦10,000' },
                          { label: 'Casual', credits: 1000, ngn: '₦10,000' },
                        ].map(s => (
                          <button
                            key={s.label}
                            onClick={() => setCustomDepositCredits(String(s.credits))}
                            className={`px-3 py-1.5 rounded-lg border text-[12px] transition-all ${
                              customDepositCredits === String(s.credits)
                                ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.1)] text-[#c9a84c]'
                                : 'border-[rgba(201,168,76,0.2)] text-[#7a8fa6] hover:border-[#c9a84c] hover:text-[#c9a84c]'
                            }`}
                          >
                            {s.label} — {s.ngn}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#7a8fa6] block mb-2">
                        Or enter a custom amount (credits)
                      </label>
                      <div className="flex gap-3 items-center">
                        <Input
                          type="number"
                          min={100}
                          max={10000}
                          placeholder="e.g. 1000"
                          value={customDepositCredits}
                          onChange={e => setCustomDepositCredits(e.target.value)}
                          className="max-w-[140px]"
                        />
                        {customDepositCredits && parseInt(customDepositCredits) >= 100 && (
                          <div className="text-[13px] text-[#7a8fa6]">
                            = <span className="text-[#c9a84c] font-semibold">₦{(parseInt(customDepositCredits) * 10).toLocaleString()}</span> per reservation
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-[#7a8fa6] mt-1.5">
                        Minimum 100 credits (₦1,000) · Maximum 10,000 credits (₦100,000)
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        const v = parseInt(customDepositCredits);
                        if (!v || v < 100 || v > 10000) return toast.error('Must be between 100 and 10,000 credits (₦1,000 – ₦100,000)');
                        depositMutation.mutate(v);
                      }}
                      disabled={depositMutation.isPending || !customDepositCredits}
                      className="gap-2"
                    >
                      {depositMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save Deposit Setting
                    </Button>
                  </div>
                )}

                {/* Info box */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.15)]">
                  <CreditCard className="h-4 w-4 text-[#c9a84c] flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#7a8fa6] leading-relaxed">
                    Deposits are held by Bucr and returned to the diner on check-in with a 3% bonus.
                    A no-show forfeits 40% — 30% goes to you as marketing credits, 10% to Bucr.
                    The per-cover fee is charged per seated head (× party size) on check-in.
                    If you cancel a booking, the guest&apos;s 10% compensation is paid from your wallet credits.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'hours' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-[#f5f0e8] mb-1">Business Hours</h2>
                <p className="text-sm text-[#7a8fa6]">Set your operating hours</p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center gap-4 p-3 rounded-xl bg-[rgba(255,255,255,0.04)]">
                    <span className="w-28 text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">{day}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hoursForm[day]?.isOpen ?? true}
                        onChange={(e) => setHoursForm({ ...hoursForm, [day]: { ...hoursForm[day], isOpen: e.target.checked } })}
                        className="rounded border-slate-300" 
                      />
                      <span className="text-sm text-slate-600 text-[#7a8fa6]">Open</span>
                    </label>
                    <div className="flex items-center gap-2 flex-1">
                      <Input 
                        type="time" 
                        value={hoursForm[day]?.open ?? '09:00'}
                        onChange={(e) => setHoursForm({ ...hoursForm, [day]: { ...hoursForm[day], open: e.target.value } })}
                        disabled={!hoursForm[day]?.isOpen}
                        className="h-9 rounded-lg w-28" 
                      />
                      <span className="text-[#7a8fa6]">to</span>
                      <Input 
                        type="time" 
                        value={hoursForm[day]?.close ?? '22:00'}
                        onChange={(e) => setHoursForm({ ...hoursForm, [day]: { ...hoursForm[day], close: e.target.value } })}
                        disabled={!hoursForm[day]?.isOpen}
                        className="h-9 rounded-lg w-28" 
                      />
                    </div>
                  </div>
                ))}
                <Button 
                  className="btn-gradient mt-4" 
                  onClick={() => {
                    const hoursArray = daysOfWeek.map(day => ({ day, ...hoursForm[day] }));
                    updateHoursMutation.mutate(hoursArray);
                  }}
                  disabled={updateHoursMutation.isPending}
                >
                  {updateHoursMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Hours
                </Button>
              </div>
            </motion.div>
          )}

          {activeSection === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-[#f5f0e8] mb-1">Notification Preferences</h2>
                <p className="text-sm text-[#7a8fa6]">Choose how you want to be notified</p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                {[
                  { key: 'newReservations', label: 'New Reservations', desc: 'Get notified when a new booking is made' },
                  { key: 'cancellations', label: 'Cancellations', desc: 'When a guest cancels a reservation' },
                  { key: 'newOrders', label: 'New Orders', desc: 'Instant notification for takeout/delivery orders' },
                  { key: 'newReviews', label: 'New Reviews', desc: 'When customers leave a review' },
                  { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Summary of your weekly performance' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-[rgba(255,255,255,0.04)]">
                    <div>
                      <p className="font-medium text-[#f5f0e8]">{item.label}</p>
                      <p className="text-sm text-[#7a8fa6]">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notificationsForm[item.key as keyof typeof notificationsForm]}
                        onChange={(e) => setNotificationsForm({ ...notificationsForm, [item.key]: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 bg-[rgba(255,255,255,0.04)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                ))}
                <Button 
                  className="btn-gradient mt-4" 
                  onClick={() => updateNotificationsMutation.mutate(notificationsForm)}
                  disabled={updateNotificationsMutation.isPending}
                >
                  {updateNotificationsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Notifications
                </Button>
              </div>
            </motion.div>
          )}

          {activeSection === 'payments' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-[#f5f0e8] mb-1">Payment Settings</h2>
                <p className="text-sm text-[#7a8fa6]">Manage your payment information</p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Bank Name</label>
                  <Input 
                    value={paymentForm.bankName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                    placeholder="Select your bank" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Account Number</label>
                  <Input 
                    value={paymentForm.accountNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                    placeholder="Enter account number" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Account Name</label>
                  <Input 
                    value={paymentForm.accountName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, accountName: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                    placeholder="Account holder name" 
                  />
                </div>
                <Button 
                  className="btn-gradient mt-4" 
                  onClick={() => updatePaymentMutation.mutate(paymentForm)}
                  disabled={updatePaymentMutation.isPending}
                >
                  {updatePaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Payment Info
                </Button>
              </div>
            </motion.div>
          )}

          {activeSection === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-[#f5f0e8] mb-1">Security Settings</h2>
                <p className="text-sm text-[#7a8fa6]">Protect your account</p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Current Password</label>
                  <Input 
                    type="password" 
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">New Password</label>
                  <Input 
                    type="password" 
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Confirm New Password</label>
                  <Input 
                    type="password" 
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                  />
                </div>
                <Button 
                  className="btn-gradient" 
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
                >
                  {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-red-200 dark:border-red-500/20">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-[#7a8fa6] mb-4">
                  Once you delete your account, there is no going back.
                </p>
                <Button variant="destructive" className="gap-2" onClick={handleDeleteAccount}>
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </motion.div>
          )}

          {activeSection === 'locations' && (
            <LocationsSection queryClient={queryClient} />
          )}

          {activeSection === 'team' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[#f5f0e8] mb-1">Team Members</h2>
                  <p className="text-sm text-[#7a8fa6]">Manage staff access</p>
                </div>
                <Button className="gap-2" onClick={() => setShowInviteModal(true)}>
                  <Users className="h-4 w-4" />
                  Invite Member
                </Button>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-300 text-[#f5f0e8] mx-auto mb-3" />
                  <p className="text-[#7a8fa6]">No team members yet</p>
                  <p className="text-sm text-[#7a8fa6] text-[rgba(122,143,166,0.7)] mt-1">Invite staff to help manage your restaurant</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Team invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,15,30,0.8)]"
          onClick={() => setShowInviteModal(false)}>
          <div className="w-full max-w-md bg-[#0f2547] border border-[rgba(201,168,76,0.25)] rounded-2xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">Invite Team Member</h2>
            <p className="text-[13px] text-[#7a8fa6]">
              They&apos;ll receive an email invitation to join your restaurant&apos;s dashboard.
              Team management requires a Pro or Elite subscription.
            </p>
            <div>
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">
                Email Address
              </label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@restaurant.ng"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => inviteMutation.mutate(inviteEmail)}
                disabled={!inviteEmail || inviteMutation.isPending}
                className="gap-2"
              >
                {inviteMutation.isPending && <span className="animate-spin">⟳</span>}
                Send Invitation
              </Button>
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Locations section (extracted to avoid re-renders on other sections) ────
function LocationsSection({ queryClient }: { queryClient: any }) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '', address: '', city: '', state: 'Lagos',
    phone: '', email: '',
    lat: null as number | null, lng: null as number | null,
    formattedAddress: '',
  });

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchApi.getAll(),
  });
  const branches: any[] = branchesData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => branchApi.create({
      name: branchForm.name,
      address: branchForm.formattedAddress || branchForm.address,
      city: branchForm.city,
      state: branchForm.state,
      phone: branchForm.phone || undefined,
      email: branchForm.email || undefined,
      latitude: branchForm.lat ?? undefined,
      longitude: branchForm.lng ?? undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setShowAddForm(false);
      setBranchForm({ name: '', address: '', city: '', state: 'Lagos', phone: '', email: '', lat: null, lng: null, formattedAddress: '' });
      toast.success('Branch created — lat/lng geocoded automatically if not pinned');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create branch'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => branchApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch location saved');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update branch'),
  });

  const selected = branches.find((b) => b.id === selectedBranchId);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#f5f0e8] mb-1">Locations &amp; Map</h2>
          <p className="text-sm text-[#7a8fa6]">
            Manage branch addresses. Coordinates are geocoded automatically by the server.
          </p>
        </div>
        <Button className="btn-gradient gap-2" onClick={() => { setShowAddForm(true); setSelectedBranchId(null); }}>
          <Plus className="h-4 w-4" />
          Add Branch
        </Button>
      </div>

      {/* Branch list */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" /></div>
      ) : branches.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <MapPin className="h-10 w-10 text-slate-300 text-[#f5f0e8] mx-auto mb-3" />
          <p className="text-[#7a8fa6]">No branches yet — add your first location above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b: any) => (
            <button
              key={b.id}
              onClick={() => { setSelectedBranchId(b.id === selectedBranchId ? null : b.id); setShowAddForm(false); }}
              className={`w-full text-left glass-card rounded-2xl p-4 transition-all border-2 ${
                selectedBranchId === b.id
                  ? 'border-[#c9a84c] dark:border-[#e8d49a]'
                  : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#f5f0e8]">{b.name}</span>
                    {b.isMainBranch && (
                      <span className="px-2 py-0.5 rounded-full bg-[#c9a84c]/50/10 text-[#a07830] dark:text-[#e8d49a] text-xs font-medium">
                        Main
                      </span>
                    )}
                    {b.latitude && b.longitude ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs">📍 Geocoded</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-[#7a8fa6] text-xs">No coordinates</span>
                    )}
                  </div>
                  <p className="text-sm text-[#7a8fa6] mt-0.5">
                    {b.address}, {b.city}, {b.state}
                  </p>
                </div>
                <Navigation className="h-4 w-4 text-[#7a8fa6] flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Edit selected branch — map + address form */}
      {selected && selectedBranchId && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[#f5f0e8]">
            Edit location — {selected.name}
          </h3>
          <MapPicker
            lat={selected.latitude}
            lng={selected.longitude}
            address={`${selected.address}, ${selected.city}`}
            onChange={({ lat, lng, formattedAddress }) => {
              updateMutation.mutate({
                id: selected.id,
                payload: {
                  latitude: lat, longitude: lng,
                  ...(formattedAddress ? { address: formattedAddress } : {}),
                },
              });
            }}
          />
          <p className="text-xs text-[#7a8fa6]">
            Dragging the pin or clicking Find updates the branch coordinates immediately.
          </p>
        </div>
      )}

      {/* Add branch form */}
      {showAddForm && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-[#f5f0e8]">New Branch</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Branch Name *</label>
              <Input value={branchForm.name} onChange={(e) => setBranchForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Victoria Island" className="mt-1.5" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">City *</label>
              <Input value={branchForm.city} onChange={(e) => setBranchForm(p => ({ ...p, city: e.target.value }))} placeholder="Lagos" className="mt-1.5" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Address *</label>
              <Input value={branchForm.address} onChange={(e) => setBranchForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Broad Street" className="mt-1.5" />
            </div>
          </div>

          <MapPicker
            lat={branchForm.lat}
            lng={branchForm.lng}
            address={branchForm.address}
            onChange={({ lat, lng, formattedAddress }) =>
              setBranchForm(p => ({ ...p, lat, lng, formattedAddress: formattedAddress ?? p.address }))
            }
          />

          <div className="flex gap-3 pt-2">
            <Button
              className="btn-gradient gap-2"
              onClick={() => createMutation.mutate()}
              disabled={!branchForm.name || !branchForm.address || !branchForm.city || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Branch
            </Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
