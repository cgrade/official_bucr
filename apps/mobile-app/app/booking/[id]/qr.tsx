import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Share2, Info } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { reservationsApi } from '../../../src/lib/api';
import { useTheme } from '../../../src/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const QR_SIZE = Math.min(width * 0.72, 280);

export default function BookingQRScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [qrError, setQrError] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => reservationsApi.getById(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  const reservation = data?.data;

  // QR payload — MUST match what the vendor's verify-qr endpoint parses
  // (parseQRCodeData expects { type:'reservation', id, reference, pin }).
  // We render the QR client-side from this canonical payload; we do NOT use
  // reservation.qrCode here because that field is a rendered PNG data-URL, not
  // a value to re-encode.
  const qrValue =
    reservation?.id && reservation?.reference && reservation?.pin
      ? JSON.stringify({
          type: 'reservation',
          id: reservation.id,
          reference: reservation.reference,
          pin: reservation.pin,
        })
      : null;

  const handleShare = async () => {
    if (!reservation) return;
    await Share.share({
      message: `Bucr Reservation\nRef: ${reservation.reference}\nPIN: ${reservation.pin}\nShow this to your host on arrival.`,
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tertiary} />
      </View>
    );
  }

  if (!reservation || !qrValue) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>QR code unavailable</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Check-in QR</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={handleShare}>
          <Share2 size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* White background required for QR scanner contrast */}
        <View style={styles.qrCard}>
          {qrError ? (
            <View style={[styles.qrFallback]}>
              <Text style={styles.qrFallbackText}>QR unavailable{'\n'}Use PIN below</Text>
            </View>
          ) : (
            <QRCode
              value={qrValue}
              size={QR_SIZE}
              color="#070f1e"
              backgroundColor="#ffffff"
              onError={() => setQrError(true)}
            />
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Reference</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{reservation.reference}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Check-in PIN</Text>
            <Text style={[styles.pinValue, { color: colors.tertiary }]}>{reservation.pin}</Text>
          </View>
        </View>

        <View style={[styles.notice, { backgroundColor: colors.tertiaryLight, borderColor: colors.borderLight }]}>
          <Info size={14} color={colors.tertiary} />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            Show this QR code or your PIN to the host on arrival to confirm your deposit and complete check-in.
          </Text>
        </View>

        {reservation.vendor?.businessName && (
          <Text style={[styles.vendor, { color: colors.textMuted }]}>
            {reservation.vendor.businessName}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  loading:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:       { fontSize: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  closeBtn:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:           { fontSize: 17, fontWeight: '600' },
  content:         { flex: 1, alignItems: 'center', paddingHorizontal: 24, gap: 16 },
  qrCard: {
    padding: 16, borderRadius: 20, backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  qrFallback:      { width: QR_SIZE, height: QR_SIZE, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  qrFallbackText:  { fontSize: 13, color: '#666', textAlign: 'center' },
  infoCard:        { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  divider:         { height: 1, marginHorizontal: 16 },
  infoLabel:       { fontSize: 13 },
  infoValue:       { fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  pinValue:        { fontSize: 22, fontWeight: '800', letterSpacing: 6 },
  notice: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    width: '100%', padding: 14, borderRadius: 12, borderWidth: 1,
  },
  noticeText:      { flex: 1, fontSize: 12, lineHeight: 17 },
  vendor:          { fontSize: 12, marginTop: 4 },
});
