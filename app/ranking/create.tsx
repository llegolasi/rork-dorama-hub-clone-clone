import React, { useMemo, useState } from 'react';
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
import { ArrowLeft, Save, Plus, X, Search } from 'lucide-react-native';
import { router, Stack } from 'expo-router';

import { COLORS } from '@/constants/colors';
import type { Drama } from '@/types/drama';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';

interface CompletedDramaItem {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
  rating: number | null;
  completed_at: string;
}

interface RankingDrama {
  drama: CompletedDramaItem;
  rank: number;
}

export default function RankingCreateScreen() {
  const [rankingTitle, setRankingTitle] = useState<string>('Meu Top K-Dramas');
  const [rankingDescription, setRankingDescription] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDramas, setSelectedDramas] = useState<RankingDrama[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { user } = useAuth();

  const { data: completed, isLoading, isFetching, refetch, error } = trpc.users.getUserCompletedDramas.useQuery(
    { userId: user?.id ?? '00000000-0000-0000-0000-000000000000', limit: 50, offset: 0 },
    { enabled: !!user?.id }
  );

  const saveRankingMutation = trpc.rankings.saveRanking.useMutation({
    onSuccess: () => {
      Alert.alert('Ranking salvo!', 'Seu ranking foi criado com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível salvar o ranking. Tente novamente.');
    },
  });

  const availableDramas = useMemo<CompletedDramaItem[]>(() => {
    const list = (completed as CompletedDramaItem[] | undefined) ?? [];
    const filtered = list.filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedDramas.some((s) => s.drama.id === d.id)
    );
    return filtered;
  }, [completed, searchQuery, selectedDramas]);

  const handleAddDrama = (drama: CompletedDramaItem) => {
    if (selectedDramas.length >= 10) {
      Alert.alert('Limite atingido', 'Você pode adicionar no máximo 10 doramas ao seu ranking.');
      return;
    }
    const newRank = selectedDramas.length + 1;
    setSelectedDramas([...selectedDramas, { drama, rank: newRank }]);
    setSearchQuery('');
  };

  const handleRemoveDrama = (dramaId: number) => {
    const updated = selectedDramas
      .filter((i) => i.drama.id !== dramaId)
      .map((i, idx) => ({ ...i, rank: idx + 1 }));
    setSelectedDramas(updated);
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Erro', 'Você precisa estar logado para salvar um ranking.');
      return;
    }
    if (selectedDramas.length === 0) {
      Alert.alert('Ranking vazio', 'Adicione pelo menos um dorama ao seu ranking.');
      return;
    }
    setIsSaving(true);
    try {
      await saveRankingMutation.mutateAsync({
        title: rankingTitle.trim(),
        description: rankingDescription.trim() || undefined,
        items: selectedDramas.map((i) => ({
          dramaId: i.drama.id,
          dramaTitle: i.drama.name,
          posterImage: i.drama.poster_path ? `https://image.tmdb.org/t/p/w500${i.drama.poster_path}` : null,
          coverImage: null,
          dramaYear: i.drama.first_air_date ? new Date(i.drama.first_air_date).getFullYear() : null,
        })),
        isPublic: true,
      });
    } catch (e) {
      // handled by onError
    } finally {
      setIsSaving(false);
    }
  };

  const renderSelectedDrama = (item: RankingDrama) => (
    <View key={item.drama.id} style={styles.selectedDramaItem} testID={`selected-${item.drama.id}`}>
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
          {item.drama.first_air_date ? new Date(item.drama.first_air_date).getFullYear() : '—'}
        </Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveDrama(item.drama.id)}>
        <X size={16} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );

  const renderAvailableDrama = (drama: CompletedDramaItem) => (
    <TouchableOpacity
      key={drama.id}
      style={styles.availableDramaItem}
      onPress={() => handleAddDrama(drama)}
      testID={`available-${drama.id}`}
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
          {drama.first_air_date ? new Date(drama.first_air_date).getFullYear() : '—'}
        </Text>
      </View>
      <View style={styles.addButton}>
        <Plus size={20} color={COLORS.accent} />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Criar Ranking',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} testID="back-button">
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleSave} disabled={isSaving} testID="save-button">
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <Save size={24} color={COLORS.accent} />
              )}
            </TouchableOpacity>
          ),
          headerLargeTitle: false,
        }}
      />

      <View style={styles.container}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          testID="create-ranking-screen"
        >
          <View style={styles.titleSection}>
            <Text style={styles.sectionLabel}>Título do Ranking</Text>
            <TextInput
              style={styles.titleInput}
              value={rankingTitle}
              onChangeText={setRankingTitle}
              placeholder="Digite o título do seu ranking"
              placeholderTextColor={COLORS.textSecondary}
              maxLength={100}
              testID="title-input"
              returnKeyType="next"
            />
            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Descrição (opcional)</Text>
            <TextInput
              style={styles.descriptionInput}
              value={rankingDescription}
              onChangeText={setRankingDescription}
              placeholder="Conte um pouco sobre o seu ranking..."
              placeholderTextColor={COLORS.textSecondary}
              maxLength={500}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              testID="description-input"
              returnKeyType="done"
            />
          </View>

          <View style={styles.selectedSection}>
            <Text style={styles.sectionTitle}>
              Meu Top {selectedDramas.length > 0 ? selectedDramas.length : '10'} ({selectedDramas.length}/10)
            </Text>
            {selectedDramas.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Adicione doramas da sua lista &quot;Concluídos&quot; para criar seu ranking</Text>
              </View>
            ) : (
              <View style={styles.selectedList}>{selectedDramas.map(renderSelectedDrama)}</View>
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
                testID="search-input"
              />
              {(isLoading || isFetching) && <ActivityIndicator size="small" color={COLORS.accent} />}
            </View>

            {error ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Erro ao carregar sua lista. Tente atualizar.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} testID="retry-button">
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.availableList}>{availableDramas.map(renderAvailableDrama)}</View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
    paddingTop: 12,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
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
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },
  retryText: {
    color: COLORS.background,
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    marginTop: 6,
  },
});
