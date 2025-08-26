import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { Camera, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';

interface ProfileStepProps {
  onComplete: () => void;
}

interface Avatar {
  id: string;
  name: string;
  url: string;
}

export default function ProfileStep({ onComplete }: ProfileStepProps) {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { updateOnboardingData } = useAuth();
  
  const avatarsQuery = trpc.users.getProfileAvatars.useQuery();
  const avatars = avatarsQuery.data || [];

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
        base64: false,
        exif: false,
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
        setSelectedAvatar(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const selectAvatar = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    setProfileImage(null);
  };

  const getSelectedImageUri = () => {
    return profileImage || selectedAvatar;
  };

  const handleContinue = async () => {
    const selectedImageUri = getSelectedImageUri();
    
    if (!selectedImageUri) {
      Alert.alert('Foto obrigatória', 'Por favor, selecione uma foto de perfil ou escolha um avatar.');
      return;
    }

    setIsLoading(true);
    
    try {
      const profileData = {
        profileImage: selectedImageUri
      };
      
      console.log('ProfilePhotoStep - Saving profile photo:', profileData);
      
      updateOnboardingData(profileData);
      
      setIsLoading(false);
      onComplete();
    } catch (error) {
      console.error('Error updating profile photo:', error);
      Alert.alert('Erro', 'Falha ao salvar foto de perfil. Tente novamente.');
      setIsLoading(false);
    }
  };

  const renderAvatarItem = ({ item }: { item: Avatar }) => (
    <TouchableOpacity
      style={[
        styles.avatarItem,
        selectedAvatar === item.url && styles.selectedAvatarItem
      ]}
      onPress={() => selectAvatar(item.url)}
    >
      <Image source={{ uri: item.url }} style={styles.avatarImage} />
      {selectedAvatar === item.url && (
        <View style={styles.selectedOverlay}>
          <View style={styles.selectedIndicator} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.title}>Escolha sua Foto de Perfil</Text>
        <Text style={styles.subtitle}>
          Selecione uma foto da sua galeria ou escolha um dos nossos avatares
        </Text>

        {/* Profile Image */}
        <View style={styles.imageContainer}>
          <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
            {getSelectedImageUri() ? (
              <Image source={{ uri: getSelectedImageUri()! }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera size={32} color={COLORS.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Adicionar Foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Custom Photo Button */}
        <TouchableOpacity style={styles.customPhotoButton} onPress={pickImage}>
          <Plus size={16} color={COLORS.accent} />
          <Text style={styles.customPhotoText}>Usar foto da galeria</Text>
        </TouchableOpacity>

        {/* Avatars Section */}
        <View style={styles.avatarsSection}>
          <Text style={styles.avatarsTitle}>Ou escolha um avatar:</Text>
          
          {avatarsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
              <Text style={styles.loadingText}>Carregando avatares...</Text>
            </View>
          ) : avatars.length > 0 ? (
            <FlatList
              data={avatars}
              renderItem={renderAvatarItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarsList}
            />
          ) : (
            <Text style={styles.noAvatarsText}>Nenhum avatar disponível</Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !getSelectedImageUri() && styles.disabledButton
            ]}
            onPress={handleContinue}
            disabled={isLoading || !getSelectedImageUri()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Text style={[
                styles.continueButtonText,
                !getSelectedImageUri() && styles.disabledButtonText
              ]}>Continuar</Text>
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
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
  customPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 8,
  },
  customPhotoText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  avatarsSection: {
    marginBottom: 32,
  },
  avatarsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  noAvatarsText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  avatarsList: {
    paddingHorizontal: 8,
  },
  avatarItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginHorizontal: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedAvatarItem: {
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
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
  disabledButton: {
    backgroundColor: COLORS.border,
  },
  continueButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  disabledButtonText: {
    color: COLORS.textSecondary,
  },
});