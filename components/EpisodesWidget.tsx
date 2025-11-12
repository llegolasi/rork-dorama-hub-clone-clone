import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Calendar, Clock, Play, CheckCircle, ChevronRight } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { COLORS } from '@/constants/colors';

interface EpisodesWidgetProps {
  dramaId: string;
  totalEpisodes?: number;
}

interface Episode {
  id: string;
  episode_number: number;
  title?: string;
  air_date?: string;
  runtime?: number;
  overview?: string;
  still_path?: string;
  watched?: boolean;
}

const EpisodesWidget: React.FC<EpisodesWidgetProps> = ({ dramaId, totalEpisodes }) => {
  console.log('🎬 [EpisodesWidget] Component mounted');
  console.log('🎬 [EpisodesWidget] Drama ID (string):', dramaId);
  console.log('🎬 [EpisodesWidget] Total Episodes prop:', totalEpisodes);
  
  const [showAll, setShowAll] = useState<boolean>(false);
  
  const dramaIdNumber = parseInt(dramaId);
  console.log('🎬 [EpisodesWidget] Drama ID (number):', dramaIdNumber);
  console.log('🎬 [EpisodesWidget] Is valid number:', !isNaN(dramaIdNumber));
  
  const episodesQuery = trpc.episodes.getByDramaId.useQuery(
    { dramaId: dramaIdNumber },
    { enabled: !!dramaId && !isNaN(dramaIdNumber) }
  );

  const markWatchedMutation = trpc.episodes.markAsWatched.useMutation({
    onSuccess: () => {
      episodesQuery.refetch();
    },
  });

  const handleToggleWatched = (episodeNumber: number) => {
    markWatchedMutation.mutate({ 
      dramaId: parseInt(dramaId), 
      episodeNumber 
    });
  };

  const formatAirDate = (dateString?: string) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    const now = new Date();
    
    if (date > now) {
      return `Releases ${date.toLocaleDateString()}`;
    }
    return date.toLocaleDateString();
  };

  const getUpcomingEpisodes = (episodes: Episode[]) => {
    const now = new Date();
    return episodes.filter((ep: Episode) => ep.air_date && new Date(ep.air_date) > now)
      .sort((a: Episode, b: Episode) => new Date(a.air_date!).getTime() - new Date(b.air_date!).getTime());
  };

  console.log('🎬 [EpisodesWidget] Query state:', {
    isLoading: episodesQuery.isLoading,
    isError: episodesQuery.isError,
    error: episodesQuery.error,
    dataLength: episodesQuery.data?.length,
  });

  if (episodesQuery.isLoading) {
    console.log('⏳ [EpisodesWidget] Loading episodes...');
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Play size={20} color={COLORS.accent} />
          <Text style={styles.title}>Episodes</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading episodes...</Text>
        </View>
      </View>
    );
  }

  if (episodesQuery.error || !episodesQuery.data) {
    console.log('❌ [EpisodesWidget] Error or no data');
    console.log('❌ [EpisodesWidget] Error:', episodesQuery.error);
    console.log('❌ [EpisodesWidget] Data:', episodesQuery.data);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Play size={20} color={COLORS.accent} />
          <Text style={styles.title}>Episodes</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {totalEpisodes ? `${totalEpisodes} episodes` : 'Episode information not available'}
          </Text>
          {episodesQuery.error && (
            <Text style={[styles.emptyText, { color: COLORS.error, marginTop: 8 }]}>
              Error: {episodesQuery.error.message}
            </Text>
          )}
        </View>
      </View>
    );
  }

  const episodes = episodesQuery.data || [];
  console.log('✅ [EpisodesWidget] Episodes loaded successfully');
  console.log('✅ [EpisodesWidget] Total episodes:', episodes.length);
  console.log('✅ [EpisodesWidget] First episode:', episodes[0]);
  
  const upcomingEpisodes = getUpcomingEpisodes(episodes);
  const watchedCount = episodes.filter((ep: Episode) => ep.watched).length;
  const displayedEpisodes = showAll ? episodes : episodes.slice(0, 5);
  const hasMoreEpisodes = episodes.length > 5;
  
  console.log('✅ [EpisodesWidget] Upcoming episodes:', upcomingEpisodes.length);
  console.log('✅ [EpisodesWidget] Watched count:', watchedCount);
  console.log('✅ [EpisodesWidget] Displayed episodes:', displayedEpisodes.length);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Play size={20} color={COLORS.accent} />
        <Text style={styles.title}>Episodes</Text>
        <Text style={styles.subtitle}>
          {watchedCount}/{episodes.length}
        </Text>
      </View>

      {upcomingEpisodes.length > 0 && (
        <View style={styles.upcomingSection}>
          <View style={styles.upcomingHeader}>
            <Calendar size={16} color={COLORS.accent} />
            <Text style={styles.upcomingTitle}>Upcoming Releases</Text>
          </View>
          {upcomingEpisodes.slice(0, 2).map((episode: Episode) => (
            <View key={episode.id} style={styles.upcomingEpisode}>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeNumber}>Ep {episode.episode_number}</Text>
                {episode.title && (
                  <Text style={styles.episodeTitle} numberOfLines={1}>
                    {episode.title}
                  </Text>
                )}
              </View>
              <View style={styles.airDateContainer}>
                <Clock size={12} color={COLORS.textSecondary} />
                <Text style={styles.airDate}>{formatAirDate(episode.air_date)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.episodesList}>
        {displayedEpisodes.map((episode: Episode) => (
          <TouchableOpacity
            key={episode.id}
            style={styles.episodeItem}
            onPress={() => handleToggleWatched(episode.episode_number)}
          >
            <View style={styles.episodeContent}>
              <View style={styles.episodeLeft}>
                <View style={[
                  styles.episodeNumberBadge,
                  episode.watched && styles.watchedBadge
                ]}>
                  <Text style={[
                    styles.episodeNumberText,
                    episode.watched && styles.watchedNumberText
                  ]}>
                    {episode.episode_number}
                  </Text>
                </View>
                
                <View style={styles.episodeDetails}>
                  <Text style={styles.episodeItemTitle} numberOfLines={1}>
                    {episode.title || `Episode ${episode.episode_number}`}
                  </Text>
                  
                  <View style={styles.episodeMetadata}>
                    {episode.air_date && (
                      <Text style={styles.episodeDate}>
                        {formatAirDate(episode.air_date)}
                      </Text>
                    )}
                    {episode.runtime && (
                      <Text style={styles.episodeRuntime}>
                        • {episode.runtime}min
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              
              <View style={styles.episodeRight}>
                {episode.watched ? (
                  <CheckCircle size={20} color={COLORS.success} />
                ) : (
                  <View style={styles.unwatchedIndicator} />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
        
        {hasMoreEpisodes && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => setShowAll(!showAll)}
          >
            <Text style={styles.showMoreText}>
              {showAll ? 'Show Less' : `Show All ${episodes.length} Episodes`}
            </Text>
            <ChevronRight 
              size={16} 
              color={COLORS.accent} 
              style={[styles.chevron, showAll && styles.chevronUp]} 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600' as const,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  upcomingSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.accent,
    marginLeft: 6,
  },
  upcomingEpisode: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeNumber: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  episodeTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  airDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  airDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 3,
    fontWeight: '500' as const,
  },
  episodesList: {
    gap: 8,
  },
  episodeItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  episodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  episodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  episodeNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  watchedBadge: {
    backgroundColor: COLORS.success,
  },
  episodeNumberText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
  },
  watchedNumberText: {
    color: COLORS.background,
  },
  episodeDetails: {
    flex: 1,
  },
  episodeItemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  episodeMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  episodeRuntime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
    marginLeft: 4,
  },
  episodeRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unwatchedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.accent,
    marginRight: 4,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronUp: {
    transform: [{ rotate: '270deg' }],
  },
});

export default EpisodesWidget;