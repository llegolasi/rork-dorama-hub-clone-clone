import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Search } from 'lucide-react-native';

import { COLORS } from '@/constants/colors';

interface Drama {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
}

interface CoverPhotoModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCover: (imageUrl: string) => void;
  isPremium: boolean;
}

const CoverPhotoModal: React.FC<CoverPhotoModalProps> = ({
  visible,
  onClose,
  onSelectCover,
  isPremium,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [dramaImages, setDramaImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState<boolean>(false);

  const searchDramas = async (query: string) => {
    if (!query.trim()) {
      setDramas([]);
      return;
    }

    setIsLoading(true);
    try {
      const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&language=pt-BR&page=1`,
        {
          headers: {
            Authorization: `Bearer ${TMDB_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filter for Korean dramas
        const koreanDramas = data.results.filter((drama: any) => 
          drama.origin_country?.includes('KR')
        );
        setDramas(koreanDramas.slice(0, 10));
      }
    } catch (error) {
      console.error('Error searching dramas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDramaImages = async (drama: Drama) => {
    setSelectedDrama(drama);
    setLoadingImages(true);
    
    try {
      const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
      const response = await fetch(
        `https://api.themoviedb.org/3/tv/${drama.id}/images`,
        {
          headers: {
            Authorization: `Bearer ${TMDB_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const images: string[] = [];
        
        // Add backdrop images (landscape)
        if (data.backdrops) {
          data.backdrops.slice(0, 6).forEach((img: any) => {
            images.push(`https://image.tmdb.org/t/p/w1280${img.file_path}`);
          });
        }
        
        // Add poster if available
        if (drama.poster_path) {
          images.push(`https://image.tmdb.org/t/p/w500${drama.poster_path}`);
        }
        
        // Add backdrop if available
        if (drama.backdrop_path) {
          images.push(`https://image.tmdb.org/t/p/w1280${drama.backdrop_path}`);
        }
        
        setDramaImages(images);
      }
    } catch (error) {
      console.error('Error fetching drama images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    onSelectCover(imageUrl);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setDramas([]);
    setSelectedDrama(null);
    setDramaImages([]);
    onClose();
  };

  const renderDramaItem = ({ item }: { item: Drama }) => (
    <TouchableOpacity
      style={styles.dramaItem}
      onPress={() => fetchDramaImages(item)}
    >
      <Image
        source={{
          uri: item.poster_path
            ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
            : 'https://via.placeholder.com/200x300/333/fff?text=No+Image',
        }}
        style={styles.dramaPoster}
        contentFit="cover"
      />
      <View style={styles.dramaInfo}>
        <Text style={styles.dramaTitle} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.dramaYear}>
          {item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderImageItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.imageItem}
      onPress={() => handleSelectImage(item)}
    >
      <Image
        source={{ uri: item }}
        style={styles.coverImage}
        contentFit="cover"
      />
    </TouchableOpacity>
  );

  if (!isPremium) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Recurso Premium</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.premiumContent}>
              <Text style={styles.premiumTitle}>🌟 Personalize seu Perfil</Text>
              <Text style={styles.premiumText}>
                A foto de capa personalizada é um recurso exclusivo para usuários Premium.
                Assine agora e tenha acesso a este e outros recursos incríveis!
              </Text>
              
              <TouchableOpacity style={styles.upgradeButton} onPress={onClose}>
                <Text style={styles.upgradeButtonText}>Assinar Premium</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {selectedDrama ? 'Escolher Imagem' : 'Selecionar Foto de Capa'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {!selectedDrama ? (
            <>
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Search size={20} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Pesquisar dorama..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      searchDramas(text);
                    }}
                  />
                </View>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                    <Text style={styles.loadingText}>Buscando doramas...</Text>
                  </View>
                ) : dramas.length > 0 ? (
                  <FlatList
                    data={dramas}
                    renderItem={renderDramaItem}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                ) : searchQuery.trim() ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Nenhum dorama encontrado para &quot;{searchQuery}&quot;
                    </Text>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Digite o nome de um dorama para começar a busca
                    </Text>
                  </View>
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <View style={styles.selectedDramaHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setSelectedDrama(null);
                    setDramaImages([]);
                  }}
                >
                  <Text style={styles.backButtonText}>← Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.selectedDramaTitle}>{selectedDrama.name}</Text>
              </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {loadingImages ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                    <Text style={styles.loadingText}>Carregando imagens...</Text>
                  </View>
                ) : dramaImages.length > 0 ? (
                  <FlatList
                    data={dramaImages}
                    renderItem={renderImageItem}
                    keyExtractor={(item, index) => index.toString()}
                    numColumns={2}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    columnWrapperStyle={styles.imageRow}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      Nenhuma imagem disponível para este dorama
                    </Text>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    minHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  dramaItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  dramaPoster: {
    width: 60,
    height: 90,
    borderRadius: 8,
    marginRight: 12,
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
  selectedDramaHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '500',
  },
  selectedDramaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  imageRow: {
    justifyContent: 'space-between',
  },
  imageItem: {
    width: '48%',
    marginBottom: 12,
  },
  coverImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  premiumContent: {
    padding: 24,
    alignItems: 'center',
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  premiumText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
});

export default CoverPhotoModal;