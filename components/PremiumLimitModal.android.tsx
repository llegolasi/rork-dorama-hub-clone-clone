import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, useWindowDimensions, BackHandler, ScrollView } from 'react-native';
import { Crown, Heart, X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

interface PremiumLimitModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  swipesUsed: number;
  dailyLimit: number;
}

export default function PremiumLimitModalAndroid({
  visible,
  onClose,
  onUpgrade,
  swipesUsed,
  dailyLimit,
}: PremiumLimitModalProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const contentWidth = Math.max(280, Math.min(screenWidth - 24, 520));

  React.useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true;
      });
      return () => sub.remove();
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      hardwareAccelerated
      statusBarTranslucent
      presentationStyle="overFullScreen"
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
    >
      <View style={styles.backdrop} testID="premium-limit-overlay" accessibilityLabel="premium-limit-overlay">
        <View
          style={[
            styles.sheet,
            {
              maxHeight: screenHeight * 0.92,
              width: contentWidth,
            },
          ]}
          testID="premium-limit-container"
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            testID="premium-limit-close"
          >
            <X size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.content}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.iconContainer}>
              <Heart size={48} color={COLORS.accent} />
            </View>

            <Text style={styles.title} testID="premium-limit-title">Swipes Esgotados!</Text>

            <Text style={styles.description}>
              Você usou todos os seus {dailyLimit} swipes de hoje. Volte amanhã para descobrir mais K-dramas ou assine o Dorama Hub+ para swipes ilimitados!
            </Text>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{swipesUsed}</Text>
                <Text style={styles.statLabel}>Swipes Hoje</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyLimit}</Text>
                <Text style={styles.statLabel}>Limite Diário</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={onUpgrade}
              accessibilityRole="button"
              testID="premium-limit-upgrade"
            >
              <Crown size={20} color={COLORS.background} />
              <Text style={styles.upgradeButtonText}>Assinar Dorama Hub+</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterButton} onPress={onClose} testID="premium-limit-later">
              <Text style={styles.laterButtonText}>Voltar Amanhã</Text>
            </TouchableOpacity>

            <View style={styles.premiumFeatures}>
              <Text style={styles.featuresTitle}>Com Dorama Hub+:</Text>
              <View style={styles.featuresList}>
                <Text style={styles.featureItem}>• Swipes ilimitados</Text>
                <Text style={styles.featureItem}>• Sem anúncios</Text>
                <Text style={styles.featureItem}>• Recursos exclusivos</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 8,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 12,
    width: '100%',
    justifyContent: 'center',
    gap: 8,
    minHeight: 52,
    elevation: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.background,
  },
  laterButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.card,
    width: '100%',
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  premiumFeatures: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  featuresList: {
    gap: 6,
  },
  featureItem: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
});