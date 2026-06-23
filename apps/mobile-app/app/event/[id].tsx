import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, MapPin, Calendar, Clock, Users, Ticket, Minus, Plus, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuthStore } from '../../src/stores/auth.store';
import { eventsApi } from '../../src/lib/api';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = width * 0.85;

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const [qty, setQty] = useState(1);
  const [isFav, setIsFav] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id!),
    enabled: !!id,
  });

  const buyMut = useMutation({
    mutationFn: () => eventsApi.purchaseTicket({ eventId: id!, quantity: qty }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', id] });
      Alert.alert('Success', 'Ticket purchased!');
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.error || 'Failed'),
  });

  const ev = data?.data;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tertiary} />
      </View>
    );
  }

  if (!ev) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backFloating} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Ticket size={48} color={colors.textMuted} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const img = ev.images?.[0];
  const rem = ev.remainingCapacity ?? ev.capacity;
  const total = ev.ticketPrice * qty;
  const eventDate = new Date(ev.date);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {img ? (
            <Image source={{ uri: img }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' }]}>
              <Ticket size={64} color={colors.textMuted} />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top Actions */}
          <SafeAreaView style={styles.heroActions} edges={['top']}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.heroActionsRight}>
              <TouchableOpacity style={styles.heroBtn} onPress={() => setIsFav(!isFav)}>
                <Heart size={20} color="#FFF" fill={isFav ? '#EF4444' : 'transparent'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtn}>
                <Share2 size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Bottom Info on Hero */}
          <View style={styles.heroBottom}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.tertiary }]}>
              <Text style={styles.categoryBadgeText}>
                {ev.category?.charAt(0).toUpperCase() + ev.category?.slice(1) || 'Event'}
              </Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{ev.title}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.attendeeInfo}>
                <Users size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.attendeeText}>
                  {rem > 0 ? `${rem} spots remaining` : 'Sold out'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Date & Time Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.primary + '18' }]}>
                <Calendar size={18} color={colors.primary} />
              </View>
              <View style={styles.infoTextGroup}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date & Time</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {format(eventDate, 'EEEE, MMMM d, yyyy')}
                </Text>
                <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
                  {format(eventDate, 'h:mm a')}
                </Text>
              </View>
            </View>
          </View>

          {/* Location Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.tertiary + '18' }]}>
                <MapPin size={18} color={colors.tertiary} />
              </View>
              <View style={styles.infoTextGroup}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Location</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{ev.location}</Text>
                {ev.city && <Text style={[styles.infoSub, { color: colors.textSecondary }]}>{ev.city}</Text>}
              </View>
            </View>
          </View>

          {/* Hosted By */}
          {ev.vendor && (
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <View style={styles.infoRow}>
                <View style={[styles.vendorAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.vendorAvatarText}>
                    {ev.vendor.businessName?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.infoTextGroup}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Hosted by</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{ev.vendor.businessName}</Text>
                </View>
              </View>
            </View>
          )}

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
              {ev.description || 'No description available for this event.'}
            </Text>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Purchase Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.qtySection}>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus size={16} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.qtyText, { color: colors.text }]}>{qty}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setQty((q) => Math.min(10, q + 1))}
          >
            <Plus size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.buyBtn, { backgroundColor: rem <= 0 ? colors.border : colors.primary }]}
          disabled={rem <= 0 || buyMut.isPending}
          onPress={() => {
            if (!isAuthenticated) { router.push('/(auth)/login'); return; }
            Alert.alert(
              'Confirm Purchase',
              `Buy ${qty} ticket(s) for ${total} credits?`,
              [{ text: 'Cancel', style: 'cancel' }, { text: 'Buy Now', onPress: () => buyMut.mutate() }],
            );
          }}
        >
          {buyMut.isPending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buyBtnText}>
              {rem <= 0 ? 'Sold Out' : `Buy · ${total} credits`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  backFloating: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Hero
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroActionsRight: {
    flexDirection: 'row',
    gap: 10,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  categoryBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendeeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoSub: {
    fontSize: 13,
    marginTop: 2,
  },
  vendorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // About
  aboutSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 14,
    borderTopWidth: 1,
  },
  qtySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 14,
  },
  buyBtn: {
    flex: 1,
    marginLeft: 16,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
