import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Plus, Eye, Clock } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/colors';
import { Drama } from '@/types/drama';
import { ListType } from '@/types/user';

interface ListItem {
  drama: Drama;
  addedAt: string;
  progress?: {
    currentEpisode: number;
    totalEpisodes: number;
  };
}

interface DramaItemProps {
  item: ListItem;
  listType: ListType;
  onAddToMyList: (dramaId: number, targetList: ListType) => void;
}

function DramaItem({ item, listType, onAddToMyList }: DramaItemProps) {
  const { drama, progress } = item;
  
  const handleAddToWatching = () => {
    Alert.alert(
      'Adicionar à lista',
      `Adicionar "${drama.name}" à sua lista "Estou Assistindo"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Adicionar', onPress: () => onAddToMyList(drama.id, 'watching') }
      ]
    );
  };

  const handleAddToWatchlist = () => {
    Alert.alert(
      'Adicionar à lista',
      `Adicionar "${drama.name}" à sua lista "Quero Assistir"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Adicionar', onPress: () => onAddToMyList(drama.id, 'watchlist') }
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={styles.dramaItem}
      onPress={() => router.push(`/drama/${drama.id}`)}
    >
      <Image
        source={{
          uri: drama.poster_path 
            ? `https://image.tmdb.org/t/p/w500${drama.poster_path}`
            : 'https://via.placeholder.com/80x120/333/fff?text=No+Image'
        }}
        style={styles.dramaPoster}
      />
      
      <View style={styles.dramaInfo}>
        <Text style={styles.dramaTitle} numberOfLines={2}>
          {drama.name}
        </Text>
        <Text style={styles.dramaYear}>
          {new Date(drama.first_air_date).getFullYear()}
        </Text>
        
        {listType === 'watching' && progress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${(progress.currentEpisode / progress.totalEpisodes) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              Ep. {progress.currentEpisode} de {progress.totalEpisodes}
            </Text>
          </View>
        )}
        
        <Text style={styles.addedDate}>
          Adicionado em {new Date(item.addedAt).toLocaleDateString('pt-BR')}
        </Text>
      </View>
      
      <View style={styles.actionButtons}>
        {listType !== 'watching' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddToWatching}
          >
            <Eye size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}
        
        {listType !== 'watchlist' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddToWatchlist}
          >
            <Clock size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function UserListScreen() {
  const { userId, listType } = useLocalSearchParams<{ 
    userId: string; 
    listType: ListType; 
  }>();
  
  const [listItems] = useState<ListItem[]>([
    {
      drama: {
        id: 1,
        name: 'Squid Game',
        original_name: '오징어 게임',
        poster_path: '/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg',
        backdrop_path: null,
        overview: 'Centenas de jogadores falidos aceitam um estranho convite para competir em jogos infantis.',
        first_air_date: '2021-09-17',
        vote_average: 7.8,
        vote_count: 8500,
        popularity: 2000,
        genre_ids: [18, 9648, 53],
        origin_country: ['KR']
      },
      addedAt: '2024-01-15T10:30:00Z',
      progress: listType === 'watching' ? { currentEpisode: 5, totalEpisodes: 9 } : undefined
    },
    {
      drama: {
        id: 2,
        name: 'Crash Landing on You',
        original_name: '사랑의 불시착',
        poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
        backdrop_path: null,
        overview: 'Uma herdeira sul-coreana faz um pouso forçado na Coreia do Norte.',
        first_air_date: '2019-12-14',
        vote_average: 8.7,
        vote_count: 1200,
        popularity: 1500,
        genre_ids: [35, 18],
        origin_country: ['KR']
      },
      addedAt: '2024-01-10T14:20:00Z',
      progress: listType === 'watching' ? { currentEpisode: 12, totalEpisodes: 16 } : undefined
    }
  ]);

  const getTitle = () => {
    switch (listType) {
      case 'watching':
        return 'Estou Assistindo';
      case 'watchlist':
        return 'Quero Assistir';
      case 'completed':
        return 'Já Vi';
      default:
        return 'Lista';
    }
  };

  const handleAddToMyList = (dramaId: number, targetList: ListType) => {
    Alert.alert('Sucesso', 'Drama adicionado à sua lista!');
  };

  const renderDrama = ({ item }: { item: ListItem }) => (
    <DramaItem
      item={item}
      listType={listType}
      onAddToMyList={handleAddToMyList}
    />
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: getTitle(),
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft color={COLORS.text} size={24} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <FlatList
        data={listItems}
        renderItem={renderDrama}
        keyExtractor={(item) => item.drama.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Esta lista está vazia
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContainer: {
    padding: 16,
  },
  dramaItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  dramaPoster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    marginRight: 16,
  },
  dramaInfo: {
    flex: 1,
  },
  dramaTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dramaYear: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  addedDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
});