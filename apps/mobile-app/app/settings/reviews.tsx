import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Star, Edit, Trash2 } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../../src/lib/api';
import { format } from 'date-fns';
import { useTheme } from '../../src/contexts/ThemeContext';

interface Review {
  id: string;
  rating: number;
  text?: string;
  vendorResponse?: string;
  createdAt: string;
  vendor: {
    id: string;
    businessName: string;
    slug: string;
  };
  reservation?: {
    id: string;
    date: string;
  };
}

function ReviewItem({ review }: { review: Review }) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/venue/${review.vendor.slug}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.vendorName, { color: colors.text }]}>{review.vendor.businessName}</Text>
        <View style={styles.ratingContainer}>
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              color={colors.warning}
              fill={i < review.rating ? colors.warning : 'transparent'}
            />
          ))}
        </View>
      </View>

      {review.text && (
        <Text style={[styles.reviewText, { color: colors.textSecondary }]} numberOfLines={3}>
          {review.text}
        </Text>
      )}

      {review.vendorResponse && (
        <View style={[styles.responseContainer, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.responseLabel, { color: colors.textMuted }]}>Restaurant's Response:</Text>
          <Text style={[styles.responseText, { color: colors.textSecondary }]}>{review.vendorResponse}</Text>
        </View>
      )}

      <Text style={[styles.date, { color: colors.textMuted }]}>
        {format(new Date(review.createdAt), 'MMM d, yyyy')}
      </Text>
    </TouchableOpacity>
  );
}

export default function MyReviewsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewsApi.getMyReviews(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const reviews = data?.data || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>My Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReviewItem review={item} />}
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
            <Star size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No reviews yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Reviews you write after dining will appear here
            </Text>
            <TouchableOpacity
              style={[styles.browseButton, { backgroundColor: colors.tertiary }]}
              onPress={() => router.push('/(tabs)/bookings')}
            >
              <Text style={styles.browseButtonText}>View Reservations</Text>
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
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  responseContainer: {
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    marginTop: 4,
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
