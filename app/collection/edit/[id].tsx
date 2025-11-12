import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Image as RNImage,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { X, Upload, Search, GripVertical, Trash2, Plus, Save } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { trpc } from '@/lib/trpc';
import DramaCard from '@/components/DramaCard';

const { width } = Dimensions.get('window');

interface DramaSearchResult {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
}

export default function EditCollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDramaSearch, setShowDramaSearch] = useState(false);
  const [dramaOrder, setDramaOrder] = useState<Array<{
    id: string;
    drama_id: number;
    drama_title: string;
    drama_poster_url: string | null;
    display_order: number;
  }>>([]);

  const { data: collection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ['collection-edit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_collections')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setTitle(data.title);
      setDescription(data.description || '');
      setIsVisible(data.is_visible);
      setCoverImage(data.cover_image_url);
      
      return data;
    },
    enabled: !!id,
  });

  const { data: collectionDramas, isLoading: isLoadingDramas } = useQuery({
    queryKey: ['collection-dramas-edit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_collection_dramas')
        .select('*')
        .eq('collection_id', id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      
      setDramaOrder(data);
      return data;
    },
    enabled: !!id,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['drama-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      
      const response = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${process.env.EXPO_PUBLIC_TMDB_API_KEY}&language=pt-BR&query=${encodeURIComponent(searchQuery)}&page=1`
      );
      
      const result = await response.json();
      return result.results as DramaSearchResult[];
    },
    enabled: searchQuery.length > 2,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('custom_collections')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          is_visible: isVisible,
          cover_image_url: coverImage,
        })
        .eq('id', id);

      if (error) throw error;

      for (let i = 0; i < dramaOrder.length; i++) {
        const drama = dramaOrder[i];
        const { error: dramaError } = await supabase
          .from('custom_collection_dramas')
          .update({ display_order: i })
          .eq('id', drama.id);
        
        if (dramaError) throw dramaError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-collections'] });
      Alert.alert('Sucesso', 'Coleção atualizada com sucesso!');
      router.back();
    },
    onError: (error) => {
      console.error('Error updating collection:', error);
      Alert.alert('Erro', 'Falha ao atualizar coleção');
    },
  });

  const addDramaMutation = useMutation({
    mutationFn: async (drama: DramaSearchResult) => {
      const nextOrder = dramaOrder.length;
      const { data, error } = await supabase
        .from('custom_collection_dramas')
        .insert({
          collection_id: id,
          drama_id: drama.id,
          drama_title: drama.name,
          drama_poster_url: drama.poster_path,
          drama_year: drama.first_air_date ? new Date(drama.first_air_date).getFullYear() : null,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setDramaOrder([...dramaOrder, data]);
      setSearchQuery('');
      setShowDramaSearch(false);
      queryClient.invalidateQueries({ queryKey: ['collection-dramas-edit', id] });
    },
    onError: (error: any) => {
      console.error('Error adding drama:', error);
      if (error.message.includes('duplicate')) {
        Alert.alert('Aviso', 'Este drama já está na coleção');
      } else {
        Alert.alert('Erro', 'Falha ao adicionar drama');
      }
    },
  });

  const removeDramaMutation = useMutation({
    mutationFn: async (dramaId: string) => {
      const { error } = await supabase
        .from('custom_collection_dramas')
        .delete()
        .eq('id', dramaId);

      if (error) throw error;
    },
    onSuccess: (_, dramaId) => {
      setDramaOrder(dramaOrder.filter(d => d.id !== dramaId));
      queryClient.invalidateQueries({ queryKey: ['collection-dramas-edit', id] });
    },
    onError: (error) => {
      console.error('Error removing drama:', error);
      Alert.alert('Erro', 'Falha ao remover drama');
    },
  });

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão Necessária', 'É necessário permissão para acessar a galeria');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Falha ao selecionar imagem');
    }
  };

  const moveDramaUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...dramaOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setDramaOrder(newOrder);
  };

  const moveDramaDown = (index: number) => {
    if (index === dramaOrder.length - 1) return;
    const newOrder = [...dramaOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setDramaOrder(newOrder);
  };

  if (isLoadingCollection || isLoadingDramas) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Editar Coleção',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !title.trim()}
              style={styles.saveButton}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <Save size={22} color={COLORS.accent} />
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome da coleção"
            placeholderTextColor={COLORS.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descrição da coleção"
            placeholderTextColor={COLORS.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Coleção Visível</Text>
              <Text style={styles.switchDescription}>
                Exibir esta coleção na página inicial
              </Text>
            </View>
            <Switch
              value={isVisible}
              onValueChange={setIsVisible}
              trackColor={{ false: COLORS.surface, true: COLORS.accent }}
              thumbColor={COLORS.text}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Imagem de Capa</Text>
          
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Upload size={24} color={COLORS.accent} />
            <Text style={styles.uploadButtonText}>
              {coverImage ? 'Alterar Imagem' : 'Fazer Upload de Imagem'}
            </Text>
          </TouchableOpacity>

          {coverImage && (
            <View style={styles.coverPreview}>
              <Image
                source={{ uri: coverImage }}
                style={styles.coverImage}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.removeCoverButton}
                onPress={() => setCoverImage(null)}
              >
                <X size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Dramas ({dramaOrder.length})
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowDramaSearch(!showDramaSearch)}
            >
              {showDramaSearch ? (
                <X size={20} color={COLORS.accent} />
              ) : (
                <Plus size={20} color={COLORS.accent} />
              )}
            </TouchableOpacity>
          </View>

          {showDramaSearch && (
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Search size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar dramas..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {isSearching && (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                </View>
              )}

              {searchResults && searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.slice(0, 5).map((drama) => (
                    <TouchableOpacity
                      key={drama.id}
                      style={styles.searchResultItem}
                      onPress={() => addDramaMutation.mutate(drama)}
                      disabled={addDramaMutation.isPending}
                    >
                      <Image
                        source={{
                          uri: drama.poster_path
                            ? `https://image.tmdb.org/t/p/w92${drama.poster_path}`
                            : 'https://via.placeholder.com/92x138',
                        }}
                        style={styles.searchResultPoster}
                        contentFit="cover"
                      />
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultTitle} numberOfLines={2}>
                          {drama.name}
                        </Text>
                        {drama.first_air_date && (
                          <Text style={styles.searchResultYear}>
                            {new Date(drama.first_air_date).getFullYear()}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.dramaList}>
            {dramaOrder.map((drama, index) => (
              <View key={drama.id} style={styles.dramaItem}>
                <View style={styles.dramaItemContent}>
                  <Image
                    source={{
                      uri: drama.drama_poster_url
                        ? `https://image.tmdb.org/t/p/w92${drama.drama_poster_url}`
                        : 'https://via.placeholder.com/92x138',
                    }}
                    style={styles.dramaItemPoster}
                    contentFit="cover"
                  />
                  <View style={styles.dramaItemInfo}>
                    <Text style={styles.dramaItemTitle} numberOfLines={2}>
                      {drama.drama_title}
                    </Text>
                    <Text style={styles.dramaItemOrder}>
                      Posição: {index + 1}
                    </Text>
                  </View>
                </View>

                <View style={styles.dramaItemActions}>
                  <TouchableOpacity
                    style={styles.orderButton}
                    onPress={() => moveDramaUp(index)}
                    disabled={index === 0}
                  >
                    <GripVertical
                      size={20}
                      color={index === 0 ? COLORS.textSecondary : COLORS.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.orderButton}
                    onPress={() => moveDramaDown(index)}
                    disabled={index === dramaOrder.length - 1}
                  >
                    <GripVertical
                      size={20}
                      color={index === dramaOrder.length - 1 ? COLORS.textSecondary : COLORS.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert(
                        'Remover Drama',
                        'Tem certeza que deseja remover este drama da coleção?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Remover',
                            style: 'destructive',
                            onPress: () => removeDramaMutation.mutate(drama.id),
                          },
                        ]
                      );
                    }}
                    disabled={removeDramaMutation.isPending}
                  >
                    <Trash2 size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {dramaOrder.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Nenhum drama adicionado ainda
                </Text>
              </View>
            )}
          </View>
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
  content: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  saveButton: {
    padding: 8,
    marginRight: 8,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  switchDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
  },
  coverPreview: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.card,
  },
  removeCoverButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.background + 'CC',
    borderRadius: 20,
    padding: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  searchLoading: {
    padding: 20,
    alignItems: 'center',
  },
  searchResults: {
    marginTop: 12,
    gap: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchResultPoster: {
    width: 50,
    height: 75,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  searchResultInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  searchResultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  searchResultYear: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dramaList: {
    gap: 12,
  },
  dramaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dramaItemContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  dramaItemPoster: {
    width: 50,
    height: 75,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  dramaItemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  dramaItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  dramaItemOrder: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dramaItemActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  orderButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
