import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Search, X } from 'lucide-react-native';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';
import { searchDramas } from '@/services/api';
import type { Drama } from '@/types/drama';



const CreatePostScreen = () => {
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [showDramaSearch, setShowDramaSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<Drama[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { user } = useAuth();

  // Create post mutation
  const createPostMutation = trpc.community.createPost.useMutation({
    onSuccess: () => {
      Alert.alert('Sucesso', 'Publicação criada com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (error: any) => {
      console.error('Error creating post:', error);
      Alert.alert('Erro', 'Não foi possível criar a publicação. Tente novamente.');
    }
  });

  // Search dramas with debounce
  useEffect(() => {
    const searchDramasDebounced = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchDramas(searchQuery);
        setSearchResults(results.slice(0, 10)); // Limit to 10 results
      } catch (error) {
        console.error('Error searching dramas:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchDramasDebounced, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Erro', 'Por favor, escreva algo para publicar.');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para criar uma publicação.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const postData: any = {
        content: content.trim(),
        postType: 'discussion' as const,
      };
      
      if (selectedDrama) {
        postData.mentionedDramaId = selectedDrama.id;
        postData.posterImage = selectedDrama.poster_path 
          ? `https://image.tmdb.org/t/p/w500${selectedDrama.poster_path}`
          : undefined;
        postData.dramaName = selectedDrama.name;
        postData.dramaYear = selectedDrama.first_air_date 
          ? new Date(selectedDrama.first_air_date).getFullYear()
          : undefined;
      }
      
      await createPostMutation.mutateAsync(postData);
    } catch (error) {
      console.error('Error submitting post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDramaSelect = (drama: Drama) => {
    setSelectedDrama(drama);
    setShowDramaSearch(false);
    setSearchQuery('');
  };

  const removeDrama = () => {
    setSelectedDrama(null);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Nova Publicação',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              style={[styles.submitButton, !content.trim() && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Text style={[styles.submitButtonText, !content.trim() && styles.submitButtonTextDisabled]}>
                  Publicar
                </Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="O que você está pensando sobre K-dramas?"
            placeholderTextColor={COLORS.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          
          <Text style={styles.characterCount}>
            {content.length}/500
          </Text>
        </View>

        {selectedDrama && (
          <View style={styles.selectedDrama}>
            <View style={styles.selectedDramaHeader}>
              <Text style={styles.selectedDramaTitle}>Dorama mencionado:</Text>
              <TouchableOpacity onPress={removeDrama}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.dramaCard}>
              <Image
                source={{
                  uri: selectedDrama.poster_path
                    ? `https://image.tmdb.org/t/p/w200${selectedDrama.poster_path}`
                    : 'https://via.placeholder.com/200x300/333/fff?text=No+Image',
                }}
                style={styles.dramaPoster}
              />
              <View style={styles.dramaInfo}>
                <Text style={styles.dramaName}>{selectedDrama.name}</Text>
                <Text style={styles.dramaYear}>
                  {selectedDrama.first_air_date ? new Date(selectedDrama.first_air_date).getFullYear() : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.mentionButton}
          onPress={() => setShowDramaSearch(true)}
        >
          <Search size={20} color={COLORS.accent} />
          <Text style={styles.mentionButtonText}>Mencionar Dorama</Text>
        </TouchableOpacity>

        {showDramaSearch && (
          <View style={styles.searchContainer}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>Buscar Dorama</Text>
              <TouchableOpacity onPress={() => setShowDramaSearch(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Digite o nome do dorama..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            <ScrollView style={styles.searchResults}>
              {isSearching ? (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color={COLORS.accent} />
                  <Text style={styles.searchLoadingText}>Buscando...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                searchResults.map((drama) => (
                  <TouchableOpacity
                    key={drama.id}
                    style={styles.dramaSearchItem}
                    onPress={() => handleDramaSelect(drama)}
                  >
                    <Image
                      source={{
                        uri: drama.poster_path
                          ? `https://image.tmdb.org/t/p/w200${drama.poster_path}`
                          : 'https://via.placeholder.com/200x300/333/fff?text=No+Image',
                      }}
                      style={styles.searchPoster}
                    />
                    <View style={styles.searchDramaInfo}>
                      <Text style={styles.searchDramaName}>{drama.name}</Text>
                      <Text style={styles.searchDramaYear}>
                        {drama.first_air_date ? new Date(drama.first_air_date).getFullYear() : 'N/A'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : searchQuery.trim() && !isSearching ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>Nenhum dorama encontrado</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  selectedDrama: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedDramaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDramaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dramaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dramaPoster: {
    width: 50,
    height: 75,
    borderRadius: 8,
  },
  dramaInfo: {
    flex: 1,
  },
  dramaName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  dramaYear: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  mentionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 20,
  },
  mentionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.accent,
  },
  searchContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  searchInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 12,
  },
  searchResults: {
    maxHeight: 200,
  },
  dramaSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  searchPoster: {
    width: 40,
    height: 60,
    borderRadius: 6,
  },
  searchDramaInfo: {
    flex: 1,
  },
  searchDramaName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  searchDramaYear: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.surface,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default CreatePostScreen;