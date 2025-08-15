import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { getDramaVideos } from '@/services/api';
import { VideoItem } from '@/types/drama';

export default function DramaVideosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dramaId = parseInt(id || '0', 10);

  const { data: videos, isLoading } = useQuery({
    queryKey: ['drama-videos', dramaId],
    queryFn: () => getDramaVideos(dramaId),
    enabled: !!dramaId,
  });

  const handleVideoPress = async (video: VideoItem) => {
    if (video.site === 'YouTube') {
      const url = `https://www.youtube.com/watch?v=${video.key}`;
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.error('Error opening video:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const videoList = videos?.results || [];

  const renderVideoItem = ({ item }: { item: VideoItem }) => (
    <TouchableOpacity 
      style={styles.videoCard}
      onPress={() => handleVideoPress(item)}
    >
      <View style={styles.videoThumbnail}>
        <Image
          source={{
            uri: `https://img.youtube.com/vi/${item.key}/hqdefault.jpg`
          }}
          style={styles.videoImage}
        />
        <View style={styles.playButton}>
          <Play size={24} color={COLORS.text} fill={COLORS.text} />
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.videoType}>
          {item.type}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Vídeos',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
        }} 
      />
      
      {videoList.length > 0 ? (
        <FlatList
          data={videoList}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum vídeo disponível</Text>
        </View>
      )}
    </View>
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
  },
  content: {
    padding: 16,
  },
  videoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  videoThumbnail: {
    position: 'relative',
    width: '100%',
    height: 200,
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
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  videoType: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});