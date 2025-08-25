import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X, Flag } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

interface ReportCommentModalProps {
  visible: boolean;
  onClose: () => void;
  commentId: string;
  commentContent: string;
}

type ReportReason = 'spam' | 'harassment' | 'hate_speech' | 'inappropriate_content' | 'misinformation' | 'other';

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'spam',
    label: 'Spam',
    description: 'Conteúdo repetitivo ou não relacionado'
  },
  {
    value: 'harassment',
    label: 'Assédio',
    description: 'Comportamento abusivo ou intimidação'
  },
  {
    value: 'hate_speech',
    label: 'Discurso de Ódio',
    description: 'Conteúdo que promove ódio ou discriminação'
  },
  {
    value: 'inappropriate_content',
    label: 'Conteúdo Inapropriado',
    description: 'Material ofensivo ou inadequado'
  },
  {
    value: 'misinformation',
    label: 'Desinformação',
    description: 'Informações falsas ou enganosas'
  },
  {
    value: 'other',
    label: 'Outro',
    description: 'Outro motivo não listado acima'
  }
];

export default function ReportCommentModal({
  visible,
  onClose,
  commentId,
  commentContent
}: ReportCommentModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const createReportMutation = trpc.comments.createReport.useMutation({
    onSuccess: () => {
      Alert.alert(
        'Denúncia Enviada',
        'Sua denúncia foi enviada com sucesso. Nossa equipe irá analisá-la em breve.',
        [{ text: 'OK', onPress: handleClose }]
      );
    },
    onError: (error) => {
      Alert.alert(
        'Erro',
        error.message || 'Erro ao enviar denúncia. Tente novamente.',
        [{ text: 'OK' }]
      );
    },
    onSettled: () => {
      setIsSubmitting(false);
    }
  });

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Erro', 'Por favor, selecione um motivo para a denúncia.');
      return;
    }

    if (selectedReason === 'other' && !description.trim()) {
      Alert.alert('Erro', 'Por favor, descreva o motivo da denúncia.');
      return;
    }

    setIsSubmitting(true);
    createReportMutation.mutate({
      commentId,
      reason: selectedReason,
      description: description.trim() || undefined
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Flag size={24} color="#ef4444" />
            <Text style={styles.headerTitle}>Denunciar Comentário</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.commentPreview}>
            <Text style={styles.commentLabel}>Comentário:</Text>
            <Text style={styles.commentText} numberOfLines={3}>
              {commentContent}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Por que você está denunciando este comentário?</Text>
          
          <View style={styles.reasonsList}>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.value && styles.reasonItemSelected
                ]}
                onPress={() => setSelectedReason(reason.value)}
                disabled={isSubmitting}
              >
                <View style={styles.reasonContent}>
                  <Text style={[
                    styles.reasonLabel,
                    selectedReason === reason.value && styles.reasonLabelSelected
                  ]}>
                    {reason.label}
                  </Text>
                  <Text style={[
                    styles.reasonDescription,
                    selectedReason === reason.value && styles.reasonDescriptionSelected
                  ]}>
                    {reason.description}
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedReason === reason.value && styles.radioButtonSelected
                ]} />
              </TouchableOpacity>
            ))}
          </View>

          {(selectedReason === 'other' || selectedReason) && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionLabel}>
                {selectedReason === 'other' ? 'Descreva o motivo (obrigatório):' : 'Informações adicionais (opcional):'}
              </Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Digite aqui..."
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
                editable={!isSubmitting}
              />
              <Text style={styles.characterCount}>
                {description.length}/500
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedReason || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Enviar Denúncia</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  commentPreview: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginVertical: 20,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  commentText: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  reasonsList: {
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  reasonItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f7ff',
  },
  reasonContent: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  reasonLabelSelected: {
    color: '#3b82f6',
  },
  reasonDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reasonDescriptionSelected: {
    color: '#3b82f6',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    marginLeft: 12,
  },
  radioButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});