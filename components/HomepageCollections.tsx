import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { HomepageCollection } from '@/types/collection';
import OptimizedImage from './OptimizedImage';
import { SkeletonLoader } from './SkeletonLoader';
import { router } from 'expo-router';
import { COLORS } from '@/constants/colors';

const { width } = Dimensions.get('window');
const COLLECTION_WIDTH = width - 32;
const COLLECTION_HEIGHT = 200;

interface CollectionCardProps {
  collection: HomepageCollection;
  onPress: (collection: HomepageCollection) => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ collection, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.collectionCard}
      onPress={() => onPress(collection)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <OptimizedImage
          source={{ uri: collection.cover_image_url || 'https://images.unsplash.com/photo-1489599162163-3fb4b4b5b0b3?w=800&h=400&fit=crop' }}
          style={styles.collectionImage}
          contentFit="cover"
        />
        <View style={styles.overlay} />
        <View style={styles.collectionContent}>
          <View style={styles.collectionHeader}>
            <Text style={styles.collectionTitle} numberOfLines={2}>
              {collection.title}
            </Text>
            <ChevronRight size={20} color="#fff" />
          </View>
          {collection.description && (
            <Text style={styles.collectionDescription} numberOfLines={2}>
              {collection.description}
            </Text>
          )}
          <Text style={styles.dramaCount}>
            {collection.drama_count} {collection.drama_count === 1 ? 'drama' : 'dramas'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const HomepageCollections: React.FC = () => {
  const collectionsQuery = trpc.collections.getHomepage.useQuery();

  const handleCollectionPress = (collection: HomepageCollection) => {
    router.push(`/collection/${collection.id}`);
  };

  if (collectionsQuery.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <SkeletonLoader width={200} height={24} />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[1, 2, 3].map((index) => (
            <View key={index} style={styles.skeletonCard}>
              <SkeletonLoader width={COLLECTION_WIDTH} height={COLLECTION_HEIGHT} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (collectionsQuery.error || !collectionsQuery.data?.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>🎬 Coleções Especiais</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {collectionsQuery.data.map((collection: HomepageCollection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onPress={handleCollectionPress}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  collectionCard: {
    width: COLLECTION_WIDTH,
    height: COLLECTION_HEIGHT,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  collectionImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  collectionContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  collectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  collectionDescription: {
    fontSize: 14,
    color: '#e0e0e0',
    marginBottom: 8,
    lineHeight: 20,
  },
  dramaCount: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '500' as const,
  },
  skeletonCard: {
    width: COLLECTION_WIDTH,
    height: COLLECTION_HEIGHT,
    marginRight: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
});