import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Calendar, Clock, Play, CheckCircle } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

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
      .sort((a, b) => new Date(a.air_date!).getTime() - new Date(b.air_date!).getTime());
  };

  if (episodesQuery.isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Play size={20} color="#007AFF" />
          <Text style={styles.title}>Episodes</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading episodes...</Text>
        </View>
      </View>
    );
  }

  if (episodesQuery.error || !episodesQuery.data) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Play size={20} color="#007AFF" />
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
        <Play size={20} color="#007AFF" />
        <Text style={styles.title}>Episodes</Text>
        <Text style={styles.subtitle}>
          {watchedCount}/{episodes.length} watched
        </Text>
      </View>

      {upcomingEpisodes.length > 0 && (
        <View style={styles.upcomingSection}>
          <View style={styles.upcomingHeader}>
            <Calendar size={16} color="#FF6B35" />
            <Text style={styles.upcomingTitle}>Upcoming Releases</Text>
          </View>
          {upcomingEpisodes.slice(0, 3).map((episode) => (
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
                <Clock size={12} color="#666" />
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
                <CheckCircle size={16} color="#34C759" />
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
              <CheckCircle 
                size={20} 
                color={selectedEpisode.watched ? '#34C759' : '#999'} 
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1a1a1a',
    marginLeft: 8,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500' as const,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  upcomingSection: {
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FF6B35',
    marginLeft: 6,
  },
  upcomingEpisode: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  episodeInfo: {
    flex: 1,
  },
  episodeNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#333',
  },
  episodeTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  airDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  airDate: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  episodesList: {
    marginVertical: 8,
  },
  episodesContent: {
    paddingRight: 16,
  },
  episodeCard: {
    width: 120,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  watchedEpisode: {
    backgroundColor: '#E8F5E8',
    borderColor: '#34C759',
  },
  selectedEpisode: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  episodeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  episodeCardNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#333',
  },
  episodeCardTitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    lineHeight: 14,
  },
  episodeCardDate: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  episodeCardRuntime: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500' as const,
  },
  episodeDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  watchButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  watchedText: {
    color: '#34C759',
  },
  episodeOverview: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});

export default EpisodesWidget;