import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { CustomCollectionDrama } from '@/types/collection';
import DramaCard from '@/components/DramaCard';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import OptimizedImage from '@/components/OptimizedImage';
import { COLORS } from '@/constants/colors';

export default function CollectionPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const collectionQuery = trpc.collections.getById.useQuery(
    { collectionId: id! },
    { enabled: !!id }
  );

  const dramasQuery = trpc.collections.getDramas.useQuery(
    { collectionId: id! },
    { enabled: !!id }
  );

  if (collectionQuery.isLoading || dramasQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <SkeletonLoader width={300} height={24} style={styles.titleSkeleton} />
            <SkeletonLoader width={200} height={16} style={styles.descriptionSkeleton} />
          </View>
          <View style={styles.dramasGrid}>
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <View key={index} style={styles.dramaCardContainer}>
                <SkeletonLoader width={150} height={220} />
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (collectionQuery.error || dramasQuery.error || !collectionQuery.data) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load collection</Text>
        </View>
      </SafeAreaView>
    );
  }

  const collection = collectionQuery.data;
  const dramas = dramasQuery.data || [];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: collection.title }} />
      <ScrollView contentContainerStyle={styles.content}>
        {collection.cover_image_url && (
          <View style={styles.coverContainer}>
            <OptimizedImage
              source={{ uri: collection.cover_image_url }}
              style={styles.coverImage}
              contentFit="cover"
            />
            <View style={styles.coverOverlay} />
          </View>
        )}
        
        <View style={styles.header}>
          <Text style={styles.title}>{collection.title}</Text>
          {collection.description && (
            <Text style={styles.description}>{collection.description}</Text>
          )}
          <Text style={styles.dramaCount}>
            {dramas.length} {dramas.length === 1 ? 'drama' : 'dramas'}
          </Text>
        </View>

        {dramas.length > 0 ? (
          <View style={styles.dramasGrid}>
            {dramas.map((drama: CustomCollectionDrama) => (
              <View key={drama.drama_id} style={styles.dramaCardContainer}>
                <DramaCard
                  drama={{
                    id: drama.drama_id,
                    name: drama.drama_title,
                    original_name: drama.drama_title,
                    poster_path: drama.drama_poster_url,
                    first_air_date: drama.drama_year?.toString() || '',
                    vote_average: 0,
                    vote_count: 0,
                    popularity: 0,
                    genre_ids: [],
                    origin_country: [],
                    backdrop_path: null,
                    overview: '',
                  }}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No dramas in this collection yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 20,
  },
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 12,
  },
  dramaCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  dramasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  dramaCardContainer: {
    width: '48%',
    marginBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error || '#ff4444',
    textAlign: 'center',
  },
  titleSkeleton: {
    marginBottom: 8,
  },
  descriptionSkeleton: {
    marginBottom: 12,
  },
});