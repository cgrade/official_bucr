import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Image, FlatList, Linking, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, MapPin, Users, ChevronRight, QrCode, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Header } from '../../src/components/Header';
import { SlideMenu } from '../../src/components/SlideMenu';
import { GradientButton, EmptyState } from '../../src/components/ui';
import { reservationsApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth.store';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { config } from '../../src/lib/config';

type TabType = 'upcoming' | 'past' | 'cancelled';

const TABS: { id: TabType; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

interface Reservation {
  id: string;
  reference: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  vendor: {
    businessName: string;
    logo?: string;
    slug: string;
  };
  branch?: {
    address: string;
    city: string;
  };
}

function formatBookingDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function ReservationCard({ reservation, onPress, onViewQR, onCancel, colors }: {
  reservation: Reservation;
  onPress: () => void;
  onCancel?: () => void;
  onViewQR: () => void;
  colors: any;
}) {
  const isUpcoming = !isPast(new Date(reservation.date)) && reservation.status !== 'cancelled';

  return (
    <TouchableOpacity style={[styles.reservationCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.vendorInfo}>
          {reservation.vendor.logo ? (
            <Image 
              source={{ 
                uri: reservation.vendor.logo.startsWith('http') 
                  ? reservation.vendor.logo 
                  : `${config.apiUrl}${reservation.vendor.logo}`
              }} 
              style={styles.vendorLogo} 
            />
          ) : (
            <View style={[styles.vendorLogoPlaceholder, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.vendorLogoText, { color: colors.textMuted }]}>{reservation.vendor.businessName.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.vendorDetails}>
            <Text style={[styles.vendorName, { color: colors.text }]} numberOfLines={1}>{reservation.vendor.businessName}</Text>
            <Text style={[styles.reference, { color: colors.textSecondary }]}>{reservation.reference}</Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <CalendarDays size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{formatBookingDate(reservation.date)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{reservation.time}</Text>
        </View>
        <View style={styles.detailRow}>
          <Users size={16} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{reservation.partySize} {reservation.partySize === 1 ? 'guest' : 'guests'}</Text>
        </View>
      </View>

      {isUpcoming && (
        <View style={[styles.cardActions, { borderTopColor: colors.borderLight }]}>
          <TouchableOpacity style={[styles.qrButton, { backgroundColor: colors.tertiaryLight }]} onPress={onViewQR}>
            <QrCode size={18} color={colors.tertiary} />
            <Text style={[styles.qrButtonText, { color: colors.tertiary }]}>View QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.directionsButton, { backgroundColor: colors.inputBackground }]} onPress={() => {
            const address = reservation.branch?.address || reservation.vendor.businessName;
            const url = Platform.select({
              ios: `maps:0,0?q=${encodeURIComponent(address)}`,
              android: `geo:0,0?q=${encodeURIComponent(address)}`,
            });
            if (url) Linking.openURL(url);
          }}>
            <MapPin size={18} color={colors.textMuted} />
            <Text style={[styles.directionsButtonText, { color: colors.textMuted }]}>Directions</Text>
          </TouchableOpacity>
          {onCancel && (
            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.errorLight }]} onPress={onCancel}>
              <XCircle size={16} color={colors.error} />
              <Text style={[styles.cancelButtonText, { color: colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {reservation.status === 'cancelled' && (
        <View style={[styles.cancelledBadge, { backgroundColor: colors.error + '15' }]}>
          <Text style={[styles.cancelledText, { color: colors.error }]}>Cancelled</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function AuthRequiredView({ onLogin, colors }: { onLogin: () => void; colors: any }) {
  return (
    <View style={styles.authRequired}>
      <Text style={styles.authIcon}>📅</Text>
      <Text style={[styles.authTitle, { color: colors.text }]}>Sign in to view bookings</Text>
      <Text style={[styles.authSubtitle, { color: colors.textSecondary }]}>
        Create an account or sign in to manage your reservations
      </Text>
      <TouchableOpacity style={[styles.signInButton, { backgroundColor: colors.tertiary }]} onPress={onLogin}>
        <Text style={[styles.signInButtonText, { color: colors.primaryDark }]}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => reservationsApi.getAll(),
    enabled: user !== null,
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) => reservationsApi.cancel(reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: any) => {
      Alert.alert('Cancellation failed', err?.response?.data?.message || 'Could not cancel. Please try again.');
    },
  });

  const handleCancel = (reservation: Reservation) => {
    const reservationDate = new Date(reservation.date);
    const hoursUntil = (reservationDate.getTime() - Date.now()) / (1000 * 60 * 60);
    const refundMsg = hoursUntil >= 24
      ? 'Your full deposit will be refunded.'
      : hoursUntil >= 12
      ? '50% of your deposit will be refunded.'
      : 'No refund — cancellation is less than 12 hours before your booking.';

    Alert.alert(
      'Cancel Reservation',
      `Cancel your reservation at ${reservation.vendor.businessName}?\n\n${refundMsg}`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(reservation.id),
        },
      ]
    );
  };

  const allReservations = data?.data || [];

  const filteredReservations = allReservations.filter((r: Reservation) => {
    const reservationDate = new Date(r.date);
    const isPastDate = isPast(reservationDate);
    
    if (activeTab === 'upcoming') {
      return !isPastDate && r.status !== 'cancelled';
    } else if (activeTab === 'past') {
      return isPastDate && r.status !== 'cancelled';
    } else {
      return r.status === 'cancelled';
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const navigateToBooking = (id: string) => {
    router.push(`/booking/${id}`);
  };

  const navigateToQR = (id: string) => {
    router.push(`/booking/${id}/qr`);
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <AuthRequiredView onLogin={() => router.push('/(auth)/login')} colors={colors} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header 
        onMenuPress={() => setMenuVisible(true)}
      />
      <SlideMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
      />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Page Title */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Bookings</Text>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab.id && { color: colors.primary }]}>
                {tab.label}
                {tab.id === 'upcoming' && filteredReservations.length > 0 && activeTab === 'upcoming' && (
                  <Text style={{ color: colors.primary }}> ({filteredReservations.length})</Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reservations List */}
        <View style={styles.listContent}>
          {filteredReservations.length > 0 ? (
            filteredReservations.map((item) => (
              <ReservationCard
                key={item.id}
                reservation={item}
                onPress={() => navigateToBooking(item.id)}
                onViewQR={() => navigateToQR(item.id)}
                onCancel={activeTab === 'upcoming' && item.status === 'confirmed'
                  ? () => handleCancel(item)
                  : undefined}
                colors={colors}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No {activeTab} bookings</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeTab === 'upcoming'
                  ? 'Browse restaurants and make a reservation'
                  : 'Your past bookings will appear here'}
              </Text>
              {activeTab === 'upcoming' && (
                <TouchableOpacity
                  style={[styles.browseButton, { backgroundColor: colors.tertiary }]}
                  onPress={() => router.push('/(tabs)/search')}
                >
                  <Text style={[styles.browseButtonText, { color: '#070f1e' }]}>Browse Restaurants</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Tip */}
        {activeTab === 'upcoming' && filteredReservations.length > 0 && (
          <View style={[styles.tipContainer, { backgroundColor: colors.success + '15' }]}>
            <Text style={[styles.tipText, { color: colors.success }]}>
              💡 Show your QR code when you arrive to check in and get your credits back + 3% bonus!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {},
  tabBadge: {},
  listContent: {
    padding: 20,
    flexGrow: 1,
  },
  reservationCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vendorLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  vendorLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorLogoText: {
    fontSize: 20,
    fontWeight: '700',
  },
  vendorDetails: {
    marginLeft: 12,
    flex: 1,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  reference: {
    fontSize: 13,
    marginTop: 2,
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
    paddingTop: 12,
  },
  qrButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  qrButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  directionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  directionsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, gap: 5,
  },
  cancelButtonText: {
    fontSize: 13, fontWeight: '600',
  },
  cancelledBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cancelledText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipContainer: {
    margin: 20,
    padding: 14,
    borderRadius: 12,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
  },
  authRequired: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  authIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
