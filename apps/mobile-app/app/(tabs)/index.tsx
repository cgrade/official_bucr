import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  Star,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  ChevronDown,
  X,
  Heart,
  UtensilsCrossed,
  GlassWater,
  Coffee,
  Sparkles,
  ShieldCheck,
} from 'lucide-react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Header } from '../../src/components/Header';
import { SlideMenu } from '../../src/components/SlideMenu';
import { Skeleton } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth.store';
import { getCurrentLocation, calculateDistance, formatDistance, UserLocation, getLocationWithCity } from '../../src/lib/location';
import { vendorsApi, featuredApi } from '../../src/lib/api';
import { config } from '../../src/lib/config';

const { width } = Dimensions.get('window');
const FEATURED_WIDTH = width * 0.78;
const CARD_WIDTH = width * 0.65;

const GUEST_OPTIONS = [
  { value: 1, label: '1 Guest' },
  { value: 2, label: '2 Guests' },
  { value: 3, label: '3 Guests' },
  { value: 4, label: '4 Guests' },
  { value: 5, label: '5 Guests' },
  { value: 6, label: '6 Guests' },
  { value: 7, label: '7+ Guests' },
];

const TIME_SLOTS = [
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM',
];

const LOCATION_OPTIONS = [
  { value: 'Lagos, Nigeria', label: 'Lagos' },
  { value: 'Abuja, Nigeria', label: 'Abuja' },
  { value: 'Port Harcourt, Nigeria', label: 'Port Harcourt' },
  { value: 'Ibadan, Nigeria', label: 'Ibadan' },
  { value: 'Kano, Nigeria', label: 'Kano' },
  { value: 'Enugu, Nigeria', label: 'Enugu' },
];

interface Vendor {
  id: string;
  slug: string;
  businessName: string;
  cuisineTypes: string[];
  averageRating: number | null;
  totalReviews: number;
  logo?: string;
  coverImage?: string;
  priceRange?: string;
  bookWithConfidence?: boolean;
  reliabilityScore?: number;
  verificationStatus?: string;
  subscriptionTier?: string;
  mainBranch?: {
    city: string;
    latitude?: number;
    longitude?: number;
  };
}

const QUICK_TIME_SLOTS = ['6:30 PM', '6:45 PM', '7:00 PM'];

// Each category maps to a backend filter param.
// venueType values match the VenueType enum in the DB: fine_dining | upscale_casual | lounge | casual
// businessType values match the BusinessType enum: bar | cafe | restaurant etc.
// filter=experiences is a special flag that shows vendors with active experiences.
const CATEGORIES: {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  filterParam: string;
  filterValue: string;
}[] = [
  { key: 'fine_dining',    label: 'Fine Dining',    icon: UtensilsCrossed, color: '#c9a84c', filterParam: 'venueType',    filterValue: 'fine_dining' },
  { key: 'lounge',         label: 'Lounge',         icon: GlassWater,      color: '#818cf8', filterParam: 'venueType',    filterValue: 'lounge' },
  { key: 'bars',           label: 'Bars',           icon: GlassWater,      color: '#EC4899', filterParam: 'businessType', filterValue: 'bar' },
  { key: 'cafes',          label: 'Cafés',          icon: Coffee,          color: '#F59E0B', filterParam: 'businessType', filterValue: 'cafe' },
  { key: 'experiences',    label: 'Experiences',    icon: Sparkles,        color: '#14B8A6', filterParam: 'filter',       filterValue: 'experiences' },
];

function getImageUrl(url?: string) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${config.apiUrl}${url}`;
}

function FeaturedCard({ item, onPress, colors }: { item: any; onPress: () => void; colors: any }) {
  const vendor = item?.vendor;
  if (!vendor) return null;
  const imageUrl = getImageUrl(vendor.coverImage || vendor.logo);

  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.featuredImageContainer, { backgroundColor: colors.card }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.featuredImage} />
        ) : (
          <View style={[styles.featuredImage, { backgroundColor: colors.cardElevated }]}>
            <UtensilsCrossed size={40} color={colors.textMuted} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.featuredGradient}
        />
        <View style={styles.featuredContent}>
          <View style={[styles.featuredBadge, { backgroundColor: colors.tertiary }]}>
            <Text style={styles.featuredBadgeText}>FEATURED</Text>
          </View>
          <Text style={styles.featuredTitle} numberOfLines={1}>{vendor.businessName}</Text>
          <View style={styles.featuredMeta}>
            <MapPin size={12} color="rgba(255,255,255,0.7)" />
            <Text style={styles.featuredMetaText}>
              {vendor.cuisineTypes?.[0] || 'Restaurant'}
              {vendor.branches?.[0]?.city ? ` · ${vendor.branches[0].city}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.featuredHeart}>
          <Heart size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function RestaurantCard({ vendor, onPress, colors, userLocation }: {
  vendor: Vendor;
  onPress: () => void;
  colors: any;
  userLocation?: UserLocation | null;
}) {
  const imageUrl = getImageUrl(vendor.coverImage || vendor.logo);
  const distance = userLocation && vendor.mainBranch?.latitude && vendor.mainBranch?.longitude
    ? calculateDistance(userLocation.latitude, userLocation.longitude, vendor.mainBranch.latitude, vendor.mainBranch.longitude)
    : null;

  return (
    <TouchableOpacity
      style={[styles.restaurantCard, { backgroundColor: colors.card, borderColor: colors.borderLight, borderWidth: 1 }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.restaurantImageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.restaurantImage} />
        ) : (
          <View style={[styles.restaurantImage, { backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: colors.textMuted }}>{vendor.businessName.charAt(0)}</Text>
          </View>
        )}
        {vendor.averageRating ? (
          <View style={styles.ratingBadge}>
            <Star size={10} color="#FCD34D" fill="#FCD34D" />
            <Text style={styles.ratingBadgeText}>{vendor.averageRating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.restaurantContent}>
        <View style={styles.restaurantNameRow}>
          <Text style={[styles.restaurantName, { color: colors.text }]} numberOfLines={1}>
            {vendor.businessName}
          </Text>
          {(vendor.subscriptionTier === 'pro' || vendor.subscriptionTier === 'elite' || vendor.subscriptionTier === 'premium') && (
            <View style={styles.verifiedDot}>
              <Text style={styles.verifiedDotText}>✓</Text>
            </View>
          )}
        </View>
        <Text style={[styles.restaurantInfo, { color: colors.textMuted }]} numberOfLines={1}>
          {vendor.cuisineTypes?.[0] || 'Restaurant'}
          {distance ? ` · ${formatDistance(distance)}` : ''}
          {vendor.priceRange ? ` · ${vendor.priceRange}` : ''}
        </Text>
        {vendor.bookWithConfidence && (
          <View style={styles.bwcBadge}>
            <ShieldCheck size={10} color="#c9a84c" />
            <Text style={styles.bwcText}>Book with Confidence</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}


export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // ── Viewable-impression tracking for the featured carousel (MRC/IAB) ───────
  // Count a spot only when ≥50% of its card is on-screen for ≥1s, and only once
  // per app session (the server further dedups per viewer). Refs must be stable.
  const seenFeaturedRef = useRef<Set<string>>(new Set());
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 50, minimumViewTime: 1000 });
  const onFeaturedViewableRef = useRef(({ viewableItems }: { viewableItems: Array<{ item?: any }> }) => {
    const fresh: string[] = [];
    for (const v of viewableItems) {
      const id = v.item?.id;
      if (id && !seenFeaturedRef.current.has(id)) {
        seenFeaturedRef.current.add(id);
        fresh.push(id);
      }
    }
    if (fresh.length) featuredApi.trackImpressions(fresh);
  });
  
  // Booking search state
  const [location, setLocation] = useState('Lagos, Nigeria');
  const [guests, setGuests] = useState(2);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('7:00 PM');
  
  // Modal states
  const [guestModalVisible, setGuestModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  useEffect(() => {
    getCurrentLocation().then((loc) => {
      if (loc) {
        setUserLocation(loc);
      }
    });
  }, []);

  const { data: vendorsData, refetch: refetchVendors, isLoading } = useQuery({
    queryKey: ['vendors', 'all'],
    queryFn: () => vendorsApi.getAll({ limit: 10 }),
  });

  const { data: featuredData, refetch: refetchFeatured } = useQuery({
    queryKey: ['featured', 'all'],
    queryFn: () => featuredApi.getAll(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchVendors(), refetchFeatured()]);
    setRefreshing(false);
  }, [refetchVendors, refetchFeatured]);

  const rawVendors = (vendorsData?.data as any)?.items ?? vendorsData?.data;
  const vendors = Array.isArray(rawVendors) ? rawVendors : [];
  const featuredRestaurants = featuredData?.data?.featuredRestaurants || [];
  const greeting = user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'Hello there';

  const navigateToVendor = (slug: string) => {
    router.push(`/venue/${slug}`);
  };

  const handleSearch = () => {
    const params = new URLSearchParams({
      location,
      guests: guests.toString(),
      date: selectedDate.toISOString().split('T')[0],
      time: selectedTime,
    });
    router.push(`/(tabs)/search?${params.toString()}`);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header onMenuPress={() => setMenuVisible(true)} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greeting, { color: colors.text }]}>{greeting} 👋</Text>
          <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
            Discover the best dining & experiences
          </Text>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/search')}
          activeOpacity={0.8}
        >
          <Search size={20} color={colors.textMuted} />
          <Text style={[styles.searchBarText, { color: colors.textMuted }]}>
            Search restaurants, events...
          </Text>
        </TouchableOpacity>

        {/* Featured Section */}
        {featuredRestaurants.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredRestaurants}
              keyExtractor={(item, i) => item?.id || String(i)}
              renderItem={({ item }) => (
                <FeaturedCard
                  item={item}
                  onPress={() => { if (item?.id) featuredApi.trackClick(item.id); navigateToVendor(item?.vendor?.slug); }}
                  colors={colors}
                />
              )}
              viewabilityConfig={viewabilityConfigRef.current}
              onViewableItemsChanged={onFeaturedViewableRef.current}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 20, marginBottom: 16 }]}>
            Categories
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={styles.categoryItem}
                onPress={() => {
                  // Build typed search URL so the search screen filters immediately
                  const params = new URLSearchParams();
                  params.set(cat.filterParam, cat.filterValue);
                  router.push(`/(tabs)/search?${params.toString()}`);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.color + '22' }]}>
                  <cat.icon size={24} color={cat.color} />
                </View>
                <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Near You */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Near You</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
              <Text style={[styles.seeAllText, { color: colors.tertiary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <Skeleton width={CARD_WIDTH} height={200} borderRadius={16} />
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={vendors.slice(0, 8)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.horizontalCard}>
                  <RestaurantCard
                    vendor={item}
                    onPress={() => navigateToVendor(item.slug)}
                    colors={colors}
                    userLocation={userLocation}
                  />
                </View>
              )}
              contentContainerStyle={styles.horizontalList}
            />
          )}
        </View>

        {/* Quick Reserve Card */}
        <View style={styles.reserveSection}>
          <View style={[styles.reserveCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <Text style={[styles.reserveTitle, { color: colors.text }]}>Reserve a table</Text>
            <Text style={[styles.reserveSub, { color: colors.textMuted }]}>Find the perfect spot for tonight</Text>
            <View style={styles.reserveFilters}>
              <TouchableOpacity style={[styles.reserveChip, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight, borderWidth: 1 }]} onPress={() => setDateModalVisible(true)}>
                <Calendar size={14} color={colors.tertiary} />
                <Text style={[styles.reserveChipText, { color: colors.text }]}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reserveChip, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight, borderWidth: 1 }]} onPress={() => setTimeModalVisible(true)}>
                <Clock size={14} color={colors.tertiary} />
                <Text style={[styles.reserveChipText, { color: colors.text }]}>{selectedTime}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reserveChip, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight, borderWidth: 1 }]} onPress={() => setGuestModalVisible(true)}>
                <Users size={14} color={colors.tertiary} />
                <Text style={[styles.reserveChipText, { color: colors.text }]}>{guests} guests</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.reserveButton, { backgroundColor: colors.tertiary }]} onPress={handleSearch}>
              <Text style={[styles.reserveButtonText, { color: colors.primaryDark }]}>Find a Table</Text>
            </TouchableOpacity>
          </View>
        </View>


        <View style={{ height: 100 }} />
      </ScrollView>

      <SlideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />

      {/* Guest Picker Modal */}
      <Modal visible={guestModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Guests</Text>
              <TouchableOpacity onPress={() => setGuestModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {GUEST_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  guests === option.value && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setGuests(option.value);
                  setGuestModalVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText, 
                  { color: guests === option.value ? colors.primary : colors.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={dateModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date</Text>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {generateDateOptions().map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalOption,
                    selectedDate.toDateString() === date.toDateString() && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setDateModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    { color: selectedDate.toDateString() === date.toDateString() ? colors.primary : colors.text }
                  ]}>
                    {formatDate(date)} - {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={timeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Time</Text>
              <TouchableOpacity onPress={() => setTimeModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    { borderColor: colors.border },
                    selectedTime === time && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => {
                    setSelectedTime(time);
                    setTimeModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.timeSlotText,
                    { color: selectedTime === time ? '#FFF' : colors.text }
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal visible={locationModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {LOCATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  location === option.value && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setLocation(option.value);
                  setLocationModalVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText, 
                  { color: location === option.value ? colors.primary : colors.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
  // Greeting
  greetingSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  greetingSub: {
    fontSize: 15,
    marginTop: 4,
  },
  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  searchBarText: {
    fontSize: 15,
    flex: 1,
  },
  // Sections
  section: {
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  horizontalCard: {
    width: CARD_WIDTH,
    marginRight: 12,
  },
  loadingRow: {
    paddingHorizontal: 20,
  },
  // Featured Cards
  featuredCard: {
    width: FEATURED_WIDTH,
    marginRight: 14,
  },
  featuredImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  featuredContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: '#070f1e',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  featuredHeart: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Categories
  categoriesList: {
    paddingHorizontal: 20,
    gap: 20,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Restaurant Cards
  restaurantCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  restaurantImageContainer: {
    position: 'relative',
  },
  restaurantImage: {
    width: '100%',
    height: 140,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  restaurantContent: {
    padding: 12,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  restaurantNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  restaurantInfo: {
    fontSize: 12,
  },
  verifiedDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#1d9bf0',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  verifiedDotText: {
    color: '#fff', fontSize: 8, fontWeight: '800', lineHeight: 10,
  },
  bwcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 5,
  },
  bwcText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c9a84c',
  },
  // Event Cards
  eventCard: {
    width: width * 0.42,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventImageContainer: {
    position: 'relative',
    height: 120,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  eventOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eventBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  eventContent: {
    padding: 10,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 11,
  },
  // Quick Reserve
  reserveSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  reserveCard: {
    borderRadius: 20,
    padding: 24,
  },
  reserveTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  reserveSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  reserveFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  reserveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  reserveChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  reserveButton: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  reserveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  modalOptionText: {
    fontSize: 16,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
