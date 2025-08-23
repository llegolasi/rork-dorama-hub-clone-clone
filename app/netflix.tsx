import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { COLORS } from '@/constants/colors';
import { getNetflixDramas } from '@/services/api';
import DramaCard from '@/components/DramaCard';
import { Drama } from '@/types/drama';

export default function NetflixScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const netflixQuery = useQuery({
    queryKey: ['netflix-dramas-full'],
    queryFn: getNetflixDramas,
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await netflixQuery.refetch();
    setRefreshing(false);
  }, [netflixQuery.refetch]);

  const renderDrama = useCallback(({ item }: { item: Drama }) => (
    <View style={styles.dramaContainer}>
      <DramaCard drama={item} size="medium" />
    </View>
  ), []);

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
        data={netflixQuery.data || []}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDrama}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!netflixQuery.isLoading ? renderEmpty : null}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || netflixQuery.isFetching}
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
    width: '48%',
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