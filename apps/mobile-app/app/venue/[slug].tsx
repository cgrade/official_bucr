import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  StatusBar,
  Alert,
  Share,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  ChevronRight,
  BadgeCheck,
  Award,
  Share2,
  Navigation,
  Users,
  ShieldCheck,
  CalendarClock,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi, favoritesApi, waitlistApi } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth.store';
import { useAuth } from '../../src/providers/AuthProvider';
import { useTheme } from '../../src/contexts/ThemeContext';
import { config, getReservationDeposit } from '../../src/lib/config';
import { formatMoney } from '../../src/lib/currency';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = width * 0.7;

const TABS = ['Overview', 'Menu', 'Reviews', 'Photos'];

export default function VenueDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated } = useAuthStore();
  const { requireAuth } = useAuth();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const galleryRef = useRef<FlatList>(null);
  const photoViewerRef = useRef<FlatList>(null);
  const queryClient = useQueryClient();

  const onGalleryScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentImageIndex) {
      setCurrentImageIndex(slideIndex);
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor', slug],
    queryFn: () => vendorsApi.getBySlug(slug!),
    enabled: !!slug,
  });

  // Check if vendor is favorited
  useEffect(() => {
    if (data?.data?.id && isAuthenticated) {
      // For now, we'll just check if it's in the favorites list
      favoritesApi.getAll().then((response) => {
        const favorites = response?.data || [];
        const isFav = favorites.some((fav: any) => fav.vendor?.id === data?.data?.id);
        setIsFavorite(isFav);
      }).catch(() => {
        setIsFavorite(false);
      });
    }
  }, [data?.data?.id, isAuthenticated]);

  // Add favorite mutation
  const addFavorite = useMutation({
    mutationFn: (vendorId: string) => favoritesApi.add(vendorId),
    onSuccess: () => {
      setIsFavorite(true);
      queryClient.invalidateQueries({ queryKey: ['favorite', data?.data?.id] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Remove favorite mutation
  const removeFavorite = useMutation({
    mutationFn: (vendorId: string) => favoritesApi.remove(vendorId),
    onSuccess: () => {
      setIsFavorite(false);
      queryClient.invalidateQueries({ queryKey: ['favorite', data?.data?.id] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const toggleFavorite = () => {
    if (!isAuthenticated) {
      // Navigate to auth screen
      router.push('/(auth)/login');
      return;
    }

    const vendorId = data?.data?.id;
    if (!vendorId) return;

    if (isFavorite) {
      removeFavorite.mutate(vendorId);
    } else {
      addFavorite.mutate(vendorId);
    }
  };

  const vendor = data?.data;
  const bookWithConfidence = vendor?.bookWithConfidence ?? false;
  const reliabilityScore   = vendor?.reliabilityScore  ?? null;

  // Waitlist
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistPartySize, setWaitlistPartySize] = useState(2);

  const joinWaitlistMutation = useMutation({
    mutationFn: (partySize: number) => waitlistApi.join({
      vendorId: vendor?.id ?? '',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      time: '19:00',
      partySize,
    }),
    onSuccess: () => {
      setShowWaitlistModal(false);
      Alert.alert('Added to Waitlist', "We'll notify you when a table becomes available.");
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Could not join waitlist');
    },
  });

  const handleReserve = () => {
    requireAuth(() => {
      router.push(`/venue/${slug}/book`);
    });
  };

  const handleJoinWaitlist = () => {
    requireAuth(() => setShowWaitlistModal(true));
  };

  const handleViewReviews = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    setActiveTab('Reviews');
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !vendor) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Restaurant not found</Text>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const mainBranch = vendor.branches?.[0];
  const hasCoords = mainBranch?.latitude != null && mainBranch?.longitude != null;

  // Static Mapbox map preview (dark style + gold pin) — lightweight, no native
  // map module needed on the detail page; tapping it opens turn-by-turn directions.
  const staticMapUrl = hasCoords && config.mapboxPublicToken
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+c9a84c(${mainBranch.longitude},${mainBranch.latitude})/${mainBranch.longitude},${mainBranch.latitude},14.5,0/640x320@2x?access_token=${config.mapboxPublicToken}`
    : null;

  // Share the venue via the native share sheet.
  const handleShare = async () => {
    try {
      const where = mainBranch?.address ? `${mainBranch.address}, ${mainBranch.city}` : 'Abuja';
      const link = `https://bucr.ng/venue/${slug}`;
      await Share.share({
        title: vendor.businessName,
        message: `Check out ${vendor.businessName} on Bucr — ${where}.\nReserve your table: ${link}`,
      });
    } catch {
      // user dismissed — no-op
    }
  };

  // Open turn-by-turn directions in the device's maps app (Apple Maps on iOS,
  // Google Maps on Android), falling back to the universal Google Maps URL.
  const openDirections = () => {
    if (!mainBranch) return;
    const { latitude, longitude, address, city } = mainBranch;
    const universal = hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, ${city}`)}`;
    const native = hasCoords
      ? Platform.select({
          ios: `maps://?daddr=${latitude},${longitude}`,
          android: `google.navigation:q=${latitude},${longitude}`,
          default: universal,
        })!
      : universal;
    Linking.openURL(native).catch(() => Linking.openURL(universal).catch(() => {}));
  };

  // Helper to get full image URL
  const getImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    // Handle URLs that already have a leading slash
    if (url.startsWith('/')) return `${config.apiUrl}${url}`;
    return `${config.apiUrl}/${url}`;
  };
  
  // Build hero images - use gallery first, then coverImage, then logo
  let heroImages: { url: string | undefined; caption?: string }[] = [];
  
  // Check gallery first
  if (vendor.gallery && Array.isArray(vendor.gallery) && vendor.gallery.length > 0) {
    heroImages = vendor.gallery.map((img: any) => ({
      ...img,
      url: getImageUrl(img.url),
    }));
  }
  
  // If no gallery images, try coverImage
  if (heroImages.length === 0 && vendor.coverImage) {
    const coverUrl = getImageUrl(vendor.coverImage);
    if (coverUrl) {
      heroImages = [{ url: coverUrl }];
    }
  }
  
  // If still no images, try logo
  if (heroImages.length === 0 && vendor.logo) {
    const logoUrl = getImageUrl(vendor.logo);
    if (logoUrl) {
      heroImages = [{ url: logoUrl }];
    }
  }
  
  const galleryImages = (vendor.gallery || []).map((img: any) => ({
    ...img,
    url: getImageUrl(img.url),
  }));
  const achievements = vendor.achievements || [];
  const menuCategories = (vendor.menu || []).filter((cat: any) => cat && cat.name);
  const experiences = vendor.experiences || [];
  const specialOffers = vendor.specialOffers || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Swipeable Gallery */}
        <View style={styles.heroContainer}>
          {heroImages.length > 0 && heroImages[0]?.url ? (
            <FlatList
              ref={galleryRef}
              data={heroImages.filter(img => img.url)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onGalleryScroll}
              scrollEventThrottle={16}
              keyExtractor={(item, index) => `hero-${index}`}
              renderItem={({ item }) => (
                <Image source={{ uri: item.url }} style={styles.heroImage} />
              )}
            />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: colors.cardElevated }]}>
              <Text style={[styles.heroPlaceholderText, { color: colors.textMuted }]}>{vendor.businessName.charAt(0)}</Text>
            </View>
          )}
          
          {/* Header Buttons */}
          <SafeAreaView style={styles.headerButtons}>
            <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface }]} onPress={toggleFavorite}>
                <Heart 
                  size={22} 
                  color={isFavorite ? colors.error : colors.text} 
                  fill={isFavorite ? colors.error : "none"}
                />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.surface }]} onPress={handleShare}>
                <Share2 size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Image Counter */}
          {heroImages.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>{currentImageIndex + 1}/{heroImages.length}</Text>
            </View>
          )}

          {/* Page Indicators */}
          {heroImages.length > 1 && (
            <View style={styles.pageIndicators}>
              {heroImages.map((_: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.pageIndicator,
                    index === currentImageIndex && styles.pageIndicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Vendor Info */}
        <View style={styles.infoSection}>
          {/* Name + verified tick row */}
          <View style={styles.nameRow}>
            <Text style={[styles.vendorName, { color: colors.text }]} numberOfLines={1}>
              {vendor.businessName}
            </Text>
            {(vendor.subscriptionTier === 'pro' || vendor.subscriptionTier === 'elite' || vendor.subscriptionTier === 'premium') && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedTick}>✓</Text>
              </View>
            )}
            {/* No tier label shown to guests — blue tick already signals premium */}
          </View>

          <View style={styles.metaRow}>
            {vendor.averageRating && (
              <>
                <Star size={16} color="#F59E0B" fill="#F59E0B" />
                <Text style={[styles.rating, { color: colors.text }]}>{vendor.averageRating.toFixed(1)}</Text>
                <Text style={[styles.reviews, { color: colors.textSecondary }]}>({vendor.totalReviews} reviews)</Text>
                <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
              </>
            )}
            <Text style={[styles.cuisine, { color: colors.textSecondary }]}>
              {vendor.cuisineTypes?.slice(0, 2).join(' • ') || 'Restaurant'}
            </Text>
          </View>

          {/* Reliability & Confidence */}
          {(bookWithConfidence || reliabilityScore != null) && (
            <View style={[styles.bwcRow, { backgroundColor: colors.tertiaryLight, borderColor: colors.tertiary + '40' }]}>
              <ShieldCheck size={15} color={colors.tertiary} />
              <Text style={[styles.bwcRowText, { color: colors.tertiary }]}>
                {bookWithConfidence ? 'Book With Confidence' : 'Reliability Score'}
                {reliabilityScore != null
                  ? ` · ${(reliabilityScore * 100).toFixed(0)}% check-in rate`
                  : ''}
              </Text>
            </View>
          )}

          {/* Achievements */}
          {achievements.length > 0 && (
            <View style={styles.badges}>
              {achievements.slice(0, 3).map((achievement: any, index: number) => (
                <View key={index} style={[styles.badge, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight, borderWidth: 1 }]}>
                  <Text style={styles.badgeIcon}>{achievement.icon || '✓'}</Text>
                  <Text style={[styles.badgeText, { color: colors.text }]}>{achievement.title}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            {mainBranch && (
              <TouchableOpacity style={styles.quickInfoItem} onPress={openDirections}>
                <MapPin size={18} color={colors.textMuted} />
                <Text style={[styles.quickInfoText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {mainBranch.address}, {mainBranch.city}
                </Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {mainBranch?.operatingHours && (
              <View style={styles.quickInfoItem}>
                <Clock size={18} color={colors.textMuted} />
                <Text style={[styles.quickInfoText, { color: colors.textSecondary }]}>
                  {typeof mainBranch.operatingHours === 'object' && mainBranch.operatingHours !== null
                    ? `Open until ${(mainBranch.operatingHours as any).close || '11:00 PM'}`
                    : 'Hours available on request'}
                </Text>
              </View>
            )}
            {vendor.phone && (
              <TouchableOpacity style={styles.quickInfoItem}>
                <Phone size={18} color={colors.textMuted} />
                <Text style={[styles.quickInfoText, { color: colors.textSecondary }]}>{vendor.phone}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
                onPress={() => {
                  if (tab === 'Reviews' && !isAuthenticated) {
                    router.push('/(auth)/login');
                  } else {
                    setActiveTab(tab);
                  }
                }}
              >
                <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && { color: colors.tertiary }]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'Overview' && (
            <>
              {/* About */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {vendor.description || 'No description available.'}
                </Text>
                
                {/* Additional Info */}
                {vendor.specialties && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Specialties:</Text>
                    <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{vendor.specialties}</Text>
                  </View>
                )}
                {vendor.ambiance && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Ambiance:</Text>
                    <Text style={[styles.infoValue, { color: colors.textSecondary }]}>{vendor.ambiance}</Text>
                  </View>
                )}
              </View>

              {/* Location */}
              {mainBranch && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
                  {staticMapUrl && (
                    <TouchableOpacity activeOpacity={0.9} onPress={openDirections} style={styles.mapCard}>
                      <Image source={{ uri: staticMapUrl }} style={styles.mapImage} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.addressRow}>
                    <MapPin size={18} color={colors.tertiary} />
                    <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                      {mainBranch.address}, {mainBranch.city}{mainBranch.state ? `, ${mainBranch.state}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.directionsButton, { backgroundColor: colors.tertiary }]}
                    onPress={openDirections}
                    activeOpacity={0.85}
                  >
                    <Navigation size={18} color={colors.primaryDark} />
                    <Text style={[styles.directionsButtonText, { color: colors.primaryDark }]}>Get Directions</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Special Offers - Full Width */}
              {specialOffers && specialOffers.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Special Offers</Text>
                  <View style={styles.fullWidthList}>
                    {specialOffers.map((offer: any) => (
                      <TouchableOpacity 
                        key={offer.id} 
                        style={styles.fullWidthCard}
                        onPress={() => router.push(`/venue/${slug}/book?type=offer&offerId=${offer.id}`)}
                        activeOpacity={0.7}
                      >
                        {offer.image && (
                          <Image 
                            source={{ uri: getImageUrl(offer.image) }} 
                            style={styles.fullWidthImage} 
                          />
                        )}
                        <View style={styles.fullWidthContent}>
                          <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{offer.title}</Text>
                            {offer.discountType && offer.discountValue && (
                              <View style={[styles.discountBadge, { backgroundColor: colors.successLight }]}>
                                <Text style={[styles.discountBadgeText, { color: colors.success }]}>
                                  {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` :
                                   offer.discountType === 'fixed' ? `₦${offer.discountValue} OFF` :
                                   offer.discountType === 'bogo' ? 'BOGO' : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                          {offer.description && (
                            <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>{offer.description}</Text>
                          )}
                          <View style={styles.cardDetails}>
                            {offer.validFrom && offer.validUntil && (
                              <View style={styles.detailItem}>
                                <Clock size={14} color={colors.textMuted} />
                                <Text style={[styles.detailText, { color: colors.textMuted }]}>
                                  {new Date(offer.validFrom).toLocaleDateString()} - {new Date(offer.validUntil).toLocaleDateString()}
                                </Text>
                              </View>
                            )}
                            {offer.terms && (
                              <Text style={[styles.cardTerms, { color: colors.textMuted }]}>{offer.terms}</Text>
                            )}
                          </View>
                          <TouchableOpacity 
                            style={[styles.bookButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push(`/venue/${slug}/book?type=offer&offerId=${offer.id}`)}
                          >
                            <Text style={styles.bookButtonText}>Book Now</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Experiences - Full Width */}
              {experiences && experiences.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Experiences</Text>
                  <View style={styles.fullWidthList}>
                    {experiences.map((experience: any) => (
                      <TouchableOpacity 
                        key={experience.id} 
                        style={styles.fullWidthCard}
                        onPress={() => router.push(`/venue/${slug}/book?type=experience&experienceId=${experience.id}`)}
                        activeOpacity={0.7}
                      >
                        {experience.images && experience.images.length > 0 && (
                          <Image 
                            source={{ uri: getImageUrl(experience.images[0]) }} 
                            style={styles.fullWidthImage} 
                          />
                        )}
                        <View style={styles.fullWidthContent}>
                          <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{experience.title}</Text>
                            <View style={[styles.creditsBadge, { backgroundColor: colors.infoLight }]}>
                              <Text style={[styles.creditsBadgeText, { color: colors.info }]}>{experience.creditsRequired} credits</Text>
                            </View>
                          </View>
                          {experience.description && (
                            <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>{experience.description}</Text>
                          )}
                          <View style={styles.cardDetails}>
                            <View style={styles.detailRow}>
                              {experience.capacity && (
                                <View style={styles.detailItem}>
                                  <Users size={14} color={colors.textMuted} />
                                  <Text style={[styles.detailText, { color: colors.textMuted }]}>Up to {experience.capacity} people</Text>
                                </View>
                              )}
                              {experience.duration && (
                                <View style={styles.detailItem}>
                                  <Clock size={14} color={colors.textMuted} />
                                  <Text style={[styles.detailText, { color: colors.textMuted }]}>{experience.duration} mins</Text>
                                </View>
                              )}
                            </View>
                            {experience.type && (
                              <View style={[styles.typeBadge, { backgroundColor: colors.inputBackground }]}>
                                <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>{experience.type}</Text>
                              </View>
                            )}
                          </View>
                          <TouchableOpacity 
                            style={[styles.bookButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push(`/venue/${slug}/book?type=experience&experienceId=${experience.id}`)}
                          >
                            <Text style={styles.bookButtonText}>Book Experience</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Popular Dishes — prefer flagged popular/featured, else first few items */}
              {(() => {
                const allItems = menuCategories.flatMap((cat: any) => cat.items || []);
                const flagged = allItems.filter((item: any) => item.isPopular || item.isFeatured);
                const dishes = (flagged.length > 0 ? flagged : allItems).slice(0, 6);
                if (dishes.length === 0) return null;
                return (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Dishes</Text>
                    <View style={styles.popularDishes}>
                      {dishes.map((dish: any) => (
                        <View key={dish.id} style={[styles.popularDishCard, { backgroundColor: colors.card }]}>
                          {dish.image && (
                            <Image source={{ uri: getImageUrl(dish.image) }} style={styles.popularDishImage} resizeMode="cover" />
                          )}
                          <View style={styles.popularDishBody}>
                            <Text style={[styles.popularDishName, { color: colors.text }]} numberOfLines={1}>{dish.name}</Text>
                            {dish.description && (
                              <Text style={[styles.popularDishDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                                {dish.description}
                              </Text>
                            )}
                            {dish.price != null && (
                              <Text style={[styles.popularDishPrice, { color: colors.tertiary }]}>
                                ₦{(dish.price / 100).toLocaleString()}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {/* Reservation Deposit — flat per reservation (party size does not change it) */}
              {(() => {
                const deposit = getReservationDeposit((vendor as any).venueType, (vendor as any).customDepositCredits);
                return (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Reservation Deposit</Text>
                    <View style={[styles.depositCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <View>
                        <Text style={[styles.depositAmount, { color: colors.text }]}>{formatMoney(deposit * 10)}</Text>
                        <Text style={[styles.depositSub, { color: colors.textMuted }]}>{deposit.toLocaleString()} credits · flat, any party size</Text>
                      </View>
                    </View>
                    <Text style={[styles.creditNote, { color: colors.tertiary }]}>
                      ✓ Fully refunded + 3% bonus when you check in
                    </Text>
                  </View>
                );
              })()}
            </>
          )}

          {activeTab === 'Menu' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Menu</Text>
              <Text style={[styles.menuNote, { color: colors.textSecondary }]}>
                Prices shown for takeout items only. Dine-in prices vary.
              </Text>
              
              {/* Menu Categories - only show categories with items */}
              {menuCategories && menuCategories.filter((cat: any) => cat.items && cat.items.length > 0).length > 0 ? (
                <View style={styles.menuContainer}>
                  {menuCategories.filter((category: any) => category.items && category.items.length > 0).map((category: any) => (
                    <View key={category.id} style={styles.menuCategory}>
                      <Text style={[styles.menuCategoryName, { color: colors.text, borderBottomColor: colors.border }]}>{String(category.name || '')}</Text>
                      {(category.items || []).filter((i: any) => i && i.name).map((item: any) => (
                        <View key={item.id} style={styles.menuItem}>
                          <View style={styles.menuItemRow}>
                            {item.image ? (
                              <Image 
                                source={{ uri: item.image.startsWith('http') ? item.image : `${config.apiUrl}${item.image}` }} 
                                style={styles.menuItemImage} 
                              />
                            ) : null}
                            <View style={styles.menuItemContent}>
                              <View style={styles.menuItemHeader}>
                                <Text style={[styles.menuItemName, { color: colors.text }]}>{String(item.name || '')}</Text>
                                {item.availableForTakeout && item.price ? (
                                  <Text style={[styles.menuItemPrice, { color: colors.tertiary }]}>₦{Number(item.price || 0).toLocaleString()}</Text>
                                ) : null}
                              </View>
                              {item.description ? (
                                <Text style={[styles.menuItemDescription, { color: colors.textSecondary }]}>{String(item.description || '')}</Text>
                              ) : null}
                              <View style={styles.menuItemTags}>
                                {item.availableForDineIn ? (
                                  <Text style={[styles.menuTag, { color: colors.textMuted }]}>Dine-in</Text>
                                ) : null}
                                {item.availableForTakeout ? (
                                  <Text style={[styles.menuTag, { color: colors.textMuted }]}>Takeout</Text>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>Menu coming soon</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Check back later for our delicious offerings</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'Reviews' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews</Text>
              {!isAuthenticated ? (
                <View style={styles.authPrompt}>
                  <Text style={[styles.authPromptText, { color: colors.textSecondary }]}>Sign in to see reviews</Text>
                  <TouchableOpacity
                    style={[styles.authPromptButton, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/(auth)/login')}
                  >
                    <Text style={styles.authPromptButtonText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              ) : vendor.reviews?.length > 0 ? (
                vendor.reviews.map((review: any) => {
                  const avatarUri = review.user?.avatar
                    ? review.user.avatar.startsWith('http')
                      ? review.user.avatar
                      : `${process.env.EXPO_PUBLIC_API_URL || ''}${review.user.avatar}`
                    : null;
                  const initials = (review.user?.name || 'G').charAt(0).toUpperCase();
                  return (
                    <View key={review.id} style={[styles.reviewItem, { borderBottomColor: colors.borderLight }]}>
                      <View style={styles.reviewHeader}>
                        {/* Reviewer avatar */}
                        {avatarUri
                          ? <Image source={{ uri: avatarUri }} style={styles.reviewerAvatar} />
                          : (
                            <View style={[styles.reviewerAvatarFallback, { backgroundColor: colors.primary }]}>
                              <Text style={[styles.reviewerAvatarInitial, { color: colors.textOnPrimary }]}>{initials}</Text>
                            </View>
                          )}
                        <View style={styles.reviewerInfo}>
                          <Text style={[styles.reviewerName, { color: colors.text }]}>{review.user?.name || 'Guest'}</Text>
                          <View style={styles.reviewRating}>
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} size={11} color="#F59E0B" fill={i <= review.rating ? '#F59E0B' : 'none'} />
                            ))}
                            <Text style={[styles.reviewRatingText, { color: colors.textMuted }]}>
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }) : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {review.text && (
                        <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{review.text}</Text>
                      )}
                      {review.vendorResponse && (
                        <View style={[styles.vendorReply, { backgroundColor: colors.inputBackground, borderColor: colors.borderLight }]}>
                          <Text style={[styles.vendorReplyLabel, { color: colors.tertiary }]}>Response from {vendor.businessName}</Text>
                          <Text style={[styles.vendorReplyText, { color: colors.textSecondary }]}>{review.vendorResponse}</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No reviews yet</Text>
              )}
            </View>
          )}

          {activeTab === 'Photos' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos</Text>
              {galleryImages.length > 0 ? (
                <View style={styles.photoGrid}>
                  {galleryImages.map((image: any, index: number) => (
                    <TouchableOpacity 
                      key={index} 
                      onPress={() => {
                        setSelectedPhotoIndex(index);
                        setPhotoViewerVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: image.url }} style={styles.gridPhoto} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No photos available</Text>
              )}
            </View>
          )}
        </View>

        {/* Bottom spacing for CTA */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Photo Viewer Modal */}
      <Modal
        visible={photoViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPhotoViewerVisible(false)}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.photoViewerContainer}>
          {/* Close button */}
          <TouchableOpacity 
            style={styles.photoViewerClose}
            onPress={() => setPhotoViewerVisible(false)}
          >
            <Text style={styles.photoViewerCloseText}>✕</Text>
          </TouchableOpacity>
          
          {/* Photo counter */}
          <View style={styles.photoViewerCounter}>
            <Text style={styles.photoViewerCounterText}>
              {selectedPhotoIndex + 1} / {galleryImages.length}
            </Text>
          </View>
          
          {/* Photo gallery */}
          <FlatList
            ref={photoViewerRef}
            data={galleryImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={selectedPhotoIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedPhotoIndex(newIndex);
            }}
            keyExtractor={(_, index) => `photo-viewer-${index}`}
            renderItem={({ item }) => (
              <View style={styles.photoViewerImageContainer}>
                <Image 
                  source={{ uri: item.url }} 
                  style={styles.photoViewerImage}
                  resizeMode="contain"
                />
                {item.caption && (
                  <Text style={styles.photoViewerCaption}>{item.caption}</Text>
                )}
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Book-With-Confidence badge */}
      {bookWithConfidence && (
        <View style={[styles.badgeBar, { backgroundColor: colors.tertiary + '18', borderTopColor: colors.tertiary + '40' }]}>
          <ShieldCheck size={14} color={colors.tertiary} />
          <Text style={[styles.badgeBarText, { color: colors.tertiary }]}>
            Book With Confidence — {reliabilityScore != null ? `${(reliabilityScore * 100).toFixed(0)}%` : '95%+'} reliability
          </Text>
        </View>
      )}

      {/* Reserve CTA */}
      <View style={[styles.ctaContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.ctaInfo}>
          <Text style={[styles.ctaTitle, { color: colors.text }]}>Reserve a Table</Text>
          <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>Deposit refunded when you show up</Text>
        </View>
        <View style={styles.ctaButtons}>
          <TouchableOpacity
            style={[styles.waitlistButton, { borderColor: colors.border }]}
            onPress={handleJoinWaitlist}
          >
            <CalendarClock size={15} color={colors.text} />
            <Text style={[styles.waitlistButtonText, { color: colors.text }]}>Waitlist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctaButton, { backgroundColor: colors.tertiary }]} onPress={handleReserve}>
            <Text style={[styles.ctaButtonText, { color: colors.primaryDark }]}>Reserve Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Waitlist modal */}
      <Modal visible={showWaitlistModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={[styles.waitlistModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.waitlistModalTitle, { color: colors.text }]}>Join Waitlist</Text>
            <Text style={[styles.waitlistModalSubtitle, { color: colors.textSecondary }]}>
              We'll notify you when a table opens up at {vendor?.businessName}.
            </Text>
            <Text style={[styles.waitlistLabel, { color: colors.textSecondary }]}>Party size</Text>
            <View style={styles.partySizeRow}>
              {[1,2,3,4,5,6].map(n => (
                <TouchableOpacity key={n}
                  style={[styles.partySizeChip, { borderColor: waitlistPartySize === n ? colors.tertiary : colors.border,
                    backgroundColor: waitlistPartySize === n ? colors.tertiary + '20' : 'transparent' }]}
                  onPress={() => setWaitlistPartySize(n)}>
                  <Text style={[styles.partySizeChipText, { color: waitlistPartySize === n ? colors.tertiary : colors.textSecondary }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: colors.tertiary, marginTop: 16 }]}
              onPress={() => joinWaitlistMutation.mutate(waitlistPartySize)}
              disabled={joinWaitlistMutation.isPending}>
              <Text style={[styles.ctaButtonText, { color: colors.primaryDark }]}>
                {joinWaitlistMutation.isPending ? 'Joining…' : 'Join Waitlist'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setShowWaitlistModal(false)}>
              <Text style={[styles.waitlistModalSubtitle, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  heroContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: width,
    height: IMAGE_HEIGHT,
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    fontSize: 72,
    fontWeight: '700',
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  infoSection: {
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  vendorName: {
    fontSize: 24,
    fontWeight: '700',
    flexShrink: 1,
  },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1d9bf0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  verifiedTick: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  tierTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  tierTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rating: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviews: {
    fontSize: 14,
    marginLeft: 4,
  },
  dot: {
    fontSize: 14,
    marginHorizontal: 8,
  },
  cuisine: {
    fontSize: 14,
  },
  bwcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  bwcRowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickInfo: {
    gap: 12,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickInfoText: {
    flex: 1,
    fontSize: 14,
  },
  tabsContainer: {
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {},
  tabContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
  },
  mapImage: {
    width: '100%',
    height: 160,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
  directionsButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  creditTiers: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  creditTier: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  creditTierGuests: {
    fontSize: 12,
    marginBottom: 4,
  },
  creditTierAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  creditNote: {
    fontSize: 13,
  },
  menuNote: {
    fontSize: 13,
    marginBottom: 16,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  menuItemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  menuCategory: {
    marginBottom: 20,
  },
  menuCategoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  menuContainer: {
    marginTop: 8,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  menuTag: {
    fontSize: 11,
    backgroundColor: 'rgba(128,128,128,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  // Full Width Card Styles (Offers & Experiences)
  fullWidthList: {
    gap: 16,
  },
  fullWidthCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fullWidthImage: {
    width: '100%',
    height: 180,
  },
  fullWidthContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  cardTerms: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  discountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  creditsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  creditsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  bookButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  popularDishes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  popularDishCard: {
    borderRadius: 12,
    width: '47%',
    overflow: 'hidden',
  },
  popularDishImage: {
    width: '100%',
    height: 96,
  },
  popularDishBody: {
    padding: 12,
  },
  popularDishName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  popularDishDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  popularDishPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  depositCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  depositAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  depositSub: {
    fontSize: 12,
    marginTop: 4,
  },
  authPrompt: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  authPromptText: {
    fontSize: 14,
    marginBottom: 12,
  },
  authPromptButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  authPromptButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reviewItem: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewerAvatar: {
    width: 38, height: 38, borderRadius: 19,
  },
  reviewerAvatarFallback: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewerAvatarInitial: {
    fontSize: 15, fontWeight: '700',
  },
  reviewerInfo: {
    flex: 1, gap: 3,
  },
  reviewerName: {
    fontSize: 14, fontWeight: '600',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewRatingText: {
    fontSize: 11, marginLeft: 4,
  },
  reviewText: {
    fontSize: 14, lineHeight: 20,
  },
  vendorReply: {
    borderRadius: 10, borderWidth: 1, padding: 10, gap: 4,
  },
  vendorReplyLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6,
  },
  vendorReplyText: {
    fontSize: 13, lineHeight: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridPhoto: {
    width: (width - 56) / 3,
    height: (width - 56) / 3,
    borderRadius: 8,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaInfo: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  ctaSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  ctaButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  waitlistButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ctaButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f2547',
  },
  badgeBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  badgeBarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7,15,30,0.75)',
    justifyContent: 'flex-end',
  },
  waitlistModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  waitlistModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  waitlistModalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  waitlistLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partySizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  partySizeChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partySizeChipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  pageIndicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  // Photo Viewer Styles
  photoViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerCloseText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  photoViewerCounter: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  photoViewerCounterText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  photoViewerImageContainer: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerImage: {
    width: width,
    height: width,
  },
  photoViewerCaption: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 8,
  },
});
