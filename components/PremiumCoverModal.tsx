import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { X, Crown, Star, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';

import { COLORS } from '@/constants/colors';

interface PremiumCoverModalProps {
  visible: boolean;
  onClose: () => void;
}

const PremiumCoverModal: React.FC<PremiumCoverModalProps> = ({
  visible,
  onClose,
}) => {
  const handleUpgrade = () => {
    onClose();
    router.push('/subscription');
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Crown size={48} color={COLORS.accent} />
              <View style={styles.sparkle1}>
                <Sparkles size={16} color={COLORS.accent} />
              </View>
              <View style={styles.sparkle2}>
                <Star size={12} color={COLORS.accent} />
              </View>
            </View>
            
            <Text style={styles.title}>Recurso Premium</Text>
            <Text style={styles.subtitle}>
              Personalize seu perfil com a capa do seu dorama favorito!
            </Text>
            
            <View style={styles.features}>
              <View style={styles.feature}>
                <Star size={16} color={COLORS.accent} />
                <Text style={styles.featureText}>Foto de capa personalizada</Text>
              </View>
              <View style={styles.feature}>
                <Star size={16} color={COLORS.accent} />
                <Text style={styles.featureText}>Acesso a milhares de imagens</Text>
              </View>
              <View style={styles.feature}>
                <Star size={16} color={COLORS.accent} />
                <Text style={styles.featureText}>Perfil único e exclusivo</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
              <Crown size={20} color={COLORS.background} />
              <Text style={styles.upgradeButtonText}>Assinar Premium</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterButtonText}>Talvez mais tarde</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  content: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  sparkle1: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  sparkle2: {
    position: 'absolute',
    bottom: -4,
    left: -12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  features: {
    width: '100%',
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  laterButton: {
    paddingVertical: 8,
  },
  laterButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default PremiumCoverModal;