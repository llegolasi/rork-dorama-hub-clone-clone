import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Palette, Crown, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { PROFILE_THEMES, PROFILE_BORDERS } from '@/constants/achievements';

interface ProfileCustomizationProps {
  currentTheme: string;
  currentBorder: string;
  isPremium: boolean;
  onThemeChange: (themeId: string) => void;
  onBorderChange: (borderId: string) => void;
}

export default function ProfileCustomization({
  currentTheme,
  currentBorder,
  isPremium,
  onThemeChange,
  onBorderChange,
}: ProfileCustomizationProps) {
  const [activeSection, setActiveSection] = useState<'themes' | 'borders'>('themes');

  const handleThemeSelect = (themeId: string) => {
    if (!isPremium && themeId !== 'default') {
      Alert.alert(
        'Recurso Premium',
        'Assine o Dorama Hub+ para personalizar seu perfil com temas exclusivos!',
        [{ text: 'OK' }]
      );
      return;
    }
    onThemeChange(themeId);
  };

  const handleBorderSelect = (borderId: string) => {
    if (!isPremium && borderId !== 'default') {
      Alert.alert(
        'Recurso Premium',
        'Assine o Dorama Hub+ para usar bordas exclusivas no seu perfil!',
        [{ text: 'OK' }]
      );
      return;
    }
    onBorderChange(borderId);
  };

  const renderThemeOption = (theme: typeof PROFILE_THEMES[0]) => {
    const isSelected = currentTheme === theme.id;
    const isLocked = !isPremium && theme.id !== 'default';

    return (
      <TouchableOpacity
        key={theme.id}
        style={[
          styles.themeOption,
          isSelected && styles.selectedOption,
          isLocked && styles.lockedOption,
        ]}
        onPress={() => handleThemeSelect(theme.id)}
      >
        <View style={[styles.themePreview, { backgroundColor: theme.color }]}>
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Crown size={16} color="#FDCB6E" />
            </View>
          )}
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <Check size={16} color={COLORS.background} />
            </View>
          )}
        </View>
        <Text style={[
          styles.optionName,
          isLocked && styles.lockedText
        ]}>
          {theme.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBorderOption = (border: typeof PROFILE_BORDERS[0]) => {
    const isSelected = currentBorder === border.id;
    const isLocked = !isPremium && border.id !== 'default';

    return (
      <TouchableOpacity
        key={border.id}
        style={[
          styles.borderOption,
          isSelected && styles.selectedOption,
          isLocked && styles.lockedOption,
        ]}
        onPress={() => handleBorderSelect(border.id)}
      >
        <View style={styles.borderPreview}>
          <Text style={styles.borderEmoji}>{border.preview}</Text>
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Crown size={12} color="#FDCB6E" />
            </View>
          )}
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <Check size={12} color={COLORS.background} />
            </View>
          )}
        </View>
        <Text style={[
          styles.optionName,
          isLocked && styles.lockedText
        ]}>
          {border.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Palette size={24} color={COLORS.accent} />
        <Text style={styles.title}>Personalização do Perfil</Text>
      </View>

      {!isPremium && (
        <View style={styles.premiumNotice}>
          <Crown size={20} color="#FDCB6E" />
          <Text style={styles.premiumNoticeText}>
            Assine o Dorama Hub+ para desbloquear temas e bordas exclusivas
          </Text>
        </View>
      )}

      <View style={styles.sectionTabs}>
        <TouchableOpacity
          style={[
            styles.sectionTab,
            activeSection === 'themes' && styles.activeSectionTab
          ]}
          onPress={() => setActiveSection('themes')}
        >
          <Text style={[
            styles.sectionTabText,
            activeSection === 'themes' && styles.activeSectionTabText
          ]}>
            Temas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sectionTab,
            activeSection === 'borders' && styles.activeSectionTab
          ]}
          onPress={() => setActiveSection('borders')}
        >
          <Text style={[
            styles.sectionTabText,
            activeSection === 'borders' && styles.activeSectionTabText
          ]}>
            Bordas
          </Text>
        </TouchableOpacity>
      </View>

      {activeSection === 'themes' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temas de Perfil</Text>
          <Text style={styles.sectionDescription}>
            Personalize a cor de destaque do seu perfil
          </Text>
          <View style={styles.optionsGrid}>
            {PROFILE_THEMES.map(renderThemeOption)}
          </View>
        </View>
      )}

      {activeSection === 'borders' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bordas de Perfil</Text>
          <Text style={styles.sectionDescription}>
            Adicione uma borda especial à sua foto de perfil
          </Text>
          <View style={styles.optionsGrid}>
            {PROFILE_BORDERS.map(renderBorderOption)}
          </View>
        </View>
      )}

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Prévia do Perfil</Text>
        <View style={styles.profilePreview}>
          <View style={[
            styles.previewImageContainer,
            { borderColor: PROFILE_THEMES.find(t => t.id === currentTheme)?.color || COLORS.accent }
          ]}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face' }}
              style={styles.previewImage}
              contentFit="cover"
            />
            <View style={styles.borderIndicator}>
              <Text style={styles.borderIndicatorText}>
                {PROFILE_BORDERS.find(b => b.id === currentBorder)?.preview}
              </Text>
            </View>
          </View>
          <Text style={styles.previewName}>Seu Nome</Text>
          <Text style={[
            styles.previewUsername,
            { color: PROFILE_THEMES.find(t => t.id === currentTheme)?.color || COLORS.accent }
          ]}>
            @seu_usuario
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  premiumNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDCB6E' + '20',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
  },
  premiumNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#FDCB6E',
    fontWeight: '500',
    lineHeight: 20,
  },
  sectionTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeSectionTab: {
    backgroundColor: COLORS.accent,
  },
  sectionTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeSectionTabText: {
    color: COLORS.background,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeOption: {
    alignItems: 'center',
    width: '30%',
  },
  borderOption: {
    alignItems: 'center',
    width: '30%',
  },
  selectedOption: {
    opacity: 1,
  },
  lockedOption: {
    opacity: 0.6,
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.card,
    marginBottom: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderEmoji: {
    fontSize: 24,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background + 'CC',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.accent + 'CC',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionName: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  lockedText: {
    color: COLORS.textSecondary,
  },
  preview: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
  },
  profilePreview: {
    alignItems: 'center',
  },
  previewImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  borderIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderIndicatorText: {
    fontSize: 12,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  previewUsername: {
    fontSize: 14,
    fontWeight: '500',
  },
});