import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { User } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

interface ProfileInfoStepProps {
  onComplete: () => void;
}

export default function ProfileInfoStep({ onComplete }: ProfileInfoStepProps) {
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { updateOnboardingData } = useAuth();

  const canProceed = (): boolean => {
    return displayName.trim().length > 0;
  };

  const handleContinue = async () => {
    if (!canProceed()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const profileData = {
        displayName: displayName.trim(),
        bio
      };
      
      console.log('ProfileInfoStep - Saving profile info:', profileData);
      
      updateOnboardingData(profileData);
      
      setIsLoading(false);
      onComplete();
    } catch (error) {
      console.error('Error updating profile info:', error);
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete seu Perfil</Text>
        <Text style={styles.subtitle}>
          Adicione seu nome de exibição e conte um pouco sobre você
        </Text>

        {/* Display Name */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <User size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome de exibição"
              placeholderTextColor={COLORS.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={30}
            />
          </View>
          <Text style={styles.helperText}>
            Este será o nome que aparece no seu perfil.
          </Text>
        </View>

        {/* Bio */}
        <View style={styles.inputContainer}>
          <View style={[styles.inputWrapper, styles.bioWrapper]}>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Conte um pouco sobre você... (opcional)"
              placeholderTextColor={COLORS.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={150}
              textAlignVertical="top"
            />
          </View>
          <Text style={styles.characterCount}>
            {bio.length}/150 caracteres
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, !canProceed() && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!canProceed() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={[styles.continueButtonText, !canProceed() && styles.continueButtonTextDisabled]}>Continuar</Text>
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
    marginBottom: 40,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  bioWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  bioInput: {
    minHeight: 80,
    paddingTop: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
    lineHeight: 16,
  },
  characterCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
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