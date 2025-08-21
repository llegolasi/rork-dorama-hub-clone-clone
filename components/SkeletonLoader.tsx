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
        duration: 1200,
        useNativeDriver: true,
      }).start(() => shimmer());
    };
    shimmer();
  }, [shimmerAnimation]);

  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth * 0.8, screenWidth * 0.8],
  });

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.8, 0.3],
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
      <SkeletonLoader width="100%" height={400} borderRadius={16} />
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
        <SkeletonLoader width={180} height={24} style={{ marginBottom: 12 }} />
      </View>
      <View style={styles.horizontalList}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.horizontalCard}>
            <SkeletonLoader width={160} height={240} borderRadius={12} style={{ marginBottom: 8 }} />
            <SkeletonLoader width={140} height={16} style={{ marginBottom: 4 }} />
            <SkeletonLoader width={100} height={12} />
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
      <View style={styles.newsCard}>
        <SkeletonLoader width="100%" height={200} borderRadius={12} style={{ marginBottom: 12 }} />
        <SkeletonLoader width="90%" height={18} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="70%" height={14} />
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  shimmer: {
    width: '30%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    position: 'absolute',
    borderRadius: 8,
  },
  featuredContainer: {
    marginHorizontal: 20,
    marginBottom: 32,
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
  },
  newsContainer: {
    marginBottom: 32,
  },
  newsCard: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 16,
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
});