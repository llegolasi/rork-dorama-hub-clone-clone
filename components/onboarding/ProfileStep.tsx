import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Camera, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

interface ProfileStepProps {
  onComplete: () => void;
}

export default function ProfileStep({ onComplete }: ProfileStepProps) {
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { updateOnboardingData, onboardingData, completeOnboarding } = useAuth();

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false, // Don't include base64 to avoid memory issues
        exif: false, // Don't include EXIF data
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('Selected image asset:', {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          type: asset.type
        });
        setProfileImage(asset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const handleContinue = async () => {
    setIsLoading(true);
    
    try {
      const profileData = {
        displayName: displayName || onboardingData?.username || '',
        bio,
        profileImage: profileImage || undefined
      };
      
      console.log('ProfileStep - Saving profile data:', profileData);
      console.log('ProfileStep - Current onboarding data:', onboardingData);
      
      // Update onboarding data with profile info
      updateOnboardingData(profileData);
      
      setIsLoading(false);
      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erro', 'Falha ao atualizar perfil. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    
    try {
      const skipData = {
        displayName: onboardingData?.username || '',
        bio: '',
        profileImage: undefined
      };
      
      console.log('ProfileStep - Skipping with data:', skipData);
      console.log('ProfileStep - Current onboarding data:', onboardingData);
      
      // Update onboarding data with minimal profile info
      updateOnboardingData(skipData);
      
      setIsLoading(false);
      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erro', 'Falha ao atualizar perfil. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Personalize seu Perfil</Text>
        <Text style={styles.subtitle}>
          Adicione uma foto e conte um pouco sobre você para que outros fãs possam te conhecer melhor
        </Text>

        {/* Profile Image */}
        <View style={styles.imageContainer}>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera size={32} color={COLORS.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Adicionar Foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Display Name */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <User size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome de exibição (opcional)"
              placeholderTextColor={COLORS.textSecondary}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={30}
            />
          </View>
          <Text style={styles.helperText}>
            Este será o nome que aparece no seu perfil. Se deixar em branco, usaremos seu nome de usuário.
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
            style={styles.continueButton}
            onPress={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={styles.continueButtonText}>Continuar</Text>
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
    marginBottom: 40,
    lineHeight: 22,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imageButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
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
  continueButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
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