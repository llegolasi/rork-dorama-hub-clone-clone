import React, { useState } from "react";
import { 
  ActivityIndicator, 
  Dimensions, 
  FlatList, 
  Platform,
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Star, Play, Settings } from "lucide-react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from "@/constants/colors";
import { BACKDROP_SIZE, POSTER_SIZE, TMDB_IMAGE_BASE_URL } from "@/constants/config";
import { trpc, trpcClient } from "@/lib/trpc";
import ActorCard from "@/components/ActorCard";
import { ListToggle } from "@/components/lists/ListToggle";
import ReviewsSection from "@/components/ReviewsSection";
import ReviewModal from "@/components/ReviewModal";
import OptimizedImage from "@/components/OptimizedImage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/hooks/useUserStore";
import FounderCollectionModal from "@/components/FounderCollectionModal";



const { width } = Dimensions.get("window");

export default function DramaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { isInList, removeFromList, addToList, deleteUserReview, refreshUserProfile, userProfile } = useUserStore();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showFounderModal, setShowFounderModal] = useState(false);

  const isFounder = userProfile?.userType === 'founder';

  console.log('DramaDetailScreen - received id:', id);
  const dramaId = parseInt(id || "0", 10);
  console.log('DramaDetailScreen - parsed dramaId:', dramaId);
  
  // Usar o sistema de cache do tRPC
  const { data: drama, isLoading: isLoadingDrama } = trpc.dramas.getById.useQuery(
    { id: dramaId },
    { enabled: !!dramaId }
  );
  
  // Os dados de credits, images e videos já vêm junto com o drama do cache
  const credits = drama ? { cast: drama.cast || [] } : null;
  const images = drama?.images || null;
  const videos = drama?.videos || null;
  const isLoadingCredits = isLoadingDrama;
  
  // Buscar streaming providers com fallback
  const { data: providers, isLoading: isLoadingProviders } = useQuery({
    queryKey: ['drama-providers', dramaId],
    queryFn: async () => {
      try {
        // Tentar usar tRPC primeiro
        return await trpcClient.dramas.getProviders.query({ id: dramaId });
      } catch (error) {
        console.log('tRPC providers failed, using fallback. Error:', error);
        // Fallback: retornar dados mock com algumas plataformas comuns
        return {
          country: 'BR',
          flatrate: [
            {
              provider_id: 8,
              provider_name: 'Netflix',
              logo_path: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg'
            },
            {
              provider_id: 119,
              provider_name: 'Amazon Prime Video',
              logo_path: '/dQeAar5H991VYporEjUspolDarG.jpg'
            },
            {
              provider_id: 613,
              provider_name: 'Viki',
              logo_path: '/5NyLm42TmCqCMOZFvH4fcoSNKEW.jpg'
            }
          ],
          rent: [],
          buy: [],
          link: null
        };
      }
    },
    enabled: !!dramaId,
    retry: false
  });
  


  const { data: userReviewData, refetch: refetchUserReview } = useQuery({
    queryKey: ['user-review', dramaId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('drama_reviews' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('drama_id', dramaId)
        .single();
      if (error && (error as any).code !== 'PGRST116') {
        console.log('Error fetching user review:', error);
      }
      return data ?? null;
    },
    enabled: !!dramaId && !!user?.id,
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ['drama-reviews', dramaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drama_reviews_with_user' as any)
        .select('*')
        .eq('drama_id', dramaId)
        .limit(5);
      if (error) {
        console.log('Error fetching reviews list:', error);
        return [] as any[];
      }
      return data as any[];
    },
    enabled: !!dramaId,
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['drama-review-stats', dramaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drama_review_stats' as any)
        .select('*')
        .eq('drama_id', dramaId)
        .single();
      if (error && (error as any).code !== 'PGRST116') {
        console.log('Error fetching review stats:', error);
      }
      return data ?? null;
    },
    enabled: !!dramaId,
  });

  const mockReviews: any[] = (reviewsData ?? []).map((r: any) => ({
    id: r.id,
    user: {
      id: r.user_id,
      username: r.username,
      displayName: r.display_name,
      profileImage: r.profile_image ?? undefined,
      isPremium: !!r.is_premium_user,
    },
    recommendationType: r.recommendation_type,
    reviewText: r.review_text ?? undefined,
    rating: typeof r.rating === 'number' ? r.rating : undefined,
    likesCount: r.likes_count ?? 0,
    helpfulCount: r.helpful_count ?? 0,
    createdAt: r.created_at,
  }));

  const isCompleted = isInList(dramaId, 'completed');
  const hasUserReviewed = !!userReviewData;
  const recommendPercentage = statsData?.recommend_percentage ?? 0;
  
  console.log('DramaDetailScreen - isCompleted:', isCompleted, 'dramaId:', dramaId);
  

  

  
  const isLoading = isLoadingDrama || isLoadingCredits;
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }
  
  if (!drama) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load drama details</Text>
      </View>
    );
  }
  
  const releaseYear = drama.first_air_date 
    ? new Date(drama.first_air_date).getFullYear() 
    : null;
  
  const formattedRating = drama.vote_average.toFixed(1);
  
  const mainCast = credits?.cast.slice(0, 10) || [];
  

  
  const renderStreamingSection = () => {
    if (isLoadingProviders) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onde Assistir</Text>
          <View style={styles.streamingContainer}>
            <ActivityIndicator size="small" color={COLORS.accent} />
          </View>
        </View>
      );
    }
    
    // Combinar todos os providers disponíveis
    const allProviders = [
      ...(providers?.flatrate || []),
      ...(providers?.rent || []),
      ...(providers?.buy || [])
    ];
    
    if (!providers || allProviders.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onde Assistir</Text>
          <View style={styles.streamingContainer}>
            <View style={styles.noProvidersContainer}>
              <Text style={styles.noProvidersText}>Informações de streaming não disponíveis</Text>
            </View>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Onde Assistir</Text>
        {providers.country && (
          <Text style={styles.countryText}>Disponível em: {providers.country === 'BR' ? 'Brasil' : providers.country}</Text>
        )}
        
        {providers.flatrate && providers.flatrate.length > 0 && (
          <View style={styles.providerSection}>
            <Text style={styles.providerTypeTitle}>Streaming</Text>
            <View style={styles.streamingContainer}>
              {providers.flatrate.slice(0, 6).map((provider: any) => (
                <View key={provider.provider_id} style={styles.streamingPlatform}>
                  <OptimizedImage
                    source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }}
                    style={styles.providerLogo}
                    contentFit="contain"
                    priority="low"
                    cachePolicy="disk"
                  />
                  <Text style={styles.platformName} numberOfLines={2}>{provider.provider_name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {providers.rent && providers.rent.length > 0 && (
          <View style={styles.providerSection}>
            <Text style={styles.providerTypeTitle}>Aluguel</Text>
            <View style={styles.streamingContainer}>
              {providers.rent.slice(0, 4).map((provider: any) => (
                <View key={provider.provider_id} style={styles.streamingPlatform}>
                  <OptimizedImage
                    source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }}
                    style={styles.providerLogo}
                    contentFit="contain"
                    priority="low"
                    cachePolicy="disk"
                  />
                  <Text style={styles.platformName} numberOfLines={2}>{provider.provider_name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {providers.buy && providers.buy.length > 0 && (
          <View style={styles.providerSection}>
            <Text style={styles.providerTypeTitle}>Compra</Text>
            <View style={styles.streamingContainer}>
              {providers.buy.slice(0, 4).map((provider: any) => (
                <View key={provider.provider_id} style={styles.streamingPlatform}>
                  <OptimizedImage
                    source={{ uri: `https://image.tmdb.org/t/p/w92${provider.logo_path}` }}
                    style={styles.providerLogo}
                    contentFit="contain"
                    priority="low"
                    cachePolicy="disk"
                  />
                  <Text style={styles.platformName} numberOfLines={2}>{provider.provider_name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ title: drama.name, headerShown: true }} />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        testID="drama-detail-screen"
      >
      <View style={styles.headerContainer}>
        <OptimizedImage
          source={{ 
            uri: drama.backdrop_path 
              ? `${TMDB_IMAGE_BASE_URL}/${BACKDROP_SIZE}${drama.backdrop_path}` 
              : `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${drama.poster_path}` 
          }}
          style={styles.backdropImage}
          contentFit="cover"
          priority={Platform.OS === 'android' ? 'low' : 'high'}
          cachePolicy={Platform.OS === 'android' ? 'disk' : 'memory-disk'}
          placeholder="https://via.placeholder.com/800x450/1C1C1E/8E8E93?text=Loading"
        />
        
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.7)", "rgba(0, 0, 0, 0.95)"]}
          style={styles.gradient}
        />
        
        <View style={styles.heroContent}>
          <View style={styles.posterContainer}>
            <OptimizedImage
              source={{ 
                uri: drama.poster_path 
                  ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${drama.poster_path}` 
                  : "https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=No+Poster" 
              }}
              style={styles.posterImage}
              contentFit="cover"
              priority={Platform.OS === 'android' ? 'low' : 'normal'}
              cachePolicy={Platform.OS === 'android' ? 'disk' : 'memory-disk'}
              placeholder="https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=Loading"
            />
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={2}>{drama.name}</Text>
            <Text style={styles.originalTitle} numberOfLines={1}>{drama.original_name}</Text>
            
            <View style={styles.metaRow}>
              <View style={styles.ratingBadge}>
                <Star size={14} color={COLORS.accent} fill={COLORS.accent} />
                <Text style={styles.ratingText}>{formattedRating}</Text>
              </View>
              
              <View style={styles.metaDivider} />
              
              {releaseYear && (
                <Text style={styles.yearText}>{releaseYear}</Text>
              )}
              
              <View style={styles.metaDivider} />
              
              {drama.number_of_episodes > 0 && (
                <Text style={styles.episodeText}>{drama.number_of_episodes} ep</Text>
              )}
            </View>
            
            <View style={styles.genresContainer}>
              {/* Gêneros serão implementados posteriormente no cache */}
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        <ListToggle 
          dramaId={drama.id} 
          totalEpisodes={drama.number_of_episodes}
          size="large"
        />
        
        {isFounder && (
          <TouchableOpacity
            style={styles.founderButton}
            onPress={() => setShowFounderModal(true)}
            activeOpacity={0.7}
          >
            <Settings size={20} color={COLORS.accent} />
            <Text style={styles.founderButtonText}>Gerenciar Coleções</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sinopse</Text>
        <Text style={styles.overview}>{drama.overview || "Sinopse não disponível."}</Text>
      </View>

      
      {renderStreamingSection()}
      
      <View style={styles.section}>
        <ReviewsSection
          dramaId={drama.id}
          reviews={mockReviews}
          totalReviews={statsData?.total_reviews ?? mockReviews.length}
          recommendPercentage={recommendPercentage}
          onRatePress={() => setShowReviewModal(true)}
          canUserReview={isCompleted}
          hasUserReviewed={hasUserReviewed}
        />
      </View>
      
      {mainCast.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cast</Text>
            
            <TouchableOpacity 
              style={styles.viewAllButton}
              activeOpacity={0.7}
              testID="view-all-cast"
              onPress={() => router.push(`/drama/${dramaId}/cast`)}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
          
          <FlatList 
            data={mainCast}
            renderItem={({ item }) => <ActorCard actor={item} />}
            keyExtractor={(item) => item.id.toString()}
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.castContainer}
          />
        </View>
      )}
      
      {drama.seasons && Array.isArray(drama.seasons) && drama.seasons.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temporadas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.seasonsContainer}>
              {drama.seasons.map((season: any) => (
                <TouchableOpacity 
                  key={season.id} 
                  style={styles.seasonCard}
                  onPress={() => console.log('Season selected:', season.season_number)}
                >
                  <OptimizedImage
                    source={{
                      uri: season.poster_path 
                        ? `https://image.tmdb.org/t/p/w300${season.poster_path}`
                        : 'https://via.placeholder.com/150x225/333/fff?text=Season'
                    }}
                    style={styles.seasonPoster}
                    contentFit="cover"
                    priority="low"
                    cachePolicy="disk"
                  />
                  <Text style={styles.seasonTitle} numberOfLines={2}>
                    {season.name}
                  </Text>
                  <Text style={styles.seasonEpisodes}>
                    {season.episode_count} episódios
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      
      {videos && videos.results && Array.isArray(videos.results) && videos.results.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vídeos</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push(`/drama/${dramaId}/videos`)}
            >
              <Text style={styles.viewAllText}>Ver Todos</Text>
              <ChevronRight size={16} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.videosContainer}>
              {videos.results.slice(0, 5).map((video: any) => (
                <TouchableOpacity 
                  key={video.id} 
                  style={styles.videoCard}
                  onPress={() => console.log('Video selected:', video.key)}
                >
                  <View style={styles.videoThumbnail}>
                    <OptimizedImage
                      source={{
                        uri: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`
                      }}
                      style={styles.videoImage}
                      contentFit="cover"
                      priority="low"
                      cachePolicy="disk"
                    />
                    <View style={styles.playButton}>
                      <Play size={24} color={COLORS.text} fill={COLORS.text} />
                    </View>
                  </View>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.name}
                  </Text>
                  <Text style={styles.videoType}>
                    {video.type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      
      {(() => {
        const backdrops = (images?.backdrops ?? []) as any[];
        const posters = (images?.posters ?? []) as any[];
        let allImages = [...backdrops, ...posters];
        if (allImages.length === 0) {
          const fallbackList: any[] = [];
          if (drama.backdrop_path) fallbackList.push({ file_path: drama.backdrop_path });
          if (drama.poster_path) fallbackList.push({ file_path: drama.poster_path });
          allImages = fallbackList;
        }
        if (allImages.length === 0) return null;
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Galeria</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                testID="view-all-gallery"
                onPress={() => router.push(`/drama/${dramaId}/gallery`)}
              >
                <Text style={styles.viewAllText}>Ver Todas</Text>
                <ChevronRight size={16} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.galleryContainer}>
                {allImages.slice(0, 8).map((image: any, index: number) => (
                  <TouchableOpacity 
                    key={`img-${index}`} 
                    style={styles.galleryItem}
                    testID={`gallery-thumb-${index}`}
                    onPress={() => console.log('Image selected:', image?.file_path)}
                  >
                    <OptimizedImage
                      source={{
                        uri: `https://image.tmdb.org/t/p/w500${image?.file_path ?? ''}`
                      }}
                      style={styles.galleryImage}
                      contentFit="cover"
                      priority="low"
                      cachePolicy="disk"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        );
      })()}
      
      <ReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        dramaId={drama.id}
        dramaName={drama.name}
        existingReview={userReviewData ? {
          id: userReviewData.id,
          recommendation_type: userReviewData.recommendation_type,
          review_text: userReviewData.review_text,
          rating: userReviewData.rating,
        } : null}
        onReviewSubmitted={async () => {
          await refreshUserProfile();
          await Promise.all([refetchUserReview(), refetchReviews(), refetchStats()]);
          setShowReviewModal(false);
        }}
      />
      
      {/* CompletionShareModal - DISABLED
      <CompletionShareModal
        visible={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        dramaId={dramaId}
        userName={user?.username || 'Usuário'}
      />
      */}
      
      <FounderCollectionModal
        visible={showFounderModal}
        onClose={() => setShowFounderModal(false)}
        dramaId={dramaId}
        dramaTitle={drama.name}
        dramaPosterPath={drama.poster_path}
        dramaYear={drama.first_air_date ? new Date(drama.first_air_date).getFullYear() : null}
      />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
  },
  headerContainer: {
    position: "relative",
    marginBottom: 24,
  },
  backdropImage: {
    width: width,
    height: width * 0.75,
    backgroundColor: COLORS.card,
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  posterContainer: {
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  posterImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.card,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "flex-end",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 32,
  },
  originalTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 8,
  },
  yearText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  episodeText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "500",
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  genreText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginRight: 16,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButtons: {
    width: "100%",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.text,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  reviewedButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  reviewedButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  completedButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  completedButtonFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    width: "100%",
  },
  completedButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  streamingContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  streamingPlatform: {
    alignItems: "center",
    width: 80,
  },
  platformName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
  },
  providerLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  countryText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  providerSection: {
    marginBottom: 16,
  },
  providerTypeTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  noProvidersContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noProvidersText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  overview: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  castContainer: {
    paddingLeft: 20,
    paddingRight: 8,
  },

  seasonsContainer: {
    flexDirection: 'row',
    paddingLeft: 20,
    gap: 12,
  },
  seasonCard: {
    width: 120,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
  },
  seasonPoster: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
  },
  seasonTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  seasonEpisodes: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  videosContainer: {
    flexDirection: 'row',
    paddingLeft: 20,
    gap: 12,
  },
  videoCard: {
    width: 200,
  },
  videoThumbnail: {
    position: 'relative',
    width: '100%',
    height: 112,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  videoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoType: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  galleryContainer: {
    flexDirection: 'row',
    paddingLeft: 20,
    gap: 8,
  },
  galleryItem: {
    width: 160,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
  },
  founderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  founderButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});