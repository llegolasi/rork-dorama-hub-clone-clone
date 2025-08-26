import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { DRAMA_GENRES } from '@/constants/onboarding';
import { useAuth } from '@/hooks/useAuth';

interface PreferencesStepProps {
  onComplete: () => void;
}

export default function PreferencesStep({ onComplete }: PreferencesStepProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { completeOnboarding } = useAuth();

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genreId)) {
        return prev.filter(id => id !== genreId);
      } else {
        return [...prev, genreId];
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
      lovedDramas: []
    });

    setIsLoading(true);
    
    try {
      const result = await completeOnboarding({
        favoriteGenres: selectedGenres,
        lovedDramas: []
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
                    <Check size={14} color={COLORS.text} style={styles.checkIcon} />
                  )}
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  genreTagSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  genreText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500' as const,
  },
  genreTextSelected: {
    color: COLORS.text,
  },
  checkIcon: {
    marginLeft: 4,
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

});