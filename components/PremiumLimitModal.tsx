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

export default function PremiumLimitModal({ 
  visible, 
  onClose, 
  onUpgrade, 
  swipesUsed, 
  dailyLimit 
}: PremiumLimitModalProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const contentWidth = Math.max(280, Math.min(screenWidth - 32, 520));
  
  // Handle Android back button
  React.useEffect(() => {
    if (Platform.OS === 'android' && visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true;
      });
      
      return () => backHandler.remove();
    }
  }, [visible, onClose]);
  
  // Prevent modal from showing if not visible
  if (!visible) {
    return null;
  }
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
      hardwareAccelerated={true}
      presentationStyle="overFullScreen"
      supportedOrientations={["portrait", "portrait-upside-down", "landscape", "landscape-left", "landscape-right"]}
    >
      <View style={styles.backdrop} testID="premium-limit-overlay" accessibilityLabel="premium-limit-overlay">
        <View
          style={[
            styles.modal,
            {
              maxHeight: screenHeight * 0.9,
              width: contentWidth,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                accessibilityRole="button"
                testID="premium-limit-close"
              >
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>

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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    alignSelf: 'center',
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    minHeight: 360,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    elevation: 6,
    shadowColor: COLORS.accent,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.background,
  },
  laterButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.card,
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  premiumFeatures: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});