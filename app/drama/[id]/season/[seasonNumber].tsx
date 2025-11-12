import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Play, CheckCircle, Clock, Calendar, Star } from 'lucide-react-native';

import { COLORS } from '@/constants/colors';
import { TMDB_API_KEY } from '@/constants/config';
import OptimizedImage from '@/components/OptimizedImage';

interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number;
  vote_average: number;
  season_number: number;
}

interface SeasonDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episodes: Episode[];
  air_date: string;
}

async function getSeasonDetails(dramaId: string, seasonNumber: string): Promise<SeasonDetails> {
  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${dramaId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=pt-BR`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch season details');
  }
  
  return response.json();
}

export default function SeasonEpisodesScreen() {
  const { id: dramaId, seasonNumber } = useLocalSearchParams<{ id: string; seasonNumber: string }>();
  const router = useRouter();
  
  console.log('[SeasonEpisodesScreen] Params:', { dramaId, seasonNumber });
  
  const { data: season, isLoading, error } = useQuery({
    queryKey: ['season-details', dramaId, seasonNumber],
    queryFn: () => getSeasonDetails(dramaId || '', seasonNumber || '1'),
    enabled: !!dramaId && !!seasonNumber,
  });
  
  console.log('[SeasonEpisodesScreen] Query state:', { isLoading, hasError: !!error, hasSeason: !!season });

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Episódios' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando episódios...</Text>
        </View>
      </>
    );
  }

  if (error || !season) {
    return (
      <>
        <Stack.Screen options={{ title: 'Episódios' }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erro ao carregar episódios</Text>
        </View>
      </>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatRuntime = (minutes: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: season.name || `Temporada ${seasonNumber}`,
          headerStyle: { backgroundColor: COLORS.background },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: COLORS.text,
          },
        }} 
      />
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {season.poster_path && (
          <View style={styles.headerSection}>
            <View style={styles.posterContainer}>
              <OptimizedImage
                source={{
                  uri: `https://image.tmdb.org/t/p/w500${season.poster_path}`
                }}
                style={styles.poster}
                contentFit="cover"
                priority="high"
                cachePolicy="memory-disk"
              />
            </View>
            
            <View style={styles.headerInfo}>
              <Text style={styles.seasonName}>{season.name}</Text>
              {season.air_date && (
                <View style={styles.metaRow}>
                  <Calendar size={14} color={COLORS.textSecondary} />
                  <Text style={styles.metaText}>{formatDate(season.air_date)}</Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <Play size={14} color={COLORS.accent} />
                <Text style={styles.episodeCount}>
                  {season.episodes.length} episódio{season.episodes.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {season.overview && (
          <View style={styles.overviewSection}>
            <Text style={styles.overviewText}>{season.overview}</Text>
          </View>
        )}
        
        <View style={styles.episodesSection}>
          <Text style={styles.sectionTitle}>Episódios</Text>
          
          {season.episodes.map((episode, index) => (
            <TouchableOpacity
              key={episode.id}
              style={styles.episodeCard}
              activeOpacity={0.7}
              onPress={() => {
                console.log('Episode selected:', episode.episode_number);
              }}
            >
              <View style={styles.episodeRow}>
                {episode.still_path ? (
                  <View style={styles.episodeThumbnailContainer}>
                    <OptimizedImage
                      source={{
                        uri: `https://image.tmdb.org/t/p/w300${episode.still_path}`
                      }}
                      style={styles.episodeThumbnail}
                      contentFit="cover"
                      priority="low"
                      cachePolicy="disk"
                    />
                    <View style={styles.playOverlay}>
                      <View style={styles.playButton}>
                        <Play size={20} color={COLORS.text} fill={COLORS.text} />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.episodeThumbnailContainer, styles.noImage]}>
                    <Play size={32} color={COLORS.textSecondary} />
                  </View>
                )}
                
                <View style={styles.episodeInfo}>
                  <View style={styles.episodeHeader}>
                    <View style={styles.episodeNumberBadge}>
                      <Text style={styles.episodeNumberText}>{episode.episode_number}</Text>
                    </View>
                    {episode.runtime > 0 && (
                      <View style={styles.runtimeBadge}>
                        <Clock size={12} color={COLORS.textSecondary} />
                        <Text style={styles.runtimeText}>{formatRuntime(episode.runtime)}</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.episodeTitle} numberOfLines={2}>
                    {episode.name}
                  </Text>
                  
                  {episode.overview && (
                    <Text style={styles.episodeOverview} numberOfLines={2}>
                      {episode.overview}
                    </Text>
                  )}
                  
                  <View style={styles.episodeFooter}>
                    {episode.air_date && (
                      <View style={styles.airDate}>
                        <Calendar size={12} color={COLORS.textSecondary} />
                        <Text style={styles.airDateText}>{formatDate(episode.air_date)}</Text>
                      </View>
                    )}
                    {episode.vote_average > 0 && (
                      <View style={styles.rating}>
                        <Star size={12} color={COLORS.accent} fill={COLORS.accent} />
                        <Text style={styles.ratingText}>{episode.vote_average.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  headerSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  posterContainer: {
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  seasonName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  episodeCount: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  overviewSection: {
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  overviewText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
    opacity: 0.9,
  },
  episodesSection: {
    padding: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  episodeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  episodeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  episodeThumbnailContainer: {
    width: 140,
    height: 80,
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  episodeThumbnail: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  episodeNumberBadge: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  episodeNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  runtimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  runtimeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  episodeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
  },
  episodeOverview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  episodeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  airDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  airDateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '600',
  },
});
