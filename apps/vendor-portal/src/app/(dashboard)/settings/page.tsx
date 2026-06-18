'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth.store';
import { settingsApi } from '@/lib/api';
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
} from 'lucide-react';

const settingsSections = [
  { id: 'business', label: 'Business Info', icon: Building2 },
  { id: 'hours', label: 'Business Hours', icon: Clock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'payments', label: 'Payment Settings', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'team', label: 'Team Members', icon: Users },
];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('business');
  const { vendor } = useAuthStore();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    businessName: vendor?.businessName || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    website: '',
    address: '',
    description: '',
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
    reservationReminders: true,
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
  });

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
      <header className="sticky top-0 z-10 glass-card border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 shadow-lg shadow-slate-500/30">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your restaurant settings</p>
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
        <aside className="w-64 border-r border-slate-200/50 dark:border-slate-800/50 p-4">
          <nav className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-gradient-to-r from-primary-500/10 to-tertiary-500/10 text-primary-600 dark:text-primary-400 border-l-2 border-primary-500'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Business Information</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update your restaurant details</p>
              </div>

              {/* Logo Upload */}
              <div className="glass-card rounded-2xl p-6">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Restaurant Logo</label>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
                    {profileData?.data?.logo ? (
                      <img 
                        src={profileData.data.logo.startsWith('http') ? profileData.data.logo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${profileData.data.logo}`} 
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
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">PNG, JPG, SVG up to 2MB</p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Business Name</label>
                  <Input 
                    value={profileForm.businessName}
                    onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="h-11 rounded-xl pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="h-11 rounded-xl pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Website</label>
                  <div className="relative mt-1.5">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      value={profileForm.website}
                      onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                      placeholder="https://yourrestaurant.com" 
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <textarea 
                      rows={3}
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 pl-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Enter your restaurant address"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                  <textarea 
                    rows={4}
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="Tell customers about your restaurant..."
                  />
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Business Hours</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Set your operating hours</p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300">{day}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hoursForm[day]?.isOpen ?? true}
                        onChange={(e) => setHoursForm({ ...hoursForm, [day]: { ...hoursForm[day], isOpen: e.target.checked } })}
                        className="rounded border-slate-300" 
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Open</span>
                    </label>
                    <div className="flex items-center gap-2 flex-1">
                      <Input 
                        type="time" 
                        value={hoursForm[day]?.open ?? '09:00'}
                        onChange={(e) => setHoursForm({ ...hoursForm, [day]: { ...hoursForm[day], open: e.target.value } })}
                        disabled={!hoursForm[day]?.isOpen}
                        className="h-9 rounded-lg w-28" 
                      />
                      <span className="text-slate-400">to</span>
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Notification Preferences</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Choose how you want to be notified</p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                {[
                  { key: 'newReservations', label: 'New Reservations', desc: 'Get notified when a new booking is made' },
                  { key: 'reservationReminders', label: 'Reservation Reminders', desc: '1 hour before each reservation' },
                  { key: 'newOrders', label: 'New Orders', desc: 'Instant notification for takeout/delivery orders' },
                  { key: 'newReviews', label: 'New Reviews', desc: 'When customers leave a review' },
                  { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Summary of your weekly performance' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={notificationsForm[item.key as keyof typeof notificationsForm]}
                        onChange={(e) => setNotificationsForm({ ...notificationsForm, [item.key]: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Payment Settings</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your payment information</p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bank Name</label>
                  <Input 
                    value={paymentForm.bankName}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                    placeholder="Select your bank" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Number</label>
                  <Input 
                    value={paymentForm.accountNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                    placeholder="Enter account number" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Name</label>
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
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Security Settings</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Protect your account</p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                  <Input 
                    type="password" 
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                  <Input 
                    type="password" 
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm New Password</label>
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
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Once you delete your account, there is no going back.
                </p>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </motion.div>
          )}

          {activeSection === 'team' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Team Members</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Manage staff access</p>
                </div>
                <Button className="btn-gradient gap-2">
                  <Users className="h-4 w-4" />
                  Invite Member
                </Button>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No team members yet</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Invite staff to help manage your restaurant</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

    </div>
  );
}
