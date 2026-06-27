import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Users, X, Sparkles, Tag, ChefHat, ChevronDown, Minus, Plus, MapPin } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi, reservationsApi } from '../../../src/lib/api';
import { useAuthStore } from '../../../src/stores/auth.store';
import { format, addDays } from 'date-fns';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { config, getReservationDeposit } from '../../../src/lib/config';

const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function BookingScreen() {
  const router = useRouter();
  const { slug, type, experienceId, offerId } = useLocalSearchParams<{ 
    slug: string;
    type?: 'experience' | 'offer';
    experienceId?: string;
    offerId?: string;
  }>();
  const { user, refreshBalance } = useAuthStore();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  // Chosen branch (null → main). Only surfaced when the vendor has >1 branch.
  const [branchId, setBranchId] = useState<string | null>(null);
  // Optional pre-order: menuItemId -> { name, quantity } — helps the kitchen prep ahead.
  const [preorder, setPreorder] = useState<Record<string, { name: string; quantity: number }>>({});
  const [showPreorder, setShowPreorder] = useState(false);

  // Pass context=dineIn so the menu only returns items available for dine-in
  // (respects isAvailable, unavailableUntil, and availableForDineIn flags)
  const { data: vendorData } = useQuery({
    queryKey: ['vendor', slug, 'dineIn'],
    queryFn: () => vendorsApi.getBySlug(slug!, 'dineIn'),
    enabled: !!slug,
  });

  const vendor = vendorData?.data;
  const branches: any[] = vendor?.branches || [];
  const getImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${config.apiUrl}${url}`;
  };

  // Find the selected experience or offer
  const selectedExperience = useMemo(() => {
    if (type === 'experience' && experienceId && vendor?.experiences) {
      return vendor.experiences.find((e: any) => e.id === experienceId);
    }
    return null;
  }, [type, experienceId, vendor]);

  const selectedOffer = useMemo(() => {
    if (type === 'offer' && offerId && vendor?.specialOffers) {
      return vendor.specialOffers.find((o: any) => o.id === offerId);
    }
    return null;
  }, [type, offerId, vendor]);

  // Flat deposit per reservation — party size does NOT affect it.
  // Uses the vendor's custom deposit, else the venue-type default.
  const creditsRequired = useMemo(() => {
    if (selectedExperience) {
      return selectedExperience.creditsRequired || 1000;
    }
    return getReservationDeposit((vendor as any)?.venueType, (vendor as any)?.customDepositCredits);
  }, [selectedExperience, vendor]);

  // Get max party size for experiences
  const maxPartySize = selectedExperience?.capacity || 10;
  const availablePartySizes = PARTY_SIZES.filter(size => size <= maxPartySize);

  // Flat list of dine-in menu items for the optional pre-order (skip for experience/offer bookings).
  const menuItems = useMemo(() => {
    if (type === 'experience' || type === 'offer') return [];
    return ((vendor as any)?.menu || [])
      .flatMap((c: any) => c?.items || [])
      .filter((i: any) => i && i.name);
  }, [vendor, type]);
  const preorderCount = Object.values(preorder).reduce((s, i) => s + i.quantity, 0);
  const setQty = (id: string, name: string, qty: number) =>
    setPreorder((cur) => {
      const next = { ...cur };
      if (qty <= 0) delete next[id]; else next[id] = { name, quantity: qty };
      return next;
    });

  const userBalance = user?.creditsBalance || 0;
  const hasEnoughCredits = userBalance >= creditsRequired;

  // Booking title based on type
  const bookingTitle = type === 'experience' 
    ? 'Book Experience' 
    : type === 'offer' 
      ? 'Book with Offer' 
      : 'Reserve a Table';

  const createReservation = useMutation({
    mutationFn: (data: any) => reservationsApi.create(data),
    onSuccess: (response) => {
      refreshBalance();
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      router.replace(`/booking/${response.data.id}`);
    },
    onError: (error: any) => {
      if (error?.response?.data?.code === 'VERIFICATION_REQUIRED' || error?.response?.status === 403) {
        Alert.alert('Verify your email', 'Please verify your email to book.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Verify', onPress: () => router.push(`/verify?redirect=/venue/${slug}/book` as any) },
        ]);
        return;
      }
      Alert.alert('Error', error?.response?.data?.error || error.message || 'Failed to create reservation');
    },
  });

  const handleConfirm = () => {
    if (!selectedTime) {
      Alert.alert('Select Time', 'Please select a time slot');
      return;
    }
    if (!hasEnoughCredits) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${creditsRequired} credits but only have ${userBalance}. Would you like to buy more?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => router.push('/wallet/buy') },
        ]
      );
      return;
    }

    const reservationData: any = {
      vendorId: vendor?.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime,
      partySize,
      specialRequests: specialRequests.trim() || undefined,
      ...(branchId ? { branchId } : {}),
      preorderItems: Object.entries(preorder).map(([menuItemId, v]) => ({ menuItemId, name: v.name, quantity: v.quantity })),
    };

    // Add experience or offer ID if applicable
    if (selectedExperience) {
      reservationData.experienceId = selectedExperience.id;
    }
    if (selectedOffer) {
      reservationData.offerId = selectedOffer.id;
    }

    createReservation.mutate(reservationData);
  };

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{bookingTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Venue Name */}
        <Text style={[styles.venueName, { color: colors.text }]}>{vendor?.businessName}</Text>

        {/* Experience Details Card */}
        {selectedExperience && (
          <View style={styles.bookingItemCard}>
            {selectedExperience.images?.[0] && (
              <Image 
                source={{ uri: getImageUrl(selectedExperience.images[0]) }} 
                style={styles.bookingItemImage} 
              />
            )}
            <View style={styles.bookingItemInfo}>
              <View style={styles.bookingItemHeader}>
                <Sparkles size={16} color={colors.tertiary} />
                <Text style={[styles.bookingItemLabel, { color: colors.tertiary }]}>Experience</Text>
              </View>
              <Text style={styles.bookingItemTitle}>{selectedExperience.title}</Text>
              {selectedExperience.description && (
                <Text style={styles.bookingItemDesc} numberOfLines={2}>
                  {selectedExperience.description}
                </Text>
              )}
              <View style={styles.bookingItemMeta}>
                {selectedExperience.duration && (
                  <View style={styles.metaItem}>
                    <Clock size={12} color="#6B7280" />
                    <Text style={styles.metaText}>{selectedExperience.duration} mins</Text>
                  </View>
                )}
                {selectedExperience.capacity && (
                  <View style={styles.metaItem}>
                    <Users size={12} color="#6B7280" />
                    <Text style={styles.metaText}>Up to {selectedExperience.capacity}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Offer Details Card */}
        {selectedOffer && (
          <View style={styles.bookingItemCard}>
            {selectedOffer.image && (
              <Image 
                source={{ uri: getImageUrl(selectedOffer.image) }} 
                style={styles.bookingItemImage} 
              />
            )}
            <View style={styles.bookingItemInfo}>
              <View style={styles.bookingItemHeader}>
                <Tag size={16} color={colors.success} />
                <Text style={[styles.bookingItemLabel, { color: colors.success }]}>Special Offer</Text>
              </View>
              <Text style={styles.bookingItemTitle}>{selectedOffer.title}</Text>
              {selectedOffer.discountType && selectedOffer.discountValue && (
                <View style={[styles.offerDiscount, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.offerDiscountText, { color: colors.success }]}>
                    {selectedOffer.discountType === 'percentage' ? `${selectedOffer.discountValue}% OFF` :
                     selectedOffer.discountType === 'fixed' ? `₦${selectedOffer.discountValue} OFF` :
                     selectedOffer.discountType === 'bogo' ? 'Buy 1 Get 1 Free' : ''}
                  </Text>
                </View>
              )}
              {selectedOffer.terms && (
                <Text style={styles.offerTermsText}>{selectedOffer.terms}</Text>
              )}
            </View>
          </View>
        )}

        {/* Branch selection — only when the vendor has more than one location */}
        {branches.length > 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.partySizeList}>
                {branches.map((b: any) => {
                  const selected = (branchId ?? branches[0]?.id) === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      style={[styles.timeSlot, { backgroundColor: colors.inputBackground }, selected && { backgroundColor: colors.primary }]}
                      onPress={() => setBranchId(b.id)}
                    >
                      <Text style={[styles.timeText, { color: colors.text }, selected && styles.timeTextSelected]}>
                        {b.name}{b.city ? ` · ${b.city}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Date Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Date</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateList}>
              {dates.map((date) => {
                const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    style={[styles.dateItem, { backgroundColor: colors.inputBackground }, isSelected && { backgroundColor: colors.primary }]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.dateDay, { color: colors.textSecondary }, isSelected && styles.dateTextSelected]}>
                      {format(date, 'EEE')}
                    </Text>
                    <Text style={[styles.dateNumber, { color: colors.text }, isSelected && styles.dateTextSelected]}>
                      {format(date, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Time</Text>
          </View>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeSlot, { backgroundColor: colors.inputBackground }, isSelected && { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[styles.timeText, { color: colors.text }, isSelected && styles.timeTextSelected]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Party Size */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Party Size {selectedExperience?.capacity ? `(max ${selectedExperience.capacity})` : ''}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.partySizeList}>
              {availablePartySizes.map((size) => {
                const isSelected = partySize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[styles.partySizeItem, { backgroundColor: colors.inputBackground }, isSelected && { backgroundColor: colors.primary }]}
                    onPress={() => setPartySize(size)}
                  >
                    <Text style={[styles.partySizeText, { color: colors.text }, isSelected && styles.partySizeTextSelected]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Pre-order dishes (optional) — helps the kitchen prep ahead */}
        {menuItems.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setShowPreorder((s) => !s)}
              activeOpacity={0.7}
            >
              <ChefHat size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, flex: 1 }]}>
                Pre-order dishes (optional){preorderCount > 0 ? ` · ${preorderCount}` : ''}
              </Text>
              <ChevronDown
                size={18}
                color={colors.textSecondary}
                style={{ transform: [{ rotate: showPreorder ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>
            {showPreorder && (
              <View>
                <Text style={[styles.preorderHint, { color: colors.textMuted }]}>
                  Help the kitchen prep ahead — you still pay for the meal at the venue.
                </Text>
                {menuItems.map((it: any) => {
                  const q = preorder[it.id]?.quantity ?? 0;
                  return (
                    <View key={it.id} style={[styles.preorderRow, { borderBottomColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.preorderName, { color: colors.text }]} numberOfLines={1}>{it.name}</Text>
                        {it.price != null && (
                          <Text style={[styles.preorderPrice, { color: colors.tertiary }]}>
                            ₦{Number(it.price).toLocaleString()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.preorderStepper}>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.inputBackground }]}
                          onPress={() => setQty(it.id, it.name, q - 1)}
                        >
                          <Minus size={16} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.stepQty, { color: colors.text }]}>{q}</Text>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.inputBackground }]}
                          onPress={() => setQty(it.id, it.name, q + 1)}
                        >
                          <Plus size={16} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Special Requests */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Special Requests (optional)</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
            placeholder="Birthday celebration, dietary requirements, etc."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={specialRequests}
            onChangeText={setSpecialRequests}
          />
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Deposit (flat, per reservation)</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {creditsRequired} credits · ₦{(creditsRequired * config.credits.valueNgn).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Your Balance</Text>
            <Text style={[styles.summaryValue, { color: colors.text }, !hasEnoughCredits && { color: colors.error }]}>
              {userBalance} credits
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>After Booking</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{Math.max(0, userBalance - creditsRequired)} credits</Text>
          </View>
          <View style={[styles.refundNote, { backgroundColor: colors.tertiaryLight }]}>
            <Text style={[styles.refundText, { color: colors.tertiary }]}>✓ Flat deposit per reservation · refunded on arrival + 3% bonus</Text>
          </View>
        </View>

        {/* FCCPA-required policy disclosure — shown before confirmation */}
        <View style={[styles.policyDisclosure, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Text style={[styles.policyTitle, { color: colors.text }]}>Deposit & Cancellation Policy</Text>
          <View style={styles.policyRow}>
            <Text style={[styles.policyBullet, { color: colors.success }]}>✓</Text>
            <Text style={[styles.policyText, { color: colors.textMuted }]}>
              Show up → full deposit refunded + 3% bonus credits
            </Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={[styles.policyBullet, { color: colors.warning }]}>!</Text>
            <Text style={[styles.policyText, { color: colors.textMuted }]}>
              No-show → 40% of deposit forfeited, 60% returned within 24h
            </Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={[styles.policyBullet, { color: colors.tertiary }]}>↩</Text>
            <Text style={[styles.policyText, { color: colors.textMuted }]}>
              Cancel 24h+ before → full refund · 12–24h → 50% · Under 12h → no refund
            </Text>
          </View>
          <Text style={[styles.policyConsent, { color: colors.textMuted }]}>
            By confirming, you agree to this deposit and cancellation policy.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: hasEnoughCredits ? colors.tertiary : colors.border }, !hasEnoughCredits && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={createReservation.isPending || !hasEnoughCredits}
        >
          {createReservation.isPending ? (
            <ActivityIndicator color={colors.primaryDark} />
          ) : (
            <Text style={[styles.confirmButtonText, { color: hasEnoughCredits ? colors.primaryDark : colors.textMuted }]}>
              {hasEnoughCredits ? 'Confirm Reservation' : 'Insufficient Credits'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  venueName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateList: {
    flexDirection: 'row',
    gap: 10,
  },
  dateItem: {
    width: 56,
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateItemSelected: {},
  dateDay: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  dateTextSelected: {
    color: '#FFFFFF',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  timeSlotSelected: {},
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeTextSelected: {
    color: '#FFFFFF',
  },
  partySizeList: {
    flexDirection: 'row',
    gap: 10,
  },
  partySizeItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partySizeSelected: {},
  partySizeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  partySizeTextSelected: {
    color: '#FFFFFF',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    height: 90,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  preorderHint: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  preorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  preorderName: { fontSize: 14, fontWeight: '500' },
  preorderPrice: { fontSize: 12, marginTop: 2 },
  preorderStepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepQty: { fontSize: 15, fontWeight: '600', minWidth: 18, textAlign: 'center' },
  summaryCard: {
    borderRadius: 16,
    padding: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  insufficientBalance: {},
  divider: {
    height: 1,
    marginVertical: 8,
  },
  refundNote: {
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  refundText: {
    fontSize: 13,
    textAlign: 'center',
  },
  policyDisclosure: {
    marginHorizontal: 20, marginBottom: 8,
    borderRadius: 14, borderWidth: 1, padding: 16, gap: 8,
  },
  policyTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  policyRow:   { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  policyBullet:{ fontSize: 13, fontWeight: '700', width: 16 },
  policyText:  { flex: 1, fontSize: 12, lineHeight: 17 },
  policyConsent:{ fontSize: 11, lineHeight: 15, marginTop: 6, fontStyle: 'italic' },
  footer: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  confirmButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Booking Item Card Styles (Experience/Offer)
  bookingItemCard: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  bookingItemImage: {
    width: '100%',
    height: 140,
  },
  bookingItemInfo: {
    padding: 16,
  },
  bookingItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bookingItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  bookingItemDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  bookingItemMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  offerDiscount: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  offerDiscountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  offerTermsText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
