import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS } from '@/constants/colors';

const { width: screenWidth } = Dimensions.get('window');

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8, 
  style 
}: SkeletonLoaderProps) {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = () => {
      shimmerAnimation.setValue(0);
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => shimmer());
    };
    shimmer();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0.2, 0.6, 0.9, 0.2],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
      />
    </View>
  );
}

export function FeaturedSkeleton() {
  return (
    <View style={styles.featuredContainer}>
      <View style={styles.featuredSkeletonCard}>
        <SkeletonLoader width="100%" height={400} borderRadius={16} />
        <View style={styles.featuredSkeletonContent}>
          <View style={styles.featuredSkeletonPoster}>
            <SkeletonLoader width={100} height={150} borderRadius={12} />
          </View>
          <View style={styles.featuredSkeletonInfo}>
            <SkeletonLoader width="80%" height={28} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="60%" height={14} style={{ marginBottom: 12 }} />
            <View style={styles.featuredSkeletonMeta}>
              <SkeletonLoader width={60} height={14} style={{ marginRight: 12 }} />
              <SkeletonLoader width={40} height={14} style={{ marginRight: 12 }} />
              <SkeletonLoader width={50} height={14} />
            </View>
            <View style={styles.featuredSkeletonActions}>
              <SkeletonLoader width={120} height={40} borderRadius={12} style={{ marginRight: 12 }} />
              <SkeletonLoader width={80} height={40} borderRadius={12} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function CategorySkeleton() {
  return (
    <View style={styles.categoryContainer}>
      <SkeletonLoader width={120} height={20} style={{ marginBottom: 16 }} />
      <View style={styles.categoryCard}>
        <SkeletonLoader width={48} height={48} borderRadius={24} />
        <View style={styles.categoryText}>
          <SkeletonLoader width={150} height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={200} height={12} />
        </View>
      </View>
      <View style={styles.categoryCard}>
        <SkeletonLoader width={48} height={48} borderRadius={24} />
        <View style={styles.categoryText}>
          <SkeletonLoader width={180} height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={220} height={12} />
        </View>
      </View>
    </View>
  );
}

export function HorizontalListSkeleton() {
  return (
    <View style={styles.horizontalContainer}>
      <View style={styles.horizontalHeader}>
        <SkeletonLoader width={180} height={24} style={{ marginBottom: 16 }} />
      </View>
      <View style={styles.horizontalList}>
        {[1, 2, 3, 4].map((item) => (
          <View key={item} style={styles.horizontalCard}>
            <SkeletonLoader width={160} height={240} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonLoader width={140} height={18} style={{ marginBottom: 6 }} />
            <SkeletonLoader width={100} height={14} style={{ marginBottom: 4 }} />
            <SkeletonLoader width={80} height={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function NewsSkeleton() {
  return (
    <View style={styles.newsContainer}>
      <SkeletonLoader width={120} height={20} style={{ marginBottom: 16, marginHorizontal: 20 }} />
      <View style={styles.newsScrollContainer}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.newsCard}>
            <SkeletonLoader width={280} height={180} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonLoader width={250} height={18} style={{ marginBottom: 8 }} />
            <SkeletonLoader width={200} height={14} style={{ marginBottom: 6 }} />
            <SkeletonLoader width={120} height={12} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function UpcomingReleasesSkeleton() {
  return (
    <View style={styles.upcomingContainer}>
      <SkeletonLoader width={180} height={20} style={{ marginBottom: 16, marginHorizontal: 20 }} />
      <View style={styles.upcomingCard}>
        <SkeletonLoader width={80} height={120} borderRadius={8} style={{ marginRight: 16 }} />
        <View style={styles.upcomingContent}>
          <SkeletonLoader width="80%" height={18} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="60%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="40%" height={12} />
        </View>
      </View>
    </View>
  );
}

export function ListCardSkeleton() {
  return (
    <View style={styles.listCardContainer}>
      <View style={styles.listCardSkeleton}>
        <SkeletonLoader width={80} height={120} borderRadius={8} style={{ marginRight: 16 }} />
        <View style={styles.listCardContent}>
          <SkeletonLoader width="90%" height={18} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="70%" height={14} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="50%" height={12} style={{ marginBottom: 12 }} />
          <View style={styles.listCardActions}>
            <SkeletonLoader width={60} height={24} borderRadius={12} style={{ marginRight: 8 }} />
            <SkeletonLoader width={80} height={24} borderRadius={12} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function GridSkeleton({ columns = 2, items = 6 }: { columns?: number; items?: number }) {
  const itemWidth = (screenWidth - 60 - (columns - 1) * 16) / columns;
  
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: items }).map((_, index) => (
        <View key={index} style={[styles.gridItem, { width: itemWidth }]}>
          <SkeletonLoader width={itemWidth} height={itemWidth * 1.5} borderRadius={12} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="90%" height={16} style={{ marginBottom: 4 }} />
          <SkeletonLoader width="70%" height={12} />
        </View>
      ))}
    </View>
  );
}

export function HeaderSkeleton() {
  return (
    <View style={styles.headerContainer}>
      <SkeletonLoader width={200} height={32} style={{ marginBottom: 8 }} />
      <SkeletonLoader width={150} height={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  shimmer: {
    width: '40%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    position: 'absolute',
    borderRadius: 8,
  },
  featuredContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  featuredSkeletonCard: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredSkeletonContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
  },
  featuredSkeletonPoster: {
    marginRight: 16,
  },
  featuredSkeletonInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredSkeletonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featuredSkeletonActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryContainer: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 20,
    backgroundColor: COLORS.card,
    borderRadius: 16,
  },
  categoryText: {
    marginLeft: 16,
    flex: 1,
  },
  horizontalContainer: {
    marginBottom: 24,
  },
  horizontalHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalList: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 8,
  },
  horizontalCard: {
    marginRight: 16,
    width: 160,
  },
  newsContainer: {
    marginBottom: 32,
  },
  newsScrollContainer: {
    flexDirection: 'row',
    paddingLeft: 20,
  },
  newsCard: {
    marginRight: 16,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: 280,
  },
  upcomingContainer: {
    marginBottom: 32,
  },
  upcomingCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
  },
  upcomingContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listCardContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  listCardSkeleton: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
  },
  listCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  gridItem: {
    marginBottom: 20,
  },
  headerContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
});