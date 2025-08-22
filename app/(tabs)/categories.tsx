import React, { useState, useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";

import { COLORS } from "@/constants/colors";
import CategoryPill from "@/components/CategoryPill";
import DramaCard from "@/components/DramaCard";
import { getDramasByGenre } from "@/services/api";
import { getResponsiveCardDimensions } from "@/constants/utils";

// Mock genres data
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

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedGenre, setSelectedGenre] = useState<number>(18); // Drama as default
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ["dramas-by-genre", selectedGenre],
    queryFn: ({ pageParam = 1 }) => getDramasByGenre(selectedGenre, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const dramas = data?.pages?.flatMap(page => page?.results || []) || [];
  
  // Calcular dimensões responsivas
  const { numColumns, cardWidth, itemPadding } = useMemo(() => getResponsiveCardDimensions('large'), []);
  
  const handleGenreSelect = useCallback((genreId: number) => {
    setSelectedGenre(genreId);
  }, []);
  
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
    <View style={[styles.container, { paddingTop: insets.top + 16 }]} testID="categories-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Categorias</Text>
      </View>
      
      <View style={styles.genresContainer}>
        <FlatList
          data={GENRES}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleGenreSelect(item.id)}>
              <CategoryPill 
                genre={item} 
                selected={item.id === selectedGenre}
                key={item.id}
              />
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genresList}
          testID="genres-list"
        />
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          {GENRES.find(g => g.id === selectedGenre)?.name || "Drama"} K-Dramas
        </Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Error loading dramas</Text>
            <Text style={styles.emptyText}>
              Please check your connection and try again
            </Text>
          </View>
        ) : dramas.length > 0 ? (
          <FlatList
            data={dramas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.cardContainer, { padding: itemPadding }]}>
                <DramaCard drama={item} size="small" width={cardWidth} />
              </View>
            )}
            numColumns={numColumns}
            key={numColumns}
            contentContainerStyle={styles.dramasList}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            testID="dramas-by-genre"
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No dramas found</Text>
            <Text style={styles.emptyText}>
              Try selecting a different category
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
  },
  genresContainer: {
    marginBottom: 16,
  },
  genresList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  dramasList: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  cardContainer: {
    // padding será definido dinamicamente
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
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