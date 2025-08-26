import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Calendar, ChevronRight, Clock } from 'lucide-react-native';

import { COLORS } from '@/constants/colors';
import { getUpcomingDramasPreview } from '@/services/api';
import { TMDB_IMAGE_BASE_URL, POSTER_SIZE } from '@/constants/config';

export default function UpcomingReleasesCard() {
  const router = useRouter();
  
  const upcomingQuery = useQuery({
    queryKey: ['upcoming-dramas-preview'],
    queryFn: getUpcomingDramasPreview
  });

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Hoje';
    } else if (diffDays === 1) {
      return 'Amanhã';
    } else if (diffDays <= 7) {
      return `Em ${diffDays} dias`;
    } else if (diffDays <= 30) {
      const weeks = Math.ceil(diffDays / 7);
      return `Em ${weeks} semana${weeks > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  if (upcomingQuery.isLoading || !upcomingQuery.data?.length) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Calendar size={20} color={COLORS.accent} />
          <Text style={styles.title}>Próximas Estreias</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => router.push('/releases-calendar' as any)}
        >
          <Text style={styles.viewAllText}>Ver todas</Text>
          <ChevronRight size={16} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {upcomingQuery.data.map((drama) => (
          <TouchableOpacity
            key={drama.id}
            style={styles.dramaCard}
            onPress={() => router.push(`/drama/${drama.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.posterContainer}>
              <Image
                source={{
                  uri: drama.poster_path
                    ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${drama.poster_path}`
                    : 'https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=No+Poster'
                }}
                style={styles.poster}
                contentFit="cover"
              />
              
              <View style={styles.releaseBadge}>
                <Clock size={12} color={COLORS.background} />
                <Text style={styles.releaseBadgeText}>
                  {formatReleaseDate(drama.first_air_date)}
                </Text>
              </View>
            </View>
            
            <View style={styles.dramaInfo}>
              <Text style={styles.dramaTitle} numberOfLines={2}>
                {drama.name}
              </Text>
              <Text style={styles.dramaOriginalTitle} numberOfLines={1}>
                {drama.original_name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
    marginRight: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dramaCard: {
    width: 120,
  },
  posterContainer: {
    position: 'relative',
    width: 120,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.card,
  },
  releaseBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  releaseBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.background,
    marginLeft: 2,
  },
  dramaInfo: {
    flex: 1,
  },
  dramaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 2,
  },
  dramaOriginalTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});