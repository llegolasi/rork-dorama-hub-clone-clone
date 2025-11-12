import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Eye, BookOpen, Check, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { ListType } from '@/types/user';

interface ListManagementModalProps {
  visible: boolean;
  onClose: () => void;
  currentList: ListType;
  onChangeList: (newList: ListType) => void;
  onRemove: () => void;
  dramaTitle?: string;
}

const { width } = Dimensions.get('window');

const LIST_OPTIONS = [
  { type: 'watching' as ListType, label: 'Assistindo', icon: Eye },
  { type: 'watchlist' as ListType, label: 'Quero Assistir', icon: BookOpen },
  { type: 'completed' as ListType, label: 'Completo', icon: Check },
];

export default function ListManagementModal({
  visible,
  onClose,
  currentList,
  onChangeList,
  onRemove,
  dramaTitle,
}: ListManagementModalProps) {
  const handleChangeList = (newList: ListType) => {
    if (newList !== currentList) {
      onChangeList(newList);
    }
    onClose();
  };

  const handleRemove = () => {
    onRemove();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
        )}
        
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Gerenciar Lista</Text>
                {dramaTitle && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {dramaTitle}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.optionsContainer}>
              <Text style={styles.sectionLabel}>Mover para:</Text>
              
              {LIST_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isCurrentList = option.type === currentList;
                
                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.optionButton,
                      isCurrentList && styles.currentListButton,
                    ]}
                    onPress={() => handleChangeList(option.type)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionLeft}>
                      <View style={[
                        styles.iconContainer,
                        isCurrentList && styles.iconContainerActive,
                      ]}>
                        <Icon 
                          size={20} 
                          color={isCurrentList ? COLORS.text : COLORS.accent} 
                        />
                      </View>
                      <Text style={[
                        styles.optionText,
                        isCurrentList && styles.optionTextActive,
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                    {isCurrentList && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Atual</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemove}
              activeOpacity={0.7}
            >
              <View style={styles.removeIconContainer}>
                <Trash2 size={20} color={COLORS.error} />
              </View>
              <Text style={styles.removeText}>Remover da Lista</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: Math.min(width - 40, 420),
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 24,
  },
  optionsContainer: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentListButton: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '15',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerActive: {
    backgroundColor: COLORS.accent,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  optionTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  currentBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.error + '10',
  },
  removeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  removeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.error,
    letterSpacing: 0.2,
  },
});
