import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, QrCode, Calendar, Clock, Users, MapPin,
  Share2, Navigation, CheckCircle, ShieldAlert, Star,
  Info, MessageSquare, X,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi, reviewsApi } from '../../src/lib/api';
import { format } from 'date-fns';
import { useTheme } from '../../src/contexts/ThemeContext';
import { config, NOSHOW_RETURN_PCT, SHOWUP_BONUS_PCT, DEPOSIT_DEFAULT } from '../../src/lib/config';

// Economic constants mirror backend ECONOMICS: no-show returns 60%, show-up bonus 3%
const CHECKIN_BONUS_PCT = SHOWUP_BONUS_PCT; // 3%
const CREDIT_VALUE_NGN  = config.credits.valueNgn; // ₦10

export default function BookingDetailScreen() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { colors }   = useTheme();
  const { id }       = useLocalSearchParams<{ id: string }>();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating,    setReviewRating]    = useState(0);
  const [reviewText,      setReviewText]      = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => reservationsApi.getById(id!),
    enabled: !!id,
  });

  const reviewM = useMutation({
    mutationFn: () => reviewsApi.create({
      reservationId: id!,
      rating: reviewRating,
      comment: reviewText || undefined,
    }),
    onSuccess: () => {
      Alert.alert('Review Submitted', 'Thank you for your feedback!');
      setShowReviewModal(false);
      queryClient.invalidateQueries({ queryKey: ['reservation', id] });
    },
    onError: () => Alert.alert('Error', 'Could not submit review. Please try again.'),
  });

  const reservation = data?.data;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tertiary} />
      </View>
    );
  }

  if (error || !reservation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>Booking not found</Text>
          <TouchableOpacity style={[styles.goldBtn, { backgroundColor: colors.tertiary }]} onPress={() => router.back()}>
            <Text style={[styles.goldBtnText, { color: colors.primaryDark }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isConfirmed  = reservation.status === 'confirmed' || reservation.status === 'pending';
  const isCheckedIn  = reservation.status === 'checked_in';
  const isCompleted  = reservation.status === 'completed';
  const isNoShow     = reservation.status === 'no_show';
  const isCancelled  = reservation.status === 'cancelled';
  // Use actual deposited amount from the reservation record (source of truth)
  const deposit      = reservation.creditsDeposited ?? DEPOSIT_DEFAULT;
  const returnAmount = Math.round(deposit * NOSHOW_RETURN_PCT);
  const bonusCredits = Math.round(deposit * CHECKIN_BONUS_PCT);
  const hasReview    = !!reservation.review;

  const handleGetDirections = () => {
    const branch = reservation.branch;
    if (!branch?.address) return;
    const q = encodeURIComponent(`${branch.address}, ${branch.city}`);
    Linking.openURL(`https://maps.google.com/?q=${q}`);
  };

  const handleShare = () => {
    Share.share({
      message: `I have a reservation at ${reservation.vendor?.businessName} on ${format(new Date(reservation.date), 'MMM d')} at ${reservation.time}. Ref: ${reservation.reference}`,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Booking Details</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
          <Share2 size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Status banner */}
        {isConfirmed && (
          <View style={[styles.statusBanner, { backgroundColor: colors.tertiaryLight }]}>
            <CheckCircle size={22} color={colors.tertiary} />
            <Text style={[styles.statusText, { color: colors.tertiary }]}>Booking Confirmed</Text>
          </View>
        )}
        {isCheckedIn && (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(74,222,128,0.12)' }]}>
            <CheckCircle size={22} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>Checked In · +{bonusCredits} bonus credits</Text>
          </View>
        )}
        {isCompleted && (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(74,222,128,0.12)' }]}>
            <CheckCircle size={22} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>Visit Completed</Text>
          </View>
        )}
        {isNoShow && (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(248,113,113,0.12)' }]}>
            <ShieldAlert size={22} color={colors.error} />
            <Text style={[styles.statusText, { color: colors.error }]}>No-show · {returnAmount} credits returned</Text>
          </View>
        )}
        {isCancelled && (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(122,143,166,0.12)' }]}>
            <X size={22} color={colors.textMuted} />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>Cancelled</Text>
          </View>
        )}

        {/* QR / check-in card */}
        {(isConfirmed || isCheckedIn) && (
          <TouchableOpacity
            style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => router.push(`/booking/${id}/qr`)}
            activeOpacity={0.85}
          >
            <View style={[styles.qrPlaceholder, { backgroundColor: colors.inputBackground }]}>
              <QrCode size={72} color={colors.tertiary} />
            </View>
            <Text style={[styles.reference, { color: colors.text }]}>{reservation.reference}</Text>
            {reservation.pin && (
              <Text style={[styles.pin, { color: colors.tertiary }]}>PIN: {reservation.pin}</Text>
            )}
            <View style={[styles.viewQrBtn, { backgroundColor: colors.tertiary }]}>
              <Text style={[styles.viewQrText, { color: colors.primaryDark }]}>Show QR at Venue</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Booking details */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.vendorName, { color: colors.text }]} numberOfLines={1}>
            {reservation.vendor?.businessName}
          </Text>

          {[
            { icon: Calendar, text: format(new Date(reservation.date), 'EEEE, MMMM d, yyyy') },
            { icon: Clock,    text: reservation.time },
            { icon: Users,    text: `${reservation.partySize} ${reservation.partySize === 1 ? 'guest' : 'guests'}` },
          ].map(({ icon: Icon, text }) => (
            <View style={styles.detailRow} key={text}>
              <Icon size={16} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>{text}</Text>
            </View>
          ))}

          {reservation.branch && (
            <TouchableOpacity style={styles.detailRow} onPress={handleGetDirections} activeOpacity={0.7}>
              <MapPin size={16} color={colors.textMuted} />
              <Text style={[styles.detailText, { color: colors.tertiary }]} numberOfLines={2}>
                {reservation.branch.address}, {reservation.branch.city} ↗
              </Text>
            </TouchableOpacity>
          )}

          {reservation.specialRequests && (
            <View style={[styles.specialReqs, { backgroundColor: colors.inputBackground }]}>
              <MessageSquare size={14} color={colors.textMuted} />
              <Text style={[styles.specialReqsText, { color: colors.textMuted }]}>
                {reservation.specialRequests}
              </Text>
            </View>
          )}
        </View>

        {/* Deposit & policy card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Deposit & Policy</Text>

          <View style={styles.depositRow}>
            <Text style={[styles.depositLabel, { color: colors.textMuted }]}>Credits deposited</Text>
            <Text style={[styles.depositValue, { color: colors.tertiary }]}>{deposit} credits</Text>
          </View>
          <View style={styles.depositRow}>
            <Text style={[styles.depositLabel, { color: colors.textMuted }]}>₦ equivalent</Text>
            <Text style={[styles.depositValue, { color: colors.text }]}>₦{(deposit * CREDIT_VALUE_NGN).toLocaleString()}</Text>
          </View>

          {/* Policy pills */}
          <View style={[styles.policyBox, { backgroundColor: colors.inputBackground }]}>
            <View style={styles.policyRow}>
              <CheckCircle size={13} color={colors.success} />
              <Text style={[styles.policyText, { color: colors.textMuted }]}>
                Attend → full refund + <Text style={{ color: colors.success }}>+{bonusCredits} bonus credits</Text> (3%)
              </Text>
            </View>
            <View style={styles.policyRow}>
              <ShieldAlert size={13} color={colors.warning} />
              <Text style={[styles.policyText, { color: colors.textMuted }]}>
                No-show → <Text style={{ color: colors.warning }}>{returnAmount} credits returned</Text> (60%), 40% forfeited
              </Text>
            </View>
            <View style={[styles.policyRow, { marginTop: 2 }]}>
              <Info size={12} color={colors.textMuted} />
              <Text style={[styles.policyText, { color: colors.textMuted }]}>
                Cancel 24h+ before → full refund · 12–24h → 50%
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleGetDirections}
          >
            <Navigation size={18} color={colors.tertiary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Directions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleShare}
          >
            <Share2 size={18} color={colors.tertiary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>

          {(isCompleted || isCheckedIn) && !hasReview && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.tertiary, borderWidth: 1 }]}
              onPress={() => setShowReviewModal(true)}
            >
              <Star size={18} color={colors.tertiary} />
              <Text style={[styles.actionText, { color: colors.tertiary }]}>Review</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.goldBtn, { backgroundColor: colors.tertiary }]}
          onPress={() => router.push('/(tabs)/bookings')}
        >
          <Text style={[styles.goldBtnText, { color: colors.primaryDark }]}>View All Bookings</Text>
        </TouchableOpacity>

        {/* Cancelled: re-book CTA */}
        {isCancelled && (
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.tertiary }]}
            onPress={() => router.push(`/venue/${reservation.vendor?.slug}`)}
          >
            <Text style={[styles.outlineBtnText, { color: colors.tertiary }]}>Book Again</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Review modal */}
      <Modal visible={showReviewModal} transparent animationType="slide" onRequestClose={() => setShowReviewModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Leave a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>{reservation.vendor?.businessName}</Text>

            {/* Star picker */}
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity key={s} onPress={() => setReviewRating(s)} style={styles.starBtn}>
                  <Star size={36} color="#c9a84c" fill={s <= reviewRating ? '#c9a84c' : 'none'} />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="Tell others about your experience…"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              style={[styles.reviewInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
            />

            <TouchableOpacity
              style={[styles.goldBtn, { backgroundColor: reviewRating > 0 ? colors.tertiary : colors.border, marginTop: 12 }]}
              onPress={() => reviewM.mutate()}
              disabled={reviewRating === 0 || reviewM.isPending}
            >
              <Text style={[styles.goldBtnText, { color: reviewRating > 0 ? colors.primaryDark : colors.textMuted }]}>
                {reviewM.isPending ? 'Submitting…' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  loadingContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText:       { fontSize: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerButton:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 17, fontWeight: '600' },
  content:         { padding: 16, gap: 12 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 14, gap: 8,
  },
  statusText:      { fontSize: 15, fontWeight: '600' },

  qrCard: {
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 8,
  },
  qrPlaceholder: {
    width: 140, height: 140, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  reference:       { fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  pin:             { fontSize: 13, fontWeight: '600' },
  viewQrBtn: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 4,
  },
  viewQrText:      { fontSize: 14, fontWeight: '700' },

  card:            { borderRadius: 16, padding: 18, gap: 2 },
  cardTitle:       { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  vendorName:      { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  detailRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 5 },
  detailText:      { fontSize: 14, flex: 1, lineHeight: 20 },

  specialReqs: {
    flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, marginTop: 8, alignItems: 'flex-start',
  },
  specialReqsText: { fontSize: 13, flex: 1, lineHeight: 18 },

  depositRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  depositLabel:    { fontSize: 13 },
  depositValue:    { fontSize: 14, fontWeight: '600' },

  policyBox:       { borderRadius: 12, padding: 12, marginTop: 12, gap: 8 },
  policyRow:       { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  policyText:      { fontSize: 12, flex: 1, lineHeight: 17 },

  actionsRow:      { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, gap: 6,
  },
  actionText:      { fontSize: 12, fontWeight: '600' },

  goldBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  goldBtnText:     { fontSize: 15, fontWeight: '700' },

  outlineBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5, marginTop: 4,
  },
  outlineBtnText:  { fontSize: 15, fontWeight: '600' },

  // Review modal
  modalOverlay:    { flex: 1, justifyContent: 'flex-end' },
  modalSheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:      { fontSize: 18, fontWeight: '700' },
  modalSub:        { fontSize: 13 },
  starRow:         { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 4 },
  starBtn:         { padding: 4 },
  reviewInput: {
    borderRadius: 12, borderWidth: 1, padding: 14, minHeight: 100,
    textAlignVertical: 'top', fontSize: 14, lineHeight: 20,
  },
});
