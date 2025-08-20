import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { DRAMA_GENRES, getFilteredDramas } from '@/constants/onboarding';
import { useAuth } from '@/hooks/useAuth';

interface PreferencesStepProps {
  onComplete: () => void;
}

const { width } = Dimensions.get('window');
const posterWidth = (width - 72) / 3; // 3 columns with padding

export default function PreferencesStep({ onComplete }: PreferencesStepProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [lovedDramas, setLovedDramas] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { completeOnboarding } = useAuth();
  const filteredDramas = getFilteredDramas();

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genreId)) {
        return prev.filter(id => id !== genreId);
      } else {
        return [...prev, genreId];
      }
    });
  };

  const toggleDrama = (dramaId: number) => {
    setLovedDramas(prev => {
      if (prev.includes(dramaId)) {
        return prev.filter(id => id !== dramaId);
      } else {
        return [...prev, dramaId];
      }
    });
  };

  const canProceed = (): boolean => {
    return selectedGenres.length >= 3;
  };

  const handleComplete = async () => {
    if (!canProceed()) {
      console.log('Cannot proceed: need at least 3 genres selected');
      return;
    }

    console.log('Starting onboarding completion with:', {
      favoriteGenres: selectedGenres,
      lovedDramas
    });

    setIsLoading(true);
    
    try {
      const result = await completeOnboarding({
        favoriteGenres: selectedGenres,
        lovedDramas
      });
      
      console.log('Onboarding completion result:', result);
      
      if (result.success) {
        console.log('Onboarding successful, navigating to tabs');
        router.replace('/(tabs)');
      } else {
        console.error('Onboarding failed:', result.error);
      }
    } catch (error) {
      console.error('Error during onboarding completion:', error);
    }
    
    setIsLoading(false);
  };

  const handleSkip = async () => {
    console.log('Skipping preferences step');
    setIsLoading(true);
    
    try {
      const result = await completeOnboarding({
        favoriteGenres: [],
        lovedDramas: []
      });
      
      console.log('Skip onboarding result:', result);
      
      if (result.success) {
        console.log('Skip successful, navigating to tabs');
        router.replace('/(tabs)');
      } else {
        console.error('Skip failed:', result.error);
      }
    } catch (error) {
      console.error('Error during skip:', error);
    }
    
    setIsLoading(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Seus Gostos</Text>
        <Text style={styles.subtitle}>
          Ajude-nos a conhecer suas preferências para personalizar sua experiência
        </Text>

        {/* Genre Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecione pelo menos 3 gêneros favoritos</Text>
          <View style={styles.genreGrid}>
            {DRAMA_GENRES.map((genre, index) => {
              const isSelected = selectedGenres.includes(genre.id);
              return (
                <TouchableOpacity
                  key={`genre-${genre.id}-${index}`}
                  style={[styles.genreTag, isSelected && styles.genreTagSelected]}
                  onPress={() => toggleGenre(genre.id)}
                >
                  <Text style={[styles.genreText, isSelected && styles.genreTextSelected]}>
                    {genre.name}
                  </Text>
                  {isSelected && (
                    <Check size={16} color={COLORS.text} style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Popular Dramas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quais desses você já amou? (opcional)</Text>
          <Text style={styles.sectionSubtitle}>
            Toque nos doramas que você já assistiu e gostou
          </Text>
          <View style={styles.dramaGrid}>
            {filteredDramas.map((drama, index) => {
              const isSelected = lovedDramas.includes(drama.id);
              return (
                <TouchableOpacity
                  key={`drama-${drama.id}-${index}`}
                  style={[styles.dramaCard, isSelected && styles.dramaCardSelected]}
                  onPress={() => toggleDrama(drama.id)}
                >
                  <Image source={{ uri: `https://image.tmdb.org/t/p/w500${drama.poster_path}` }} style={styles.dramaPoster} />
                  {isSelected && (
                    <View style={styles.selectedOverlay}>
                      <Check size={24} color={COLORS.text} />
                    </View>
                  )}
                  <Text style={styles.dramaTitle} numberOfLines={2}>
                    {drama.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !canProceed() && styles.continueButtonDisabled]}
            onPress={handleComplete}
            disabled={!canProceed() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={[styles.continueButtonText, !canProceed() && styles.continueButtonTextDisabled]}>
                Finalizar
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isLoading}
          >
            <Text style={styles.skipButtonText}>Pular por agora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  genreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  genreTagSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  genreText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500' as const,
  },
  genreTextSelected: {
    color: COLORS.text,
  },
  checkIcon: {
    marginLeft: 4,
  },
  dramaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  dramaCard: {
    width: posterWidth,
    marginBottom: 8,
  },
  dramaCardSelected: {
    opacity: 0.8,
  },
  dramaPoster: {
    width: '100%',
    height: posterWidth * 1.5,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 4,
  },
  dramaTitle: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 16,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 24,
  },
  continueButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  continueButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  continueButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});