import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { X, Check, Play, CheckCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { Drama } from '@/types/drama';
import { UserList } from '@/types/user';

interface EpisodeManagementModalProps {
  visible: boolean;
  onClose: () => void;
  drama: Drama;
  userListItem: UserList;
  onProgressUpdate: (newEpisode: number) => void;
  onComplete: () => void;
  onDataUpdated?: () => void;
}

export default function EpisodeManagementModal({
  visible,
  onClose,
  drama,
  userListItem,
  onProgressUpdate,
  onComplete,
  onDataUpdated,
}: EpisodeManagementModalProps) {
  const [selectedEpisode, setSelectedEpisode] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const totalEpisodes = userListItem.progress?.totalEpisodes || drama.episodes || 16;
  const currentEpisode = userListItem.progress?.currentEpisode || 0;
  // Calculate watched episodes based on current_episode (not used in render but kept for potential future use)
  // const watchedEpisodes = Array.from({ length: currentEpisode }, (_, i) => i + 1);

  // Reset selected episode when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedEpisode(currentEpisode + 1); // Default to next episode
    }
  }, [visible, currentEpisode]);

  const handleEpisodeUpdate = async () => {
    if (selectedEpisode > currentEpisode && selectedEpisode <= totalEpisodes) {
      setIsUpdating(true);
      try {
        await onProgressUpdate(selectedEpisode);
        if (onDataUpdated) {
          onDataUpdated();
        }
        onClose();
      } catch (error) {
        console.error('Error updating episode:', error);
        Alert.alert('Erro', 'Não foi possível atualizar o episódio. Tente novamente.');
      } finally {
        setIsUpdating(false);
      }
    } else if (selectedEpisode <= currentEpisode) {
      Alert.alert(
        'Episódio Inválido',
        'Você só pode marcar episódios posteriores ao atual como assistidos.'
      );
    } else {
      Alert.alert(
        'Episódio Inválido',
        'Selecione um episódio válido para atualizar.'
      );
    }
  };

  const handleCompleteAll = () => {
    Alert.alert(
      'Concluir Drama',
      `Tem certeza que deseja marcar "${drama.name}" como concluído? Isso irá marcar todos os ${totalEpisodes} episódios como assistidos e mover o drama para sua lista de concluídos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluir',
          style: 'default',
          onPress: async () => {
            setIsUpdating(true);
            try {
              await onComplete();
              if (onDataUpdated) {
                onDataUpdated();
              }
              onClose();
            } catch (error) {
              console.error('Error completing drama:', error);
              Alert.alert('Erro', 'Não foi possível concluir o drama. Tente novamente.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const renderEpisodeGrid = () => {
    const episodes = [];
    for (let i = 1; i <= totalEpisodes; i++) {
      const isWatched = i <= currentEpisode;
      const isSelected = i === selectedEpisode;
      const isAvailable = i > currentEpisode; // Can only select episodes after current
      
      episodes.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.episodeButton,
            isWatched && styles.episodeWatched,
            isSelected && styles.episodeSelected,
            !isAvailable && styles.episodeDisabled,
          ]}
          onPress={() => isAvailable ? setSelectedEpisode(i) : null}
          disabled={!isAvailable || isUpdating}
        >
          {isWatched ? (
            <CheckCircle size={16} color={COLORS.background} />
          ) : (
            <Text
              style={[
                styles.episodeButtonText,
                isSelected && styles.episodeSelectedText,
                !isAvailable && styles.episodeDisabledText,
              ]}
            >
              {i}
            </Text>
          )}
        </TouchableOpacity>
      );
    }
    return episodes;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gerenciar Episódios</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.dramaInfo}>
            <Text style={styles.dramaTitle} numberOfLines={2}>
              {drama.name}
            </Text>
            <Text style={styles.progressText}>
              Episódio {currentEpisode} de {totalEpisodes} assistidos
            </Text>
            <Text style={styles.progressText}>
              Tempo assistido: {Math.round((userListItem.progress?.totalWatchTimeMinutes || 0) / 60)} horas
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marcar Episódios como Assistidos</Text>
            <Text style={styles.sectionSubtitle}>
              Selecione até qual episódio você assistiu. Episódios com ✓ já foram marcados como assistidos.
            </Text>

            
            <View style={styles.episodeGrid}>
              {renderEpisodeGrid()}
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.updateButton,
                (selectedEpisode <= currentEpisode || isUpdating) && styles.updateButtonDisabled,
              ]}
              onPress={handleEpisodeUpdate}
              disabled={selectedEpisode <= currentEpisode || isUpdating}
            >
              <Text style={[
                styles.updateButtonText,
                (selectedEpisode <= currentEpisode || isUpdating) && styles.updateButtonTextDisabled,
              ]}>
                {isUpdating ? 'Atualizando...' : `Marcar até Ep. ${selectedEpisode}`}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
            
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                (currentEpisode >= totalEpisodes || isUpdating) && styles.quickActionButtonDisabled
              ]}
              onPress={() => setSelectedEpisode(currentEpisode + 1)}
              disabled={currentEpisode >= totalEpisodes || isUpdating}
            >
              <Play size={20} color={currentEpisode >= totalEpisodes ? COLORS.textSecondary : COLORS.accent} />
              <Text style={[
                styles.quickActionText,
                (currentEpisode >= totalEpisodes || isUpdating) && styles.quickActionTextDisabled
              ]}>
                Próximo Episódio ({currentEpisode + 1})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.completeAllButton,
                isUpdating && styles.completeAllButtonDisabled
              ]}
              onPress={handleCompleteAll}
              disabled={isUpdating}
            >
              <Check size={20} color={COLORS.background} />
              <Text style={styles.completeAllText}>
                {isUpdating ? 'Processando...' : 'Marcar como Concluído'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>


      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dramaInfo: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 20,
  },
  dramaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  episodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  episodeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeWatched: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  episodeSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.background,
  },
  episodeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  episodeWatchedText: {
    color: COLORS.background,
  },
  episodeDisabled: {
    backgroundColor: COLORS.border,
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  episodeDisabledText: {
    color: COLORS.textSecondary,
  },
  episodeSelectedText: {
    color: COLORS.accent,
  },
  quickActions: {
    marginBottom: 20,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  completeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#10B981',
    borderRadius: 12,
    gap: 8,
  },
  completeAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  updateButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  updateButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  selectionInfo: {
    backgroundColor: COLORS.accent + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  selectionText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
    textAlign: 'center',
  },
  quickActionButtonDisabled: {
    opacity: 0.5,
  },
  quickActionTextDisabled: {
    color: COLORS.textSecondary,
  },
  completeAllButtonDisabled: {
    opacity: 0.7,
  },
});