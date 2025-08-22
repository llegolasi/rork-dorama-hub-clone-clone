import React, { useCallback, useMemo } from "react";
import { 
  ActivityIndicator, 
  FlatList, 
  StyleSheet, 
  Text, 
  View 
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";

import { COLORS } from "@/constants/colors";
import { getDramasByGenre, getTopRatedDramas, getLatestDramas, getTrendingDramasWithPagination } from "@/services/api";
import DramaCard from "@/components/DramaCard";
import { getResponsiveColumns, getCardWidth } from "@/constants/utils";

// Mock genres data for title lookup
const GENRES = [
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 10759, name: "Action & Adventure" },
  { id: 35, name: "Comedy" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 9648, name: "Mystery" },
  { id: 10766, name: "Soap" },
  { id: 10768, name: "War & Politics" },
  { id: 80, name: "Crime" },
  { id: 10749, name: "Romance" },
  { id: 10762, name: "Kids" },
  { id: 10767, name: "Talk" },
  { id: 99, name: "Documentary" },
  { id: 36, name: "History" },
];

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const categoryId = id as string;
  
  // Determine the API function and title based on category
  const getCategoryData = () => {
    switch (categoryId) {
      case 'trending':
        return {
          queryFn: ({ pageParam = 1 }) => getTrendingDramasWithPagination(pageParam),
          title: 'Em Alta'
        };
      case 'top-rated':
        return {
          queryFn: ({ pageParam = 1 }) => getTopRatedDramas(pageParam),
          title: 'Mais Bem Avaliados'
        };
      case 'latest':
        return {
          queryFn: ({ pageParam = 1 }) => getLatestDramas(pageParam),
          title: 'Lançamentos'
        };
      default:
        const genreId = parseInt(categoryId, 10);
        const genreName = GENRES.find(g => g.id === genreId)?.name || "Category";
        return {
          queryFn: ({ pageParam = 1 }) => getDramasByGenre(genreId, pageParam),
          title: `${genreName} K-Dramas`
        };
    }
  };
  
  const { queryFn, title } = getCategoryData();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ["category-dramas", categoryId],
    queryFn,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1
  });
  
  const dramas = data?.pages.flatMap(page => page.results) || [];
  
  // Calcular número de colunas responsivo
  const numColumns = useMemo(() => getResponsiveColumns('large'), []);
  const cardWidth = useMemo(() => getCardWidth(numColumns, 4), [numColumns]);
  
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  
  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.accent} />
      </View>
    );
  };
  
  return (
    <View style={styles.container} testID="category-screen">
      <Stack.Screen options={{ title }} />
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : dramas.length > 0 ? (
        <FlatList
          data={dramas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.cardContainer, { width: cardWidth }]}>
              <DramaCard drama={item} size="small" />
            </View>
          )}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={styles.dramasList}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          testID="dramas-by-category"
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No dramas found</Text>
          <Text style={styles.emptyText}>
            We couldn&apos;t find any K-dramas in this category.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dramasList: {
    padding: 12,
  },
  cardContainer: {
    padding: 4,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});