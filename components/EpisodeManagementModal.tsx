import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  PanResponder,
} from 'react-native';
import { X, Check, Play } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '@/constants/colors';
import { Drama } from '@/types/drama';
import { UserList } from '@/types/user';
import { trpc } from '@/lib/trpc';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = Math.min(width - 80, 280);
const CIRCLE_RADIUS = CIRCLE_SIZE / 2 - 20;
const STROKE_WIDTH = 8;

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

  const getAngleFromEpisode = (episode: number) => {
    return ((episode - 1) / totalEpisodes) * 360 - 90; // Start from top
  };

  const getEpisodeFromAngle = (angle: number) => {
    const normalizedAngle = (angle + 90 + 360) % 360;
    const episode = Math.round((normalizedAngle / 360) * totalEpisodes) + 1;
    return Math.max(1, Math.min(totalEpisodes, episode));
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const centerX = CIRCLE_SIZE / 2;
      const centerY = CIRCLE_SIZE / 2;
      const angle = Math.atan2(locationY - centerY, locationX - centerX) * (180 / Math.PI);
      const episode = getEpisodeFromAngle(angle);
      if (episode > episodesWatched) {
        setSelectedEpisode(episode);
      }
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const centerX = CIRCLE_SIZE / 2;
      const centerY = CIRCLE_SIZE / 2;
      const angle = Math.atan2(locationY - centerY, locationX - centerX) * (180 / Math.PI);
      const episode = getEpisodeFromAngle(angle);
      if (episode > episodesWatched) {
        setSelectedEpisode(episode);
      }
    },
  });

  const renderCircularProgress = () => {
    const watchedProgress = (episodesWatched / totalEpisodes) * 100;
    const selectedProgress = (selectedEpisode / totalEpisodes) * 100;
    const circumference = 2 * Math.PI * CIRCLE_RADIUS;
    const watchedStrokeDashoffset = circumference - (watchedProgress / 100) * circumference;
    const selectedStrokeDashoffset = circumference - (selectedProgress / 100) * circumference;

    return (
      <View style={styles.circularProgressContainer} {...panResponder.panHandlers}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          {/* Background circle */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={CIRCLE_RADIUS}
            stroke={COLORS.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          
          {/* Watched episodes circle */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={CIRCLE_RADIUS}
            stroke="#10B981"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={watchedStrokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
          />
          
          {/* Selected episode circle */}
          {selectedEpisode > episodesWatched && (
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={CIRCLE_RADIUS}
              stroke={COLORS.accent}
              strokeWidth={STROKE_WIDTH / 2}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={selectedStrokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
              opacity={0.7}
            />
          )}
        </Svg>
        
        {/* Center content */}
        <View style={styles.circleCenter}>
          <Text style={styles.episodeNumber}>{selectedEpisode}</Text>
          <Text style={styles.episodeLabel}>Episódio</Text>
          <Text style={styles.progressLabel}>
            {selectedEpisode} de {totalEpisodes}
          </Text>
        </View>
        
        {/* Episode markers */}
        {Array.from({ length: totalEpisodes }, (_, i) => {
          const episode = i + 1;
          const angle = getAngleFromEpisode(episode);
          const radian = (angle * Math.PI) / 180;
          const markerRadius = CIRCLE_RADIUS + 15;
          const x = CIRCLE_SIZE / 2 + Math.cos(radian) * markerRadius;
          const y = CIRCLE_SIZE / 2 + Math.sin(radian) * markerRadius;
          
          return (
            <TouchableOpacity
              key={episode}
              style={[
                styles.episodeMarker,
                {
                  left: x - 8,
                  top: y - 8,
                },
                episode <= episodesWatched && styles.episodeMarkerWatched,
                episode === selectedEpisode && styles.episodeMarkerSelected,
              ]}
              onPress={() => episode > episodesWatched && setSelectedEpisode(episode)}
              disabled={episode <= episodesWatched || isUpdating}
            >
              <Text style={[
                styles.episodeMarkerText,
                episode <= episodesWatched && styles.episodeMarkerTextWatched,
                episode === selectedEpisode && styles.episodeMarkerTextSelected,
              ]}>
                {episode <= 9 ? episode : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
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
            <Text style={styles.sectionTitle}>Selecionar Episódio</Text>
            <Text style={styles.sectionSubtitle}>
              Toque no círculo ou arraste para selecionar até qual episódio você assistiu.
            </Text>

            {renderCircularProgress()}
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
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  episodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  episodeMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeMarkerWatched: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  episodeMarkerSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    transform: [{ scale: 1.2 }],
  },
  episodeMarkerText: {
    fontSize: 8,
    fontWeight: '600',
    color: COLORS.text,
  },
  episodeMarkerTextWatched: {
    color: COLORS.background,
  },
  episodeMarkerTextSelected: {
    color: COLORS.background,
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