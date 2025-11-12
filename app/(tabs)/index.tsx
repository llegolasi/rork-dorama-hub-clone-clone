import React, { useState, useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Platform, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import OptimizedImage from '@/components/OptimizedImage';
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Star, Users, Film, X, Bookmark, BookmarkCheck, Plus } from "lucide-react-native";

import { COLORS } from "@/constants/colors";
import { getPopularDramas, getTrendingDramasWithPagination, getNetflixDramas } from "@/services/api";
import { TMDB_IMAGE_BASE_URL, BACKDROP_SIZE, POSTER_SIZE, getApiBaseUrl } from "@/constants/config";
import HorizontalList from "@/components/HorizontalList";
import UpcomingReleasesCard from "@/components/UpcomingReleasesCard";
import NewsCarousel from "@/components/NewsCarousel";
import { HomepageCollections } from "@/components/HomepageCollections";
import { useUserLists } from "@/hooks/useUserStore";
import { trpc } from '@/lib/trpc';
import { FeaturedSkeleton, CategorySkeleton, HorizontalListSkeleton, NewsSkeleton, UpcomingReleasesSkeleton } from '@/components/SkeletonLoader';

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addToList } = useUserLists();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Test tRPC connection
  const testQuery = trpc.example.hi.useMutation();
  
  React.useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing backend connection...');
        const baseUrl = getApiBaseUrl();
        console.log('Base URL:', baseUrl);
        
        // Test basic backend connectivity
        const response = await fetch(`${baseUrl}/`);
        console.log('Backend status response:', response.status);
        const data = await response.json();
        console.log('Backend status data:', data);
        
        // Test tRPC connection
        console.log('Testing tRPC connection...');
        const result = await testQuery.mutateAsync({ name: 'Test' });
        console.log('tRPC test successful:', result);
      } catch (error) {
        console.error('Connection test failed:', error);
      }
    };
    testConnection();
  }, []);

  const newsQuery = trpc.news.getPosts.useQuery({
    limit: 5,
    offset: 0
  });

  console.log('News query status:', {
    isLoading: newsQuery.isLoading,
    isError: newsQuery.isError,
    error: newsQuery.error,
    dataLength: newsQuery.data?.length,
    data: newsQuery.data
  });

  const trendingQuery = useQuery({
    queryKey: ["trending-dramas-homepage"],
    queryFn: async () => {
      const response = await getTrendingDramasWithPagination(1);
      return response.results;
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 1 * 60 * 1000,
  });
  
  const popularQuery = useQuery({
    queryKey: ["popular-dramas"],
    queryFn: getPopularDramas,
    retry: 3,
    retryDelay: 1000,
    staleTime: 1 * 60 * 1000,
  });

  const netflixQuery = useQuery({
    queryKey: ["netflix-dramas"],
    queryFn: () => getNetflixDramas(1),
    retry: 3,
    retryDelay: 1000,
    staleTime: 1 * 60 * 1000,
  });

  useFocusEffect(
    useCallback(() => {
      console.log('[DiscoverScreen] Screen focused, refetching data...');
      trendingQuery.refetch();
      popularQuery.refetch();
      netflixQuery.refetch();
      newsQuery.refetch();
    }, [])
  );



  const handleRefresh = useCallback(() => {
    trendingQuery.refetch();
    popularQuery.refetch();
    netflixQuery.refetch();
    newsQuery.refetch();
  }, []);

  const isLoading = trendingQuery.isLoading || popularQuery.isLoading || netflixQuery.isLoading;
  const isRefreshing = trendingQuery.isFetching || popularQuery.isFetching || netflixQuery.isFetching;
  const hasError = !!trendingQuery.error || !!popularQuery.error || !!netflixQuery.error;

  const featuredDrama = trendingQuery.data?.[0] || popularQuery.data?.[0];



  const sections = useMemo(() => {
    if (isLoading) {
      return [
        { id: 'header', type: 'header' },
        { id: 'featured-skeleton', type: 'featured-skeleton' },
        { id: 'news-skeleton', type: 'news-skeleton' },
        { id: 'categories-skeleton', type: 'categories-skeleton' },
        { id: 'upcoming-skeleton', type: 'upcoming-skeleton' },
        { id: 'trending-skeleton', type: 'horizontal-list-skeleton' },
        { id: 'popular-skeleton', type: 'horizontal-list-skeleton' },
        { id: 'netflix-skeleton', type: 'horizontal-list-skeleton' },
      ];
    }
    
    if (hasError) {
      return [
        { id: 'header', type: 'header' },
        { id: 'error', type: 'error' },
      ];
    }
    
    return [
      { id: 'header', type: 'header' },
      { id: 'featured', type: 'featured' },
      { id: 'news', type: 'news' },
      { id: 'collections', type: 'collections' },
      { id: 'categories', type: 'categories' },
      { id: 'upcoming-releases', type: 'upcoming-releases' },
      {
        id: 'trending',
        type: 'horizontal-list',
        title: 'Em Alta Agora',
        data: trendingQuery.data || [],
        viewAllRoute: '/trending',
        cardSize: 'medium',
      },
      {
        id: 'popular',
        type: 'horizontal-list',
        title: 'K-Dramas Populares',
        data: popularQuery.data || [],
        viewAllRoute: '/popular',
        cardSize: 'medium',
      },
      {
        id: 'netflix',
        type: 'horizontal-list',
        title: '🔥 Principais da Netflix',
        data: netflixQuery.data?.results || [],
        viewAllRoute: '/netflix',
        cardSize: 'medium',
      },

    ];
  }, [isLoading, hasError, trendingQuery.data, popularQuery.data, netflixQuery.data]);

  const handleAddToList = useCallback(async (listType: 'watchlist' | 'watching') => {
    if (!featuredDrama) return;
    try {
      await addToList(
        featuredDrama.id,
        listType,
        listType === 'watching' ? (featuredDrama as any).number_of_episodes ?? undefined : undefined,
        {
          name: featuredDrama.name,
          poster_path: featuredDrama.poster_path,
          first_air_date: featuredDrama.first_air_date,
        }
      );
      setShowAddModal(false);
    } catch (e) {
      console.log('Error adding to list from featured:', e);
    }
  }, [featuredDrama, addToList]);

  const renderSection = useCallback(({ item }: { item: any }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.header}>
            <Text style={styles.title}>Descobrir</Text>
          </View>
        );
      case 'featured':
        if (!featuredDrama) return null;
        const releaseYear = featuredDrama.first_air_date ? new Date(featuredDrama.first_air_date).getFullYear() : null;
        const formattedRating = featuredDrama.vote_average.toFixed(1);
        return (
          <TouchableOpacity
            style={styles.featuredCard}
            onPress={() => router.push(`/drama/${featuredDrama.id}`)}
            activeOpacity={0.9}
          >
            <OptimizedImage
              source={{
                uri: featuredDrama.backdrop_path
                  ? `${TMDB_IMAGE_BASE_URL}/${BACKDROP_SIZE}${featuredDrama.backdrop_path}`
                  : `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${featuredDrama.poster_path}`,
              }}
              style={styles.featuredBackdrop}
              contentFit="cover"
              priority={Platform.OS === 'android' ? 'low' : 'high'}
              cachePolicy={Platform.OS === 'android' ? 'disk' : 'memory-disk'}
              placeholder="https://via.placeholder.com/800x450/1C1C1E/8E8E93?text=Loading"
            />

            <LinearGradient
              colors={["transparent", "rgba(0, 0, 0, 0.7)", "rgba(0, 0, 0, 0.95)"]}
              style={styles.featuredGradient}
            />

            <View style={styles.featuredContent}>
              <View style={styles.featuredPosterContainer}>
                <OptimizedImage
                  source={{
                    uri: featuredDrama.poster_path
                      ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${featuredDrama.poster_path}`
                      : 'https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=No+Poster',
                  }}
                  style={styles.featuredPoster}
                  contentFit="cover"
                  priority={Platform.OS === 'android' ? 'low' : 'normal'}
                  cachePolicy={Platform.OS === 'android' ? 'disk' : 'memory-disk'}
                  placeholder="https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=Loading"
                />
              </View>

              <View style={styles.featuredInfo}>
                <Text style={styles.featuredTitle} numberOfLines={2}>
                  {featuredDrama.name}
                </Text>
                <Text style={styles.featuredOriginalTitle} numberOfLines={1}>
                  {featuredDrama.original_name}
                </Text>

                <View style={styles.featuredMeta}>
                  <View style={styles.featuredRating}>
                    <Star size={14} color={COLORS.accent} fill={COLORS.accent} />
                    <Text style={styles.featuredRatingText}>{formattedRating}</Text>
                  </View>
                  <View style={styles.featuredMetaDivider} />
                  {releaseYear && <Text style={styles.featuredYear}>{releaseYear}</Text>}
                  <View style={styles.featuredMetaDivider} />
                  <Text style={styles.featuredGenre}>{featuredDrama.genre_ids?.length > 0 ? 'Drama' : 'Mistério'}</Text>
                </View>

                <View style={styles.featuredActions}>
                  <TouchableOpacity
                    style={styles.featuredWatchButton}
                    onPress={() => router.push(`/drama/${featuredDrama.id}`)}
                    testID="featured-know-more"
                  >
                    <Play size={16} color={COLORS.background} fill={COLORS.background} />
                    <Text style={styles.featuredWatchText}>Saiba Mais</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.featuredAddButton}
                    onPress={() => setShowAddModal(true)}
                    testID="featured-add-list"
                  >
                    <Text style={styles.featuredAddText}>+ Lista</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        );
      case 'categories':
        return (
          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesTitle}>🚀 Explorar</Text>
            <View style={styles.categoriesGrid}>
              <TouchableOpacity style={styles.categoryCard} onPress={() => router.push('/community')}>
                <View style={styles.categoryIcon}>
                  <Users size={24} color={COLORS.accent} />
                </View>
                <View style={styles.categoryTextContainer}>
                  <Text style={styles.categoryTitle}>Comunidade</Text>
                  <Text style={styles.categorySubtitle}>Participe das discussões e veja rankings</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.categoryCard} onPress={() => router.push('/categories')}>
                <View style={styles.categoryIcon}>
                  <Film size={24} color={COLORS.accent} />
                </View>
                <View style={styles.categoryTextContainer}>
                  <Text style={styles.categoryTitle}>Todas as Categorias</Text>
                  <Text style={styles.categorySubtitle}>Explore por gênero e popularidade</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'news':
        console.log('Rendering news section with data:', newsQuery.data);
        return <NewsCarousel news={newsQuery.data || []} />;
      case 'collections':
        return <HomepageCollections />;
      case 'upcoming-releases':
        return <UpcomingReleasesCard />;
      case 'featured-skeleton':
        return <FeaturedSkeleton />;
      case 'news-skeleton':
        return <NewsSkeleton />;
      case 'categories-skeleton':
        return <CategorySkeleton />;
      case 'horizontal-list-skeleton':
        return <HorizontalListSkeleton />;
      case 'upcoming-skeleton':
        return <UpcomingReleasesSkeleton />;
      case 'loading':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Carregando dramas...</Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Ops! Algo deu errado</Text>
            <Text style={styles.errorMessage}>Não foi possível carregar os dramas. Verifique sua conexão e tente novamente.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        );
      case 'horizontal-list':
        return (
          <HorizontalList
            title={item.title}
            data={item.data}
            viewAllRoute={item.viewAllRoute}
            cardSize={item.cardSize}
          />
        );
      default:
        return null;
    }
  }, [router, featuredDrama, newsQuery.data, handleRefresh, handleAddToList, setShowAddModal]);

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={[
          styles.content, 
          { paddingTop: insets.top + 16 }
        ]}
        data={sections}
        keyExtractor={(s) => s.id}
        renderItem={renderSection}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh} 
            tintColor={COLORS.accent} 
            colors={[COLORS.accent]}
            progressBackgroundColor={Platform.OS === 'android' ? COLORS.card : undefined}
          />
        }
        showsVerticalScrollIndicator={false}
        testID="discover-screen"
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={Platform.OS === 'android' ? 2 : 10}
        windowSize={Platform.OS === 'android' ? 3 : 21}
        initialNumToRender={Platform.OS === 'android' ? 2 : 10}
        updateCellsBatchingPeriod={Platform.OS === 'android' ? 150 : 50}
        legacyImplementation={Platform.OS === 'android'}
        getItemLayout={undefined}
      />

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar à Lista</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeButton} testID="close-featured-modal">
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.listOptions}>
              <TouchableOpacity style={styles.listOption} onPress={() => handleAddToList('watchlist')} testID="featured-add-watchlist">
                <Bookmark size={20} color={COLORS.accent} />
                <View style={styles.listOptionText}>
                  <Text style={styles.listOptionTitle}>Quero Assistir</Text>
                  <Text style={styles.listOptionSubtitle}>Adicionar à sua lista de desejos</Text>
                </View>
                <Plus size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.listOption} onPress={() => handleAddToList('watching')} testID="featured-add-watching">
                <BookmarkCheck size={20} color={COLORS.accent} />
                <View style={styles.listOptionText}>
                  <Text style={styles.listOptionTitle}>Estou Assistindo</Text>
                  <Text style={styles.listOptionSubtitle}>Começar a acompanhar o progresso</Text>
                </View>
                <Plus size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  featuredCard: {
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    height: 400,
    position: 'relative',
  },
  featuredBackdrop: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
  },
  featuredPosterContainer: {
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  featuredPoster: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.card,
  },
  featuredInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'flex-end',
  },
  featuredTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 32,
  },
  featuredOriginalTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredRatingText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  featuredMetaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 8,
  },
  featuredYear: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  featuredGenre: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  featuredActions: {
    flexDirection: 'row',
    gap: 12,
  },
  featuredWatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.text,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
  },
  featuredWatchText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  featuredAddButton: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredAddText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  categoriesSection: {
    marginBottom: 32,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoriesGrid: {
    paddingHorizontal: 20,
  },
  categoryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 95, 162, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  categorySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  listOptions: {
    padding: 20,
  },
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginBottom: 12,
  },
  listOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  listOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  listOptionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});