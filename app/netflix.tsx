import React, { useState, useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';

import { COLORS } from '@/constants/colors';
import { getNetflixDramas } from '@/services/api';
import DramaCard from '@/components/DramaCard';
import { Drama, DramaResponse } from '@/types/drama';
import { getResponsiveCardDimensions } from '@/constants/utils';

export default function NetflixScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Calcular dimensões responsivas
  const { numColumns, cardWidth, itemPadding } = useMemo(() => getResponsiveCardDimensions('medium'), []);

  const netflixQuery = useInfiniteQuery<DramaResponse, Error>({
    queryKey: ['netflix-dramas-full'],
    queryFn: ({ pageParam = 1 }) => getNetflixDramas(pageParam as number),
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

  const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, refetch, fetchNextPage } = netflixQuery;

  // Flatten all pages into a single array
  const allDramas = useMemo(() => {
    return data?.pages.flatMap((page: DramaResponse) => page.results) || [];
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

  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <Text style={styles.title}>🔥 Principais da Netflix</Text>
      <Text style={styles.subtitle}>
        Os K-Dramas mais bem avaliados disponíveis na Netflix
      </Text>
    </View>
  ), []);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Nenhum drama encontrado</Text>
      <Text style={styles.emptyMessage}>
        Não foi possível carregar os dramas da Netflix no momento.
      </Text>
    </View>
  ), []);

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Netflix K-Dramas',
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }} 
      />
      
      <FlatList
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 16, paddingBottom: insets.bottom + 24 }
        ]}
        data={allDramas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDrama}
        ListHeaderComponent={renderHeader}
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
        numColumns={numColumns}
        key={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
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
        showsVerticalScrollIndicator={false}
        testID="netflix-screen"
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={Platform.OS === 'android' ? 4 : 10}
        windowSize={Platform.OS === 'android' ? 3 : 21}
        initialNumToRender={Platform.OS === 'android' ? 4 : 10}
        updateCellsBatchingPeriod={Platform.OS === 'android' ? 150 : 50}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dramaContainer: {
    // padding será definido dinamicamente
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});