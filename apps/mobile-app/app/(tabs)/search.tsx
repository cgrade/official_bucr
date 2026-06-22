import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search as SearchIcon, MapPin, Star, Filter, X, ChevronDown, Map, List, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Header } from '../../src/components/Header';
import { SlideMenu } from '../../src/components/SlideMenu';
import VendorMapView from '../../src/components/VendorMapView';
import { vendorsApi, favoritesApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth.store';
import { getCurrentLocation, clearLocationCache, UserLocation, calculateDistance } from '../../src/lib/location';
import { config } from '../../src/lib/config';

interface Vendor {
  id: string;
  slug: string;
  businessName: string;
  cuisineTypes: string[];
  averageRating: number | null;
  totalReviews: number;
  logo?: string;
  coverImage?: string;
  bookWithConfidence?: boolean;
  reliabilityScore?: number;
  priceRange?: string;
  verificationStatus?: string;
  subscriptionTier?: string;
  mainBranch?: {
    city: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
}

const FILTERS = [
  { id: 'nearby', label: '📍 Near me' },
  { id: 'rating', label: '⭐ 4.5+' },
  { id: 'price1', label: '💰 $' },
  { id: 'price2', label: '💰 $$' },
  { id: 'price3', label: '💰 $$$' },
];

const LAGOS_AREAS = [
  'All Areas',
  'Victoria Island',
  'Lekki',
  'Ikoyi',
  'Ikeja',
  'Surulere',
  'Yaba',
  'Gbagada',
  'Maryland',
  'Festac',
];

const ABUJA_AREAS = [
  'All Areas',
  'Gwarimpa',
  'Maitama',
  'Wuse',
  'Garki',
  'Asokoro',
  'Jabi',
  'Kubwa',
  'Central Area',
];

function VendorListItem({ vendor, onPress, colors, isFavorited, onToggleFavorite }: { vendor: Vendor; onPress: () => void; colors: any; isFavorited?: boolean; onToggleFavorite?: () => void }) {
  const { isAuthenticated } = useAuthStore();

  return (
    <TouchableOpacity 
      style={[styles.vendorItem, { backgroundColor: colors.card }]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.vendorImageWrapper}>
        {vendor.logo || vendor.coverImage ? (
          <Image 
            source={{ 
              uri: vendor.logo?.startsWith('http') 
                ? vendor.logo 
                : vendor.logo 
                  ? `${config.apiUrl}${vendor.logo}`
                  : vendor.coverImage 
            }} 
            style={styles.vendorItemImage} 
          />
        ) : (
          <View style={[styles.vendorItemPlaceholder, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.vendorItemPlaceholderText, { color: colors.textMuted }]}>
              {vendor.businessName.charAt(0)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.vendorItemContent}>
        <View style={styles.vendorNameRow}>
          <Text style={[styles.vendorItemName, { color: colors.text }]} numberOfLines={1}>
            {vendor.businessName}
          </Text>
          {(vendor.subscriptionTier === 'pro' || vendor.subscriptionTier === 'elite' || vendor.subscriptionTier === 'premium') && (
            <View style={styles.verifiedDot}>
              <Text style={styles.verifiedDotTxt}>✓</Text>
            </View>
          )}
        </View>
        <View style={styles.vendorItemMeta}>
          {vendor.averageRating && (
            <>
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.vendorItemRating, { color: colors.text }]}>
                {vendor.averageRating.toFixed(1)}
              </Text>
              <Text style={[styles.vendorItemReviews, { color: colors.textSecondary }]}>
                ({vendor.totalReviews})
              </Text>
              <Text style={[styles.vendorItemDot, { color: colors.border }]}>•</Text>
            </>
          )}
          <Text style={[styles.vendorItemCuisine, { color: colors.textSecondary }]} numberOfLines={1}>
            {vendor.cuisineTypes?.slice(0, 2).join(', ') || 'Restaurant'}
          </Text>
        </View>
        {vendor.mainBranch && (
          <View style={styles.vendorItemLocation}>
            <MapPin size={12} color={colors.textMuted} />
            <Text style={[styles.vendorItemLocationText, { color: colors.textMuted }]} numberOfLines={1}>
              {vendor.mainBranch.city}
            </Text>
          </View>
        )}
        {vendor.bookWithConfidence && (
          <View style={styles.bwcBadge}>
            <ShieldCheck size={10} color="#c9a84c" />
            <Text style={styles.bwcText}>Book with Confidence</Text>
          </View>
        )}
      </View>
      {isAuthenticated && (
        <TouchableOpacity style={styles.favoriteButton} onPress={onToggleFavorite}>
          <Star size={20} color={isFavorited ? '#F59E0B' : colors.border} fill={isFavorited ? '#F59E0B' : 'none'} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(
    params.cuisine as string || null
  );
  // venueType + businessType come from category navigation on the home screen
  const [activeVenueType,    setActiveVenueType]    = useState<string | null>(params.venueType    as string || null);
  const [activeBusinessType, setActiveBusinessType] = useState<string | null>(params.businessType as string || null);
  const [activeFilter,       setActiveFilter]       = useState<string | null>(params.filter       as string || null);
  const [showFilters, setShowFilters] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('Lagos');
  const [selectedArea, setSelectedArea] = useState<string>('All Areas');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // When params change (e.g. from category tap), update active filters
  useEffect(() => {
    setActiveVenueType(params.venueType    as string || null);
    setActiveBusinessType(params.businessType as string || null);
    setActiveFilter(params.filter       as string || null);
  }, [params.venueType, params.businessType, params.filter]);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getAll(),
    enabled: isAuthenticated,
  });
  const favoriteIds = new Set((favoritesData?.data || []).map((f: any) => f.vendor?.id || f.vendorId));

  const addFav = useMutation({ mutationFn: (id: string) => favoritesApi.add(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }) });
  const removeFav = useMutation({ mutationFn: (id: string) => favoritesApi.remove(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }) });

  const toggleFavorite = (vendorId: string) => {
    if (favoriteIds.has(vendorId)) removeFav.mutate(vendorId);
    else addFav.mutate(vendorId);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    getCurrentLocation().then(setUserLocation);
  }, []);

  const { data: vendorsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['vendors', 'search', debouncedQuery, params.cuisine, selectedFilters, selectedCity, selectedArea, activeVenueType, activeBusinessType, activeFilter, userLocation],
    queryFn: async () => {
      const queryParams: any = { limit: 50 }; // fetch more for map view

      if (debouncedQuery) queryParams.search = debouncedQuery;
      if (params.cuisine) queryParams.cuisineType = params.cuisine;
      if (selectedFilters.includes('rating')) queryParams.minRating = 4.5;
      if (selectedArea && selectedArea !== 'All Areas') queryParams.city = selectedArea;

      // Category-driven filters from home screen
      if (activeVenueType)    queryParams.venueType    = activeVenueType;
      if (activeBusinessType) queryParams.businessType = activeBusinessType;
      if (activeFilter === 'experiences') queryParams.hasExperiences = true;

      if (selectedFilters.includes('price1')) queryParams.priceRange = 'budget';
      else if (selectedFilters.includes('price2')) queryParams.priceRange = 'moderate';
      else if (selectedFilters.includes('price3')) queryParams.priceRange = 'premium';

      // Pass device location when "Near me" is active — backend sorts by distance server-side
      if (selectedFilters.includes('nearby') && userLocation) {
        queryParams.lat      = userLocation.latitude;
        queryParams.lng      = userLocation.longitude;
        queryParams.radiusKm = 10;
        queryParams.sort     = 'distance';
      }

      return vendorsApi.getAll(queryParams);
    },
    enabled: true,
  });

  // Handle API response: { success, data: { items, pagination } }
  const rawVendors = (vendorsData?.data as any)?.items ?? vendorsData?.data;
  const vendors = Array.isArray(rawVendors) ? rawVendors : [];
  const total = (vendorsData?.data as any)?.pagination?.total ?? vendors.length;

  // Build pins for the map view (vendors with lat/lng from main branch)
  const vendorPins = useMemo(() =>
    vendors
      .filter((v: any) => v.mainBranch?.latitude && v.mainBranch?.longitude)
      .map((v: any) => ({
        id: v.id,
        slug: v.slug,
        businessName: v.businessName,
        averageRating: v.averageRating,
        lat: v.mainBranch.latitude,
        lng: v.mainBranch.longitude,
      })),
    [vendors]
  );

  const handleRequestLocation = async () => {
    clearLocationCache();
    const loc = await getCurrentLocation();
    setUserLocation(loc);
    if (loc && !selectedFilters.includes('nearby')) {
      toggleFilter('nearby');
    }
  };

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
  };

  const navigateToVendor = (slug: string) => {
    router.push(`/venue/${slug}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header 
        onMenuPress={() => setMenuVisible(true)}
      />
      <SlideMenu 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
      />
      
      <View style={styles.searchHeader}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.inputBackground }]}>
          <SearchIcon size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search restaurants, cuisines..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {/* Map / List toggle */}
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: viewMode === 'map' ? colors.primary : colors.surface }]}
          onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
        >
          {viewMode === 'list'
            ? <Map size={20} color={colors.text} />
            : <List size={20} color="#ffffff" />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.surface }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Location Bar */}
      <TouchableOpacity 
        style={[styles.locationBar, { borderBottomColor: colors.border }]} 
        onPress={() => setShowLocationModal(true)}
      >
        <MapPin size={16} color={colors.textSecondary} />
        <Text style={[styles.locationText, { color: colors.text }]}>
          {selectedArea !== 'All Areas' ? `${selectedArea}, ${selectedCity}` : selectedCity}
        </Text>
        <ChevronDown size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Active category chip — shown when navigating from home categories */}
      {(activeVenueType || activeBusinessType || activeFilter) && (
        <View style={[styles.activeCategoryRow, { borderBottomColor: colors.borderLight }]}>
          <View style={[styles.activeCategoryChip, { backgroundColor: colors.tertiaryLight, borderColor: colors.tertiary }]}>
            <Text style={[styles.activeCategoryText, { color: colors.tertiary }]}>
              {activeVenueType
                ? activeVenueType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                : activeBusinessType
                  ? activeBusinessType.charAt(0).toUpperCase() + activeBusinessType.slice(1)
                  : activeFilter === 'experiences' ? 'Experiences' : ''}
            </Text>
            <TouchableOpacity onPress={() => { setActiveVenueType(null); setActiveBusinessType(null); setActiveFilter(null); }}>
              <X size={12} color={colors.tertiary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick Filters */}
      <View style={[styles.filtersContainer, { borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: selectedFilters.includes(item.id) ? colors.primary : colors.inputBackground },
              ]}
              onPress={() => toggleFilter(item.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedFilters.includes(item.id) ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Results Count */}
      {(debouncedQuery || params.cuisine) && (
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {total} {total === 1 ? 'result' : 'results'}
            {debouncedQuery && ` for "${debouncedQuery}"`}
          </Text>
        </View>
      )}

      {/* Map view */}
      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <VendorMapView
            vendors={vendorPins}
            userLocation={userLocation}
            loading={isLoading || isFetching}
            onRequestLocation={handleRequestLocation}
          />
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : vendors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No restaurants found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <FlashList
          data={vendors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VendorListItem vendor={item} onPress={() => navigateToVendor(item.slug)} colors={colors} isFavorited={favoriteIds.has(item.id)} onToggleFavorite={() => toggleFavorite(item.id)} />
          )}
          estimatedItemSize={100}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isFetching ? (
              <ActivityIndicator style={{ padding: 20 }} color={colors.primary} />
            ) : null
          }
        />
      )}

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* City Selection */}
            <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>City</Text>
            <View style={styles.cityButtons}>
              <TouchableOpacity
                style={[
                  styles.cityButton, 
                  { backgroundColor: selectedCity === 'Lagos' ? colors.primary : colors.inputBackground },
                ]}
                onPress={() => {
                  setSelectedCity('Lagos');
                  setSelectedArea('All Areas');
                }}
              >
                <Text style={[
                  styles.cityButtonText, 
                  { color: selectedCity === 'Lagos' ? '#FFFFFF' : colors.textSecondary },
                ]}>
                  Lagos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cityButton, 
                  { backgroundColor: selectedCity === 'Abuja' ? colors.primary : colors.inputBackground },
                ]}
                onPress={() => {
                  setSelectedCity('Abuja');
                  setSelectedArea('All Areas');
                }}
              >
                <Text style={[
                  styles.cityButtonText, 
                  { color: selectedCity === 'Abuja' ? '#FFFFFF' : colors.textSecondary },
                ]}>
                  Abuja
                </Text>
              </TouchableOpacity>
            </View>

            {/* Area Selection */}
            <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>Area</Text>
            <ScrollView style={styles.areaList}>
              {(selectedCity === 'Lagos' ? LAGOS_AREAS : ABUJA_AREAS).map((area) => (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.areaItem, 
                    selectedArea === area && { backgroundColor: colors.primaryLight + '20' }
                  ]}
                  onPress={() => setSelectedArea(area)}
                >
                  <Text style={[
                    styles.areaItemText, 
                    { color: colors.textSecondary },
                    selectedArea === area && { color: colors.primary, fontWeight: '500' }
                  ]}>
                    {area}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.modalApplyButton, { backgroundColor: colors.tertiary }]}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.modalApplyButtonText}>Apply</Text>
            </TouchableOpacity>
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    borderBottomWidth: 1,
  },
  filtersList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    marginRight: 8,
  },
  filterChipActive: {
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  vendorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 16,
  },
  vendorImageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
  },
  vendorItemImage: {
    width: '100%',
    height: '100%',
  },
  vendorItemPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorItemPlaceholderText: {
    fontSize: 24,
    fontWeight: '700',
  },
  vendorItemContent: {
    flex: 1,
    marginLeft: 14,
  },
  vendorItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  vendorItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vendorItemRating: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  vendorItemReviews: {
    fontSize: 13,
    marginLeft: 2,
  },
  vendorItemDot: {
    fontSize: 13,
    marginHorizontal: 6,
  },
  vendorItemCuisine: {
    fontSize: 13,
    flex: 1,
  },
  vendorItemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorItemLocationText: {
    fontSize: 12,
  },
  vendorNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'nowrap',
  },
  verifiedDot: {
    width: 15, height: 15, borderRadius: 8, backgroundColor: '#1d9bf0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  verifiedDotTxt: { color: '#fff', fontSize: 8, fontWeight: '800', lineHeight: 10 },
  tierPill: {
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, flexShrink: 0,
  },
  tierPillTxt: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  bwcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  bwcText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c9a84c',
  },
  favoriteButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
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
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
  },
  activeCategoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  activeCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeCategoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  cityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  cityButtonActive: {
  },
  cityButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  cityButtonTextActive: {
    color: '#FFFFFF',
  },
  areaList: {
    maxHeight: 200,
  },
  areaItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  areaItemText: {
    fontSize: 15,
  },
  modalApplyButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
