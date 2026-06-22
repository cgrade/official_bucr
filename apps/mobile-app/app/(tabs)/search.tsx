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
import { Search as SearchIcon, MapPin, Star, X, ChevronDown, Map, List, ShieldCheck, SlidersHorizontal, Check } from 'lucide-react-native';
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

// Single-select sort options. 'distance' needs the device location.
const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'distance',    label: '📍 Near me' },
  { id: 'rating',      label: '⭐ Top rated' },
  { id: 'price_low',   label: '💰 Price: Low → High' },
  { id: 'price_high',  label: '💎 Price: High → Low' },
];

// Launch markets — top 20 cities per country. Filter is by city name.
const CITIES_BY_COUNTRY: Record<string, string[]> = {
  Nigeria: [
    'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano', 'Benin City', 'Kaduna',
    'Enugu', 'Abeokuta', 'Uyo', 'Owerri', 'Warri', 'Jos', 'Ilorin', 'Calabar',
    'Onitsha', 'Asaba', 'Akure', 'Maiduguri', 'Aba',
  ],
  Ghana: [
    'Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Tema', 'Cape Coast', 'Kasoa',
    'Ho', 'Koforidua', 'Sunyani', 'Sekondi', 'Obuasi', 'Madina', 'Ashaiman',
    'Techiman', 'Wa', 'Bolgatanga', 'Tarkwa', 'Nungua', 'Teshie',
  ],
  Kenya: [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi',
    'Kitale', 'Nyeri', 'Machakos', 'Meru', 'Naivasha', 'Kericho', 'Kakamega',
    'Kisii', 'Diani', 'Nanyuki', 'Embu', 'Garissa', 'Lamu',
  ],
};
const COUNTRIES = Object.keys(CITIES_BY_COUNTRY);

// Fallback city list (used only until the locations endpoint returns real data).
const FALLBACK_CITIES: Record<string, Array<{ city: string; count: number }>> =
  Object.fromEntries(
    Object.entries(CITIES_BY_COUNTRY).map(([country, cities]) => [
      country, cities.map((city) => ({ city, count: 0 })),
    ]),
  );

const PRICE_LEVELS = [
  { level: 1, label: '₦',    hint: 'Budget' },
  { level: 2, label: '₦₦',   hint: 'Moderate' },
  { level: 3, label: '₦₦₦',  hint: 'Upscale' },
  { level: 4, label: '₦₦₦₦', hint: 'Fine dining' },
];

const RADIUS_OPTIONS = [5, 10, 25, 50]; // km, for the "Near me" sort

const CUISINES = [
  'Nigerian', 'African', 'Continental', 'Chinese', 'Italian', 'Lebanese',
  'Indian', 'Seafood', 'Grill & BBQ', 'Fast Food', 'Pastries', 'Vegetarian',
];

interface CityCount { city: string; count: number }
interface CountryGroup { country: string; vendorCount: number; cities: CityCount[] }

const DEFAULT_FILTERS = {
  minRating: false,         // ⭐ 4.5+
  openNow: false,
  onlyExperiences: false,
  priceLevels: [] as number[],
  cuisine: null as string | null,
};

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
  // venueType + businessType come from category navigation on the home screen
  const [activeVenueType,    setActiveVenueType]    = useState<string | null>(params.venueType    as string || null);
  const [activeBusinessType, setActiveBusinessType] = useState<string | null>(params.businessType as string || null);
  const [activeFilter,       setActiveFilter]       = useState<string | null>(params.filter       as string || null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState<string>('recommended');
  const [radiusKm, setRadiusKm] = useState<number>(25); // near-me radius
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('Nigeria');
  const [selectedCity, setSelectedCity] = useState<string>(''); // '' = all cities
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, cuisine: (params.cuisine as string) || null });
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const activeFilterCount =
    (filters.minRating ? 1 : 0) + (filters.openNow ? 1 : 0) +
    (filters.onlyExperiences ? 1 : 0) + (filters.priceLevels.length ? 1 : 0) +
    (filters.cuisine ? 1 : 0);

  // When params change (e.g. from category tap), update active filters
  useEffect(() => {
    setActiveVenueType(params.venueType    as string || null);
    setActiveBusinessType(params.businessType as string || null);
    setActiveFilter(params.filter       as string || null);
    if (params.cuisine) setFilters((f) => ({ ...f, cuisine: params.cuisine as string }));
  }, [params.venueType, params.businessType, params.filter, params.cuisine]);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: favoritesData } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getAll(),
    enabled: isAuthenticated,
  });
  const favoriteIds = new Set((favoritesData?.data || []).map((f: any) => f.vendor?.id || f.vendorId));

  // Drive the location picker from cities that actually have venues.
  const { data: locationsData } = useQuery({
    queryKey: ['vendor-locations'],
    queryFn: () => vendorsApi.getLocations(),
    staleTime: 5 * 60 * 1000,
  });
  const apiCountries: CountryGroup[] = (locationsData?.data as any)?.countries ?? [];
  const countryNames = apiCountries.length ? apiCountries.map((c) => c.country) : COUNTRIES;
  const citiesForCountry = (country: string): CityCount[] => {
    const found = apiCountries.find((c) => c.country === country);
    return found ? found.cities : (FALLBACK_CITIES[country] || []);
  };

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
    queryKey: ['vendors', 'search', debouncedQuery, sortBy, radiusKm, selectedCity, selectedCountry, filters, activeVenueType, activeBusinessType, activeFilter, userLocation],
    queryFn: async () => {
      const queryParams: any = { limit: 50 }; // fetch more for map view

      if (debouncedQuery) queryParams.search = debouncedQuery;

      // Location — a chosen city narrows to that city, otherwise the whole country
      if (selectedCity)         queryParams.city    = selectedCity;
      else if (selectedCountry) queryParams.country = selectedCountry;

      // Filters (from the Filters sheet)
      if (filters.cuisine)         queryParams.cuisineType = filters.cuisine;
      if (filters.minRating)       queryParams.minRating   = 4.5;
      if (filters.openNow)         queryParams.openNow     = true;
      if (filters.priceLevels.length) queryParams.priceLevel = [...filters.priceLevels].sort().join(',');
      if (filters.onlyExperiences || activeFilter === 'experiences') queryParams.hasExperiences = true;

      // Category-driven filters from home screen
      if (activeVenueType)    queryParams.venueType    = activeVenueType;
      if (activeBusinessType) queryParams.businessType = activeBusinessType;

      // Sort — near me needs device location; the rest are server-side orderings
      if (sortBy === 'distance' && userLocation) {
        queryParams.lat      = userLocation.latitude;
        queryParams.lng      = userLocation.longitude;
        queryParams.radiusKm = radiusKm;
        queryParams.sort     = 'distance';
      } else if (sortBy === 'rating' || sortBy === 'price_low' || sortBy === 'price_high') {
        queryParams.sort = sortBy;
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
    if (loc) setSortBy('distance');
  };

  // Selecting "Near me" requests location if we don't have it yet.
  const selectSort = async (id: string) => {
    if (id === 'distance' && !userLocation) {
      const loc = await getCurrentLocation();
      setUserLocation(loc);
      if (!loc) return; // permission denied — don't switch to a sort we can't fulfil
    }
    setSortBy(id);
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
        {/* Filters */}
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: activeFilterCount ? colors.tertiary : colors.surface }]}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.8}
        >
          <SlidersHorizontal size={20} color={activeFilterCount ? colors.primaryDark : colors.text} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primaryDark }]}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        {/* Map / List toggle */}
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: viewMode === 'map' ? colors.primary : colors.surface }]}
          onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
        >
          {viewMode === 'list'
            ? <Map size={20} color={colors.text} />
            : <List size={20} color="#ffffff" />}
        </TouchableOpacity>
      </View>

      {/* Location Bar */}
      <TouchableOpacity
        style={[styles.locationBar, { borderBottomColor: colors.border }]}
        onPress={() => setShowLocationModal(true)}
      >
        <MapPin size={16} color={colors.tertiary} />
        <Text style={[styles.locationText, { color: colors.text }]}>
          {selectedCity ? `${selectedCity}, ${selectedCountry}` : `All cities · ${selectedCountry}`}
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

      {/* Sort row (single-select) */}
      <View style={[styles.filtersContainer, { borderBottomColor: colors.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SORT_OPTIONS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const active = sortBy === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.tertiary : colors.inputBackground,
                    borderWidth: 1,
                    borderColor: active ? colors.tertiary : colors.border,
                  },
                ]}
                onPress={() => selectSort(item.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? colors.primaryDark : colors.textSecondary, fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Radius selector — only meaningful when sorting by proximity */}
      {sortBy === 'distance' && (
        <View style={[styles.radiusRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.radiusLabel, { color: colors.textMuted }]}>Within</Text>
          {RADIUS_OPTIONS.map((km) => {
            const active = radiusKm === km;
            return (
              <TouchableOpacity
                key={km}
                style={[
                  styles.radiusChip,
                  { borderColor: active ? colors.tertiary : colors.border, backgroundColor: active ? colors.tertiaryLight : 'transparent' },
                ]}
                onPress={() => setRadiusKm(km)}
                activeOpacity={0.8}
              >
                <Text style={[styles.radiusChipText, { color: active ? colors.tertiary : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
                  {km} km
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Results Count */}
      {!isLoading && (
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {total} {total === 1 ? 'place' : 'places'}
            {debouncedQuery ? ` for "${debouncedQuery}"` : ''}
            {selectedCity ? ` in ${selectedCity}` : ''}
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

            {/* Country tabs (only countries that actually have venues) */}
            <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>Country</Text>
            <View style={styles.cityButtons}>
              {countryNames.map((country) => {
                const active = selectedCountry === country;
                return (
                  <TouchableOpacity
                    key={country}
                    style={[styles.cityButton, { backgroundColor: active ? colors.tertiary : colors.inputBackground }]}
                    onPress={() => { setSelectedCountry(country); setSelectedCity(''); }}
                  >
                    <Text style={[styles.cityButtonText, { color: active ? colors.primaryDark : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>
                      {country}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* City list — driven by venues present in the selected country */}
            <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>City</Text>
            <ScrollView style={styles.areaList}>
              {[{ city: '', count: 0 }, ...citiesForCountry(selectedCountry)].map((entry) => {
                const active = selectedCity === entry.city;
                const label = entry.city || `All cities in ${selectedCountry}`;
                return (
                  <TouchableOpacity
                    key={entry.city || 'all'}
                    style={[styles.areaItem, active && { backgroundColor: colors.tertiaryLight }]}
                    onPress={() => { setSelectedCity(entry.city); setShowLocationModal(false); }}
                  >
                    <Text style={[styles.areaItemText, { color: active ? colors.tertiary : colors.textSecondary, fontWeight: active ? '600' : '400' }]}>
                      {label}
                    </Text>
                    {entry.city && entry.count > 0 && (
                      <Text style={[styles.areaItemCount, { color: colors.textMuted }]}>{entry.count}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalApplyButton, { backgroundColor: colors.tertiary }]}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.modalApplyButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filters Sheet */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Quick toggles */}
              <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>Quick filters</Text>
              {[
                { key: 'minRating',       label: '⭐  Highly rated (4.5+)' },
                { key: 'openNow',         label: '🕒  Open now' },
                { key: 'onlyExperiences', label: '✨  Has experiences' },
              ].map((row) => {
                const on = (filters as any)[row.key] as boolean;
                return (
                  <TouchableOpacity
                    key={row.key}
                    style={[styles.toggleRow, { borderColor: colors.border }]}
                    onPress={() => setFilters((f) => ({ ...f, [row.key]: !on }))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>{row.label}</Text>
                    <View style={[styles.checkbox, { borderColor: on ? colors.tertiary : colors.border, backgroundColor: on ? colors.tertiary : 'transparent' }]}>
                      {on && <Check size={14} color={colors.primaryDark} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Price level (multi-select) */}
              <Text style={[styles.modalSectionTitle, { color: colors.textSecondary, marginTop: 18 }]}>Price level</Text>
              <View style={styles.priceRow}>
                {PRICE_LEVELS.map((p) => {
                  const on = filters.priceLevels.includes(p.level);
                  return (
                    <TouchableOpacity
                      key={p.level}
                      style={[styles.priceChip, { borderColor: on ? colors.tertiary : colors.border, backgroundColor: on ? colors.tertiaryLight : 'transparent' }]}
                      onPress={() => setFilters((f) => ({
                        ...f,
                        priceLevels: on ? f.priceLevels.filter((l) => l !== p.level) : [...f.priceLevels, p.level],
                      }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.priceChipLabel, { color: on ? colors.tertiary : colors.text }]}>{p.label}</Text>
                      <Text style={[styles.priceChipHint, { color: colors.textMuted }]}>{p.hint}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cuisine (single-select) */}
              <Text style={[styles.modalSectionTitle, { color: colors.textSecondary, marginTop: 18 }]}>Cuisine</Text>
              <View style={styles.cuisineWrap}>
                {CUISINES.map((c) => {
                  const on = filters.cuisine === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.cuisineChip, { borderColor: on ? colors.tertiary : colors.border, backgroundColor: on ? colors.tertiaryLight : 'transparent' }]}
                      onPress={() => setFilters((f) => ({ ...f, cuisine: on ? null : c }))}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.cuisineChipText, { color: on ? colors.tertiary : colors.textSecondary, fontWeight: on ? '700' : '500' }]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[styles.clearButton, { borderColor: colors.border }]}
                onPress={() => setFilters({ ...DEFAULT_FILTERS })}
                activeOpacity={0.8}
              >
                <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalApplyButton, { backgroundColor: colors.tertiary, flex: 1, marginTop: 0 }]}
                onPress={() => setShowFilters(false)}
                activeOpacity={0.9}
              >
                <Text style={styles.modalApplyButtonText}>
                  Show {total} {total === 1 ? 'place' : 'places'}
                </Text>
              </TouchableOpacity>
            </View>
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
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#c9a84c',
    fontSize: 10,
    fontWeight: '800',
  },
  // Radius selector
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  radiusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  radiusChipText: {
    fontSize: 12.5,
  },
  // Filters sheet
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  priceChip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  priceChipLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  priceChipHint: {
    fontSize: 10,
  },
  cuisineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  cuisineChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  cuisineChipText: {
    fontSize: 13,
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
  },
  clearButton: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  areaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  areaItemText: {
    fontSize: 15,
  },
  areaItemCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  areaList: {
    maxHeight: 280,
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
