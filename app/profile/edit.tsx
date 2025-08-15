import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { 
  ArrowLeft, 
  Camera, 
  User,
  FileText
} from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

const EditProfileScreen = () => {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      console.log('Loading user data:', user);
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setProfileImage(user.profileImage || '');
    }
  }, [user]);

  // Track changes
  useEffect(() => {
    if (user) {
      const nameChanged = displayName !== (user.displayName || '');
      const bioChanged = bio !== (user.bio || '');
      const imageChanged = profileImage !== (user.profileImage || '');
      setHasChanges(nameChanged || bioChanged || imageChanged);
    }
  }, [displayName, bio, profileImage, user]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome de exibição.');
      return;
    }

    if (!hasChanges) {
      Alert.alert('Nenhuma alteração', 'Não há alterações para salvar.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Saving profile with data:', {
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        profileImage: profileImage || undefined
      });

      const result = await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        profileImage: profileImage || undefined
      });

      if (result.success) {
        Alert.alert(
          'Perfil atualizado!',
          'Suas informações foram salvas com sucesso.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Erro', result.error || 'Falha ao atualizar perfil.');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para alterar a foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('Selected image:', asset.uri);
      setProfileImage(asset.uri);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.fieldLabel}>Carregando...</Text>
      </View>
    );
  }



  return (
    <>
      <Stack.Screen
        options={{
          title: 'Editar Perfil',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),

        }}
      />
      
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        {/* Profile Image Section */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: profileImage || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face' }}
              style={styles.profileImage}
              contentFit="cover"
            />
            <TouchableOpacity style={styles.cameraButton} onPress={handleImagePicker}>
              <Camera size={20} color={COLORS.background} />
            </TouchableOpacity>
          </View>
          <Text style={styles.imageHint}>Toque no ícone para alterar sua foto</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <User size={20} color={COLORS.textSecondary} />
              <Text style={styles.fieldLabel}>Nome de exibição *</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Seu nome completo"
              placeholderTextColor={COLORS.textSecondary}
              maxLength={50}
            />
          </View>


          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <FileText size={20} color={COLORS.textSecondary} />
              <Text style={styles.fieldLabel}>Bio</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Conte um pouco sobre você e seus gostos..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              maxLength={150}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{bio.length}/150</Text>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              (isLoading || !hasChanges) && styles.saveButtonDisabled
            ]} 
            onPress={handleSave}
            disabled={isLoading || !hasChanges}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Salvando...' : 'Salvar alterações'}
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.accent,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  imageHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formSection: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  bioInput: {
    height: 100,
    paddingTop: 14,
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },

  buttonSection: {
    padding: 20,
    paddingTop: 0,
  },
  saveButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProfileScreen;