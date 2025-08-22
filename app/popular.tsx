import React, { useState, useMemo, useCallback } from 'react';
import { FlatList, StyleSheet, Text, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';

import { COLORS } from '@/constants/colors';
import { getPopularDramas } from '@/services/api';
import DramaCard from '@/components/DramaCard';
import { Drama, DramaResponse } from '@/types/drama';
import { getResponsiveCardDimensions } from '@/constants/utils';

export default function PopularScreen() {
  const [refreshing, setRefreshing] = useState(false);
  
  // Calcular dimensões responsivas
  const { numColumns, cardWidth, itemPadding } = useMemo(() => getResponsiveCardDimensions('medium'), []);

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch
  } = useInfiniteQuery<DramaResponse, Error>({
    queryKey: ['popular-dramas-infinite'],
    queryFn: ({ pageParam = 1 }) => getPopularDramas(pageParam as number),
    getNextPageParam: (lastPage: DramaResponse) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  // Flatten all pages data
  const allDramas = useMemo(() => {
    return data?.pages.flatMap((page: DramaResponse) => page.results) || [];
  }, [data]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderDrama = ({ item }: { item: Drama }) => (
    <View style={[styles.dramaContainer, { padding: itemPadding }]}>
      <DramaCard drama={item} size="medium" width={cardWidth} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Nenhum drama popular encontrado</Text>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.loadingText}>Carregando dramas populares...</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.accent} />
        <Text style={styles.footerText}>Carregando mais...</Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'K-Dramas Populares',
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 20,
          },
          headerShadowVisible: false,
        }} 
      />
      
      <View style={styles.container}>
        {isLoading ? (
          renderLoading()
        ) : (
          <FlatList
            data={allDramas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderDrama}
            numColumns={numColumns}
            key={numColumns}
            columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.accent}
                colors={[COLORS.accent]}
              />
            }
            testID="popular-dramas-list"
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dramaContainer: {
    // padding será definido dinamicamente
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
});