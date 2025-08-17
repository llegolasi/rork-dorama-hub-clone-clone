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
import { trpc } from '@/lib/trpc';

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
  // Use episodes_watched as the primary field (episodes_watched is the main field now)
  const episodesWatched = userListItem.episodes_watched || userListItem.progress?.episodesWatched || userListItem.progress?.currentEpisode || 0;

  // Reset selected episode when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedEpisode(episodesWatched + 1); // Default to next episode
    }
  }, [visible, episodesWatched]);

  const markEpisodeMutation = trpc.users.markEpisodeWatched.useMutation({
    onSuccess: () => {
      if (onDataUpdated) {
        onDataUpdated();
      }
      // Removed notification to avoid spam when marking multiple episodes
    },
    onError: (error) => {
      Alert.alert('Erro', `Falha ao marcar episódio: ${error.message}`);
    },
  });

  const handleEpisodeUpdate = async () => {
    if (selectedEpisode > episodesWatched && selectedEpisode <= totalEpisodes) {
      setIsUpdating(true);
      try {
        console.log(`Marking episodes 1 to ${selectedEpisode} as watched for drama ${drama.id}`);
        
        // Mark all episodes from 1 to selectedEpisode as watched
        for (let ep = episodesWatched + 1; ep <= selectedEpisode; ep++) {
          await markEpisodeMutation.mutateAsync({
            dramaId: drama.id,
            episodeNumber: ep,
            episodeDurationMinutes: 60, // Default duration
          });
        }
        
        // Also call the legacy update for compatibility
        await onProgressUpdate(selectedEpisode);
        
        // Force refresh data after update
        if (onDataUpdated) {
          await onDataUpdated();
        }
        
        Alert.alert('Sucesso', `Episódios 1-${selectedEpisode} marcados como assistidos!`);
        onClose();
      } catch (error) {
        console.error('Error updating episode:', error);
        Alert.alert('Erro', 'Não foi possível atualizar o episódio. Tente novamente.');
      } finally {
        setIsUpdating(false);
      }
    } else if (selectedEpisode <= episodesWatched) {
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
              console.log(`Completing drama ${drama.id} with ${totalEpisodes} episodes`);
              
              // Mark all remaining episodes as watched using the new system
              for (let ep = episodesWatched + 1; ep <= totalEpisodes; ep++) {
                await markEpisodeMutation.mutateAsync({
                  dramaId: drama.id,
                  episodeNumber: ep,
                  episodeDurationMinutes: 60,
                });
              }
              
              // Also call legacy functions for compatibility
              await onProgressUpdate(totalEpisodes);
              await onComplete();
              
              // Force refresh data after completion
              if (onDataUpdated) {
                await onDataUpdated();
              }
              
              Alert.alert('Sucesso', 'Drama marcado como concluído!');
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
      const isWatched = i <= episodesWatched;
      const isSelected = i === selectedEpisode;
      const isAvailable = i > episodesWatched; // Can only select episodes after watched
      
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
              Episódio {episodesWatched} de {totalEpisodes} assistidos
            </Text>
            <Text style={styles.progressText}>
              Tempo assistido: {Math.round((userListItem.progress?.totalWatchTimeMinutes || 0) / 60)}h {Math.round((userListItem.progress?.totalWatchTimeMinutes || 0) % 60)}min
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

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Marcar Episódios</Text>
            
            <TouchableOpacity
              style={[
                styles.updateButton,
                (selectedEpisode <= episodesWatched || isUpdating) && styles.updateButtonDisabled,
              ]}
              onPress={handleEpisodeUpdate}
              disabled={selectedEpisode <= episodesWatched || isUpdating}
            >
              <Text style={[
                styles.updateButtonText,
                (selectedEpisode <= episodesWatched || isUpdating) && styles.updateButtonTextDisabled,
              ]}>
                {isUpdating ? 'Atualizando...' : `Marcar até Ep. ${selectedEpisode}`}
              </Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
            
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                (episodesWatched >= totalEpisodes || isUpdating) && styles.quickActionButtonDisabled
              ]}
              onPress={() => setSelectedEpisode(episodesWatched + 1)}
              disabled={episodesWatched >= totalEpisodes || isUpdating}
            >
              <Play size={20} color={episodesWatched >= totalEpisodes ? COLORS.textSecondary : COLORS.accent} />
              <Text style={[
                styles.quickActionText,
                (episodesWatched >= totalEpisodes || isUpdating) && styles.quickActionTextDisabled
              ]}>
                Próximo Episódio ({episodesWatched + 1})
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

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Fechar</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    width: '100%',
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
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    marginBottom: 12,
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