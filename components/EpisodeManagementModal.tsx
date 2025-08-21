import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
  PanResponder,
} from 'react-native';

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

  const getPositionFromAngle = (angle: number) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: CIRCLE_SIZE / 2 + Math.cos(radian) * CIRCLE_RADIUS,
      y: CIRCLE_SIZE / 2 + Math.sin(radian) * CIRCLE_RADIUS,
    };
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const centerX = CIRCLE_SIZE / 2;
      const centerY = CIRCLE_SIZE / 2;
      const distance = Math.sqrt(
        Math.pow(locationX - centerX, 2) + Math.pow(locationY - centerY, 2)
      );
      // Only respond if touch is near the circle
      return distance >= CIRCLE_RADIUS - 40 && distance <= CIRCLE_RADIUS + 40;
    },
    onMoveShouldSetPanResponder: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      const centerX = CIRCLE_SIZE / 2;
      const centerY = CIRCLE_SIZE / 2;
      const distance = Math.sqrt(
        Math.pow(locationX - centerX, 2) + Math.pow(locationY - centerY, 2)
      );
      return distance >= CIRCLE_RADIUS - 40 && distance <= CIRCLE_RADIUS + 40;
    },
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
    onPanResponderRelease: () => {
      // Optional: Add haptic feedback here if needed
    },
  });

  const handleNextEpisode = () => {
    const nextEpisode = episodesWatched + 1;
    if (nextEpisode <= totalEpisodes) {
      setSelectedEpisode(nextEpisode);
    }
  };

  const renderCircularProgress = () => {
    const watchedProgress = (episodesWatched / totalEpisodes) * 100;
    const selectedProgress = (selectedEpisode / totalEpisodes) * 100;
    const circumference = 2 * Math.PI * CIRCLE_RADIUS;
    const watchedStrokeDashoffset = circumference - (watchedProgress / 100) * circumference;


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
          
          {/* Selected episode preview circle */}
          {selectedEpisode > episodesWatched && (
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={CIRCLE_RADIUS}
              stroke={COLORS.accent}
              strokeWidth={3}
              fill="none"
              strokeDasharray={`${(selectedProgress - watchedProgress) / 100 * circumference} ${circumference}`}
              strokeDashoffset={watchedStrokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
              opacity={0.6}
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
          {episodesWatched < totalEpisodes && (
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNextEpisode}
            >
              <Text style={styles.nextButtonText}>Próximo</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Draggable slider handle */}
        {selectedEpisode > episodesWatched && (() => {
          const angle = getAngleFromEpisode(selectedEpisode);
          const position = getPositionFromAngle(angle);
          return (
            <View
              style={[
                styles.sliderHandle,
                {
                  left: position.x - 10,
                  top: position.y - 10,
                },
              ]}
            >
              <View style={styles.sliderHandleInner} />
            </View>
          );
        })()}
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
        <View style={styles.content}>
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

          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.mainActionButton,
                (selectedEpisode <= episodesWatched || isUpdating) && styles.mainActionButtonDisabled,
              ]}
              onPress={selectedEpisode === totalEpisodes ? handleCompleteAll : handleEpisodeUpdate}
              disabled={selectedEpisode <= episodesWatched || isUpdating}
            >
              <Text style={[
                styles.mainActionButtonText,
                (selectedEpisode <= episodesWatched || isUpdating) && styles.mainActionButtonTextDisabled,
              ]}>
                {isUpdating 
                  ? 'Processando...' 
                  : selectedEpisode === totalEpisodes 
                    ? 'Marcar como Concluído'
                    : `Marcar até Ep. ${selectedEpisode}`
                }
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>


        </View>
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

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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

  sliderHandle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sliderHandleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.background,
  },
  nextButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
  },
  nextButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.background,
  },
  actionSection: {
    marginBottom: 20,
    paddingBottom: 20,
  },
  mainActionButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  mainActionButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  mainActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  mainActionButtonTextDisabled: {
    color: COLORS.textSecondary,
  },
  closeButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});