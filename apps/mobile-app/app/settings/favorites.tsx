import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, Star, MapPin, Trash2 } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '../../src/lib/api';
import { useTheme } from '../../src/contexts/ThemeContext';

interface FavoriteVendor {
  id: string;
  vendor: {
    id: string;
    businessName: string;
    slug: string;
    description: string;
    cuisineTypes: string[];
    averageRating: number;
    totalReviews: number;
    branches: {
      address: string;
      city: string;
    }[];
  };
  addedAt: string;
}

function FavoriteItem({ 
  item, 
  onRemove 
}: { 
  item: FavoriteVendor; 
  onRemove: (vendorId: string) => void;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const vendor = item.vendor;
  const mainBranch = vendor.branches?.[0];

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/venue/${vendor.slug}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.vendorName, { color: colors.text }]}>{vendor.businessName}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(vendor.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Heart size={20} color={colors.error} fill={colors.error} />
          </TouchableOpacity>
        </View>

        {vendor.cuisineTypes && vendor.cuisineTypes.length > 0 && (
          <Text style={[styles.cuisine, { color: colors.textSecondary }]}>
            {vendor.cuisineTypes.slice(0, 2).join(' • ')}
          </Text>
        )}

        <View style={styles.metaRow}>
          {vendor.averageRating > 0 && (
            <>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={[styles.rating, { color: colors.text }]}>{vendor.averageRating.toFixed(1)}</Text>
              <Text style={[styles.reviews, { color: colors.textSecondary }]}>({vendor.totalReviews})</Text>
            </>
          )}
          {mainBranch && (
            <View style={styles.location}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
                {mainBranch.city}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getAll(),
  });

  const removeFavorite = useMutation({
    mutationFn: (vendorId: string) => favoritesApi.remove(vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to remove favorite');
    },
  });

  const handleRemove = (vendorId: string) => {
    Alert.alert(
      'Remove Favorite',
      'Are you sure you want to remove this restaurant from favorites?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFavorite.mutate(vendorId),
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const favorites = data?.data || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Favorites</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FavoriteItem item={item} onRemove={handleRemove} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Heart size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No favorites yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Restaurants you mark as favorite will appear here
            </Text>
            <TouchableOpacity
              style={[styles.browseButton, { backgroundColor: colors.tertiary }]}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.browseButtonText}>Browse Restaurants</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 12,
  },
  card: {
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  removeButton: {
    marginLeft: 12,
  },
  cuisine: {
    fontSize: 14,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviews: {
    fontSize: 14,
    marginRight: 12,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
