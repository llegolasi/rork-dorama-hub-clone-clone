import React, { useState, useMemo, useCallback } from 'react';
import { FlatList, StyleSheet, Text, View, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';
import { getPopularDramasWithPagination } from '@/services/api';
import DramaCard from '@/components/DramaCard';
import { Drama, DramaResponse } from '@/types/drama';
import { getResponsiveCardDimensions } from '@/constants/utils';

export default function PopularScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  
  // Calcular dimensões responsivas
  const { numColumns, cardWidth, itemPadding } = useMemo(() => getResponsiveCardDimensions('medium'), []);

  const popularQuery = useInfiniteQuery<DramaResponse, Error>({
    queryKey: ['popular-dramas-full'],
    queryFn: ({ pageParam = 1 }) => getPopularDramasWithPagination(pageParam as number),
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

  const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, refetch, fetchNextPage } = popularQuery;

  const allDramas = useMemo(() => {
    const flattened = data?.pages.flatMap((page: DramaResponse) => page.results) || [];
    const uniqueDramas = flattened.filter((drama, index, self) => 
      drama && drama.id && index === self.findIndex(d => d && d.id === drama.id)
    );
    return uniqueDramas;
  }, [data]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderDrama = useCallback(({ item }: { item: Drama }) => (
    <View style={[styles.dramaContainer, { padding: itemPadding }]}>
      <DramaCard drama={item} size="medium" width={cardWidth} />
    </View>
  ), [itemPadding, cardWidth]);

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
          },
        }} 
      />
      
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {isLoading ? (
          renderLoading()
        ) : (
          <FlatList
            data={allDramas}
            keyExtractor={(item, index) => item?.id ? `popular-${item.id}` : `popular-fallback-${index}`}
            renderItem={renderDrama}
            numColumns={numColumns}
            key={numColumns}
            columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={!isLoading ? renderEmpty : null}
            ListFooterComponent={() => {
              if (isFetchingNextPage) {
                return (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color={COLORS.accent} />
                    <Text style={styles.loadingMoreText}>Carregando mais...</Text>
                  </View>
                );
              }
              return null;
            }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={refreshing || isFetching}
                onRefresh={handleRefresh}
                tintColor={COLORS.accent}
                colors={[COLORS.accent]}
                progressBackgroundColor={Platform.OS === 'android' ? COLORS.card : undefined}
              />
            }
            removeClippedSubviews={Platform.OS === 'android'}
            maxToRenderPerBatch={Platform.OS === 'android' ? 4 : 10}
            windowSize={Platform.OS === 'android' ? 3 : 21}
            initialNumToRender={Platform.OS === 'android' ? 4 : 10}
            updateCellsBatchingPeriod={Platform.OS === 'android' ? 150 : 50}
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
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
});