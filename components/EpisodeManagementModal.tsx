import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { X, Check, Play } from 'lucide-react-native';
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
}

export default function EpisodeManagementModal({
  visible,
  onClose,
  drama,
  userListItem,
  onProgressUpdate,
  onComplete,
}: EpisodeManagementModalProps) {
  const [selectedEpisode, setSelectedEpisode] = useState<number>(
    userListItem.progress?.currentEpisode || 0
  );

  const totalEpisodes = userListItem.progress?.totalEpisodes || 16;
  const currentEpisode = userListItem.progress?.currentEpisode || 0;

  const handleEpisodeUpdate = () => {
    if (selectedEpisode > currentEpisode && selectedEpisode <= totalEpisodes) {
      onProgressUpdate(selectedEpisode);
      onClose();
    } else if (selectedEpisode <= currentEpisode) {
      Alert.alert(
        'Episódio Inválido',
        'Você só pode marcar episódios posteriores ao atual como assistidos.'
      );
    }
  };

  const handleCompleteAll = () => {
    Alert.alert(
      'Concluir Drama',
      'Tem certeza que deseja marcar este drama como concluído? Isso irá marcar todos os episódios como assistidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluir',
          style: 'default',
          onPress: () => {
            onComplete();
            onClose();
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
      
      episodes.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.episodeButton,
            isWatched && styles.episodeWatched,
            isSelected && styles.episodeSelected,
          ]}
          onPress={() => setSelectedEpisode(i)}
          disabled={i <= currentEpisode}
        >
          <Text
            style={[
              styles.episodeButtonText,
              isWatched && styles.episodeWatchedText,
              isSelected && styles.episodeSelectedText,
            ]}
          >
            {i}
          </Text>
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selecionar Episódio</Text>
            <Text style={styles.sectionSubtitle}>
              Toque no episódio que você acabou de assistir
            </Text>
            
            <View style={styles.episodeGrid}>
              {renderEpisodeGrid()}
            </View>
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => setSelectedEpisode(currentEpisode + 1)}
              disabled={currentEpisode >= totalEpisodes}
            >
              <Play size={20} color={COLORS.accent} />
              <Text style={styles.quickActionText}>
                Próximo Episódio ({currentEpisode + 1})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.completeAllButton}
              onPress={handleCompleteAll}
            >
              <Check size={20} color={COLORS.background} />
              <Text style={styles.completeAllText}>
                Marcar como Concluído
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

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
              selectedEpisode <= currentEpisode && styles.updateButtonDisabled,
            ]}
            onPress={handleEpisodeUpdate}
            disabled={selectedEpisode <= currentEpisode}
          >
            <Text style={[
              styles.updateButtonText,
              selectedEpisode <= currentEpisode && styles.updateButtonTextDisabled,
            ]}>
              Atualizar para Ep. {selectedEpisode}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
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
});