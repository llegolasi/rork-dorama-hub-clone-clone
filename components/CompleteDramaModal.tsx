import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Calendar, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';

interface CompleteDramaModalProps {
  visible: boolean;
  onClose: () => void;
  dramaId: number;
  dramaName: string;
  totalEpisodes: number;
  onSuccess: () => void;
}



export default function CompleteDramaModal({
  visible,
  onClose,
  dramaId,
  dramaName,
  totalEpisodes,
  onSuccess,
}: CompleteDramaModalProps) {
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [episodeDuration] = useState<string>('60'); // Hidden from user, auto-filled
  const [selectedCategory] = useState<string>(''); // Hidden from user, auto-filled
  const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);

  const completeDramaMutation = trpc.users.completeDramaWithDateRange.useMutation({
    onSuccess: () => {
      Alert.alert('Sucesso', 'Drama marcado como completo com sucesso!');
      onSuccess();
      onClose();
    },
    onError: (error) => {
      Alert.alert('Erro', `Falha ao completar drama: ${error.message}`);
    },
  });

  const handleComplete = () => {
    if (startDate >= endDate) {
      Alert.alert('Atenção', 'A data de início deve ser anterior à data de fim.');
      return;
    }

    const duration = parseInt(episodeDuration);
    if (isNaN(duration) || duration < 1) {
      Alert.alert('Atenção', 'Erro interno: duração inválida.');
      return;
    }

    completeDramaMutation.mutate({
      dramaId,
      totalEpisodes,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      episodeDurationMinutes: duration,
      dramaCategory: selectedCategory,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysDifference = () => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getEpisodesPerDay = () => {
    const days = getDaysDifference();
    return days > 0 ? (totalEpisodes / days).toFixed(1) : '0';
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
          <Text style={styles.title}>Completar Drama</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.dramaInfo}>
            <Text style={styles.dramaName}>{dramaName}</Text>
            <Text style={styles.episodeCount}>{totalEpisodes} episódios</Text>
          </View>



          {/* Date Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar size={20} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Período que Assistiu</Text>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Data de Início</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>Data de Fim</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.periodInfo}>
              <Text style={styles.periodText}>
                Período: {getDaysDifference()} dias
              </Text>
              <Text style={styles.periodText}>
                Média: ~{getEpisodesPerDay()} episódios por dia
              </Text>
            </View>
          </View>



          {/* Summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Resumo</Text>
            <Text style={styles.summaryText}>
              • {totalEpisodes} episódios serão distribuídos ao longo de {getDaysDifference()} dias
            </Text>
            <Text style={styles.summaryText}>
              • Tempo total estimado: {Math.round((totalEpisodes * parseInt(episodeDuration || '60')) / 60)}h {(totalEpisodes * parseInt(episodeDuration || '60')) % 60}m
            </Text>
            <Text style={styles.summaryText}>
              • Categoria e duração dos episódios serão preenchidas automaticamente
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.completeButton, completeDramaMutation.isPending && styles.completeButtonDisabled]}
            onPress={handleComplete}
            disabled={completeDramaMutation.isPending}
          >
            <Text style={styles.completeButtonText}>
              {completeDramaMutation.isPending ? 'Completando...' : 'Completar Drama'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setStartDate(selectedDate);
              }
            }}
            maximumDate={new Date()}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }}
            maximumDate={new Date()}
            minimumDate={startDate}
          />
        )}
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
    fontSize: 20,
    fontWeight: '700',
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
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 20,
  },
  dramaName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  episodeCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.accent + '20',
    borderColor: COLORS.accent,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  periodInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    gap: 4,
  },
  periodText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
  },
  durationUnit: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summary: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
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
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  completeButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
});