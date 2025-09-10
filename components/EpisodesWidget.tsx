import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Calendar, Clock, Play, CheckCircle, Eye } from 'lucide-react-native';
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
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  
  const episodesQuery = trpc.episodes.getByDramaId.useQuery(
    { dramaId: parseInt(dramaId) },
    { enabled: !!dramaId && !isNaN(parseInt(dramaId)) }
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

  if (episodesQuery.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Play size={24} color={COLORS.accent} />
          <Text style={styles.title}>Episodes</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading episodes...</Text>
        </View>
      </View>
    );
  }

  if (episodesQuery.error || !episodesQuery.data) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Play size={24} color={COLORS.accent} />
          <Text style={styles.title}>Episodes</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {totalEpisodes ? `${totalEpisodes} episodes` : 'Episode information not available'}
          </Text>
        </View>
      </View>
    );
  }

  const episodes = episodesQuery.data || [];
  const upcomingEpisodes = getUpcomingEpisodes(episodes);
  const watchedCount = episodes.filter((ep: Episode) => ep.watched).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Play size={24} color={COLORS.accent} />
        <Text style={styles.title}>Episodes</Text>
        <Text style={styles.subtitle}>
          {watchedCount}/{episodes.length}
        </Text>
      </View>

      {upcomingEpisodes.length > 0 && (
        <View style={styles.upcomingSection}>
          <View style={styles.upcomingHeader}>
            <Calendar size={20} color={COLORS.accent} />
            <Text style={styles.upcomingTitle}>Upcoming Releases</Text>
          </View>
          {upcomingEpisodes.slice(0, 3).map((episode: Episode) => (
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
                <Clock size={14} color={COLORS.textSecondary} />
                <Text style={styles.airDate}>{formatAirDate(episode.air_date)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.episodesList}
        contentContainerStyle={styles.episodesContent}
      >
        {episodes.map((episode: Episode) => (
          <TouchableOpacity
            key={episode.id}
            style={[
              styles.episodeCard,
              episode.watched && styles.watchedEpisode,
              selectedEpisode?.id === episode.id && styles.selectedEpisode,
            ]}
            onPress={() => setSelectedEpisode(episode)}
            onLongPress={() => handleToggleWatched(episode.episode_number)}
          >
            <View style={styles.episodeCardHeader}>
              <Text style={styles.episodeCardNumber}>Ep {episode.episode_number}</Text>
              {episode.watched && (
                <CheckCircle size={18} color={COLORS.success} />
              )}
            </View>
            
            {episode.title && (
              <Text style={styles.episodeCardTitle} numberOfLines={2}>
                {episode.title}
              </Text>
            )}
            
            {episode.air_date && (
              <Text style={styles.episodeCardDate}>
                {formatAirDate(episode.air_date)}
              </Text>
            )}
            
            {episode.runtime && (
              <Text style={styles.episodeCardRuntime}>
                {episode.runtime}min
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedEpisode && (
        <View style={styles.episodeDetails}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>
              Episode {selectedEpisode.episode_number}
              {selectedEpisode.title && `: ${selectedEpisode.title}`}
            </Text>
            <TouchableOpacity
              style={styles.watchButton}
              onPress={() => handleToggleWatched(selectedEpisode.episode_number)}
            >
              <Eye 
                size={20} 
                color={selectedEpisode.watched ? COLORS.success : COLORS.textSecondary} 
              />
              <Text style={[
                styles.watchButtonText,
                selectedEpisode.watched && styles.watchedText
              ]}>
                {selectedEpisode.watched ? 'Watched' : 'Mark as Watched'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {selectedEpisode.overview && (
            <Text style={styles.episodeOverview}>
              {selectedEpisode.overview}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginLeft: 10,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600' as const,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginLeft: 12,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  upcomingSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.accent + '20',
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.accent,
    marginLeft: 8,
  },
  upcomingEpisode: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  episodeTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  airDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  airDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontWeight: '600' as const,
  },
  episodesList: {
    marginVertical: 12,
  },
  episodesContent: {
    paddingRight: 20,
  },
  episodeCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  watchedEpisode: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  selectedEpisode: {
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: COLORS.accent + '10',
  },
  episodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  episodeCardNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  episodeCardTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
  },
  episodeCardDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  episodeCardRuntime: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '600' as const,
  },
  episodeDetails: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.text,
    flex: 1,
    marginRight: 16,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  watchButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontWeight: '600' as const,
  },
  watchedText: {
    color: COLORS.success,
  },
  episodeOverview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default EpisodesWidget;