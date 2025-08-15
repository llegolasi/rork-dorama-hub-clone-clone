import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  X, 
  GripVertical,
  Search 
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router';

import { COLORS } from '@/constants/colors';
import type { Drama } from '@/types/drama';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';

interface RankingDrama {
  drama: Drama;
  rank: number;
}

const RankingEditScreen = () => {
  const [rankingTitle, setRankingTitle] = useState('Meus Top 10 K-Dramas Favoritos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDramas, setSelectedDramas] = useState<RankingDrama[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  // Save ranking mutation
  const saveRankingMutation = trpc.rankings.saveRanking.useMutation({
    onSuccess: () => {
      Alert.alert(
        'Ranking salvo!',
        'Seu ranking foi atualizado com sucesso.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    onError: (error) => {
      console.error('Error saving ranking:', error);
      Alert.alert('Erro', 'Não foi possível salvar o ranking. Tente novamente.');
    }
  });

  const mockCompletedDramas: Drama[] = [
    {
      id: 3,
      name: 'Descendants of the Sun',
      original_name: '태양의 후예',
      poster_path: '/tY6ypjKOOtujhKOLJ0rmdKcBF8G.jpg',
      backdrop_path: null,
      overview: '',
      first_air_date: '2016-02-24',
      vote_average: 8.2,
      vote_count: 850,
      popularity: 75.3,
      genre_ids: [18, 10749],
      origin_country: ['KR'],
    },
    {
      id: 4,
      name: 'Hotel del Luna',
      original_name: '호텔 델루나',
      poster_path: '/q1bT8vKgWA4qQKJ9AAEzHdJl7wD.jpg',
      backdrop_path: null,
      overview: '',
      first_air_date: '2019-07-13',
      vote_average: 8.5,
      vote_count: 720,
      popularity: 82.1,
      genre_ids: [18, 14, 10749],
      origin_country: ['KR'],
    },
    {
      id: 5,
      name: 'It\'s Okay to Not Be Okay',
      original_name: '사이코지만 괜찮아',
      poster_path: '/8Fzq4PUFZjdD8wZGm8p7kJzqZzG.jpg',
      backdrop_path: null,
      overview: '',
      first_air_date: '2020-06-20',
      vote_average: 8.7,
      vote_count: 650,
      popularity: 79.8,
      genre_ids: [18, 10749],
      origin_country: ['KR'],
    },
  ];

  const filteredDramas = mockCompletedDramas.filter(drama =>
    drama.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedDramas.some(selected => selected.drama.id === drama.id)
  );

  const handleAddDrama = (drama: Drama) => {
    if (selectedDramas.length >= 10) {
      Alert.alert('Limite atingido', 'Você pode adicionar no máximo 10 doramas ao seu ranking.');
      return;
    }

    const newRank = selectedDramas.length + 1;
    setSelectedDramas([...selectedDramas, { drama, rank: newRank }]);
    setSearchQuery('');
  };

  const handleRemoveDrama = (dramaId: number) => {
    const updatedDramas = selectedDramas
      .filter(item => item.drama.id !== dramaId)
      .map((item, index) => ({ ...item, rank: index + 1 }));
    setSelectedDramas(updatedDramas);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newDramas = [...selectedDramas];
    [newDramas[index], newDramas[index - 1]] = [newDramas[index - 1], newDramas[index]];
    
    newDramas.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    
    setSelectedDramas(newDramas);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedDramas.length - 1) return;
    
    const newDramas = [...selectedDramas];
    [newDramas[index], newDramas[index + 1]] = [newDramas[index + 1], newDramas[index]];
    
    newDramas.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    
    setSelectedDramas(newDramas);
  };

  const handleSave = async () => {
    if (selectedDramas.length === 0) {
      Alert.alert('Ranking vazio', 'Adicione pelo menos um dorama ao seu ranking.');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para salvar um ranking.');
      return;
    }

    setIsSaving(true);
    
    try {
      await saveRankingMutation.mutateAsync({
        title: rankingTitle,
        description: '',
        dramaIds: selectedDramas.map(item => item.drama.id),
        isPublic: true
      });
    } catch (error) {
      console.error('Error saving ranking:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderSelectedDrama = (item: RankingDrama, index: number) => (
    <View key={item.drama.id} style={styles.selectedDramaItem}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{item.rank}</Text>
      </View>
      
      <Image
        source={{
          uri: item.drama.poster_path
            ? `https://image.tmdb.org/t/p/w200${item.drama.poster_path}`
            : 'https://via.placeholder.com/200x300/333/fff?text=No+Image',
        }}
        style={styles.dramaPoster}
        contentFit="cover"
      />
      
      <View style={styles.dramaInfo}>
        <Text style={styles.dramaTitle} numberOfLines={2}>
          {item.drama.name}
        </Text>
        <Text style={styles.dramaYear}>
          {new Date(item.drama.first_air_date).getFullYear()}
        </Text>
      </View>
      
      <View style={styles.dramaActions}>
        <TouchableOpacity
          style={[styles.actionButton, index === 0 && styles.disabledButton]}
          onPress={() => handleMoveUp(index)}
          disabled={index === 0}
        >
          <GripVertical size={16} color={index === 0 ? COLORS.textSecondary : COLORS.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveDrama(item.drama.id)}
        >
          <X size={16} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAvailableDrama = (drama: Drama) => (
    <TouchableOpacity
      key={drama.id}
      style={styles.availableDramaItem}
      onPress={() => handleAddDrama(drama)}
    >
      <Image
        source={{
          uri: drama.poster_path
            ? `https://image.tmdb.org/t/p/w200${drama.poster_path}`
            : 'https://via.placeholder.com/200x300/333/fff?text=No+Image',
        }}
        style={styles.availablePoster}
        contentFit="cover"
      />
      
      <View style={styles.availableInfo}>
        <Text style={styles.availableTitle} numberOfLines={2}>
          {drama.name}
        </Text>
        <Text style={styles.availableYear}>
          {new Date(drama.first_air_date).getFullYear()}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddDrama(drama)}
      >
        <Plus size={20} color={COLORS.accent} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Editar Ranking',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <Save size={24} color={COLORS.accent} />
              )}
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleSection}>
            <Text style={styles.sectionLabel}>Título do Ranking</Text>
            <TextInput
              style={styles.titleInput}
              value={rankingTitle}
              onChangeText={setRankingTitle}
              placeholder="Digite o título do seu ranking"
              placeholderTextColor={COLORS.textSecondary}
              maxLength={50}
            />
          </View>

          <View style={styles.selectedSection}>
            <Text style={styles.sectionTitle}>
              Meu Top {selectedDramas.length > 0 ? selectedDramas.length : '10'} ({selectedDramas.length}/10)
            </Text>
            
            {selectedDramas.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Adicione doramas da sua lista &quot;Já Vi&quot; para criar seu ranking
                </Text>
              </View>
            ) : (
              <View style={styles.selectedList}>
                {selectedDramas.map(renderSelectedDrama)}
              </View>
            )}
          </View>

          <View style={styles.availableSection}>
            <Text style={styles.sectionTitle}>Doramas Concluídos</Text>
            
            <View style={styles.searchContainer}>
              <Search size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar doramas..."
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            
            <View style={styles.availableList}>
              {filteredDramas.map(renderAvailableDrama)}
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  titleSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  selectedList: {
    gap: 12,
  },
  selectedDramaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.background,
  },
  dramaPoster: {
    width: 50,
    height: 75,
    borderRadius: 8,
  },
  dramaInfo: {
    flex: 1,
  },
  dramaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  dramaYear: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  dramaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
  disabledButton: {
    opacity: 0.5,
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
  availableSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  availableList: {
    gap: 12,
  },
  availableDramaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  availablePoster: {
    width: 50,
    height: 75,
    borderRadius: 8,
  },
  availableInfo: {
    flex: 1,
  },
  availableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  availableYear: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  addButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
});

export default RankingEditScreen;