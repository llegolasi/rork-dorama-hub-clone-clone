import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, ThumbsUp, ThumbsDown, Star } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface ExistingReview {
  id: string;
  recommendation_type: 'recommend' | 'not_recommend';
  review_text: string | null;
  rating: number | null;
}

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  dramaId: number;
  dramaName: string;
  onReviewSubmitted: () => void;
  existingReview?: ExistingReview | null;
}

export default function ReviewModal({ 
  visible, 
  onClose, 
  dramaId, 
  dramaName, 
  onReviewSubmitted,
  existingReview = null,
}: ReviewModalProps) {
  const [selectedType, setSelectedType] = useState<'recommend' | 'not_recommend' | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [starRating, setStarRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (visible) {
      if (existingReview) {
        setSelectedType(existingReview.recommendation_type);
        setReviewText(existingReview.review_text ?? '');
        const starsFromRating = existingReview.rating ? Math.round(existingReview.rating / 2) : 0;
        setStarRating(starsFromRating);
      } else {
        setSelectedType(null);
        setReviewText('');
        setStarRating(0);
      }
    }
  }, [visible, existingReview]);

  const convertedRating = useMemo(() => (starRating > 0 ? starRating * 2 : null), [starRating]);

  const submitReview = async () => {
    if (!selectedType) {
      Alert.alert('Erro', 'Você precisa selecionar se recomenda ou não o drama para marcar como concluído.');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para avaliar');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting review to Supabase', {
        dramaId,
        userId: user.id,
        recommendationType: selectedType,
        reviewText,
        starRating,
        convertedRating,
        mode: existingReview ? 'update' : 'create',
        existingReviewId: existingReview?.id,
      });

      if (existingReview) {
        const { error } = await supabase
          .from('drama_reviews' as any)
          .update({
            recommendation_type: selectedType,
            review_text: reviewText || null,
            rating: convertedRating,
          } as any)
          .eq('id', existingReview.id);

        if (error) {
          console.log('Supabase update error:', error);
          Alert.alert('Erro', 'Não foi possível atualizar sua avaliação.');
          return;
        }

        Alert.alert('Sucesso', 'Sua avaliação foi atualizada!');
      } else {
        const { error } = await supabase
          .from('drama_reviews' as any)
          .insert({
            user_id: user.id,
            drama_id: dramaId,
            recommendation_type: selectedType,
            review_text: reviewText || null,
            rating: convertedRating,
          } as any);

        if (error) {
          console.log('Supabase insert error:', error);
          if ((error as any).code === '23505') {
            Alert.alert('Aviso', 'Você já avaliou este drama.');
          } else if ((error as any).code === '42501') {
            Alert.alert('Bloqueado', 'Você só pode avaliar dramas concluídos.');
          } else {
            Alert.alert('Erro', 'Não foi possível enviar sua avaliação.');
          }
          return;
        }

        Alert.alert('Sucesso', 'Drama marcado como concluído e avaliação enviada!');
      }

      onReviewSubmitted();
      handleClose();
    } catch (err) {
      console.error('Error submitting review:', err);
      Alert.alert('Erro', 'Não foi possível enviar sua avaliação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setReviewText('');
    setStarRating(0);
    onClose();
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
          <Text style={styles.title}>{existingReview ? 'Editar Avaliação' : 'Avaliar Drama'}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} testID="close-review-modal">
            <X size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.dramaName}>{dramaName}</Text>
          
          <Text style={styles.sectionTitle}>Você recomenda este drama?</Text>
          <View style={styles.recommendationButtons}>
            <TouchableOpacity
              style={[
                styles.recommendButton,
                selectedType === 'recommend' && styles.recommendButtonSelected
              ]}
              onPress={() => setSelectedType('recommend')}
              testID="recommend-btn"
            >
              <ThumbsUp 
                size={24} 
                color={selectedType === 'recommend' ? COLORS.text : COLORS.accent} 
                fill={selectedType === 'recommend' ? COLORS.text : 'transparent'}
              />
              <Text style={[
                styles.recommendButtonText,
                selectedType === 'recommend' && styles.recommendButtonTextSelected
              ]}>Recomendo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.notRecommendButton,
                selectedType === 'not_recommend' && styles.notRecommendButtonSelected
              ]}
              onPress={() => setSelectedType('not_recommend')}
              testID="not-recommend-btn"
            >
              <ThumbsDown 
                size={24} 
                color={selectedType === 'not_recommend' ? COLORS.text : COLORS.error} 
                fill={selectedType === 'not_recommend' ? COLORS.text : 'transparent'}
              />
              <Text style={[
                styles.notRecommendButtonText,
                selectedType === 'not_recommend' && styles.notRecommendButtonTextSelected
              ]}>Não Recomendo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Sua nota</Text>
          <View style={styles.starsRow}>
            {Array.from({ length: 5 }).map((_, idx) => {
              const starIndex = idx + 1;
              const filled = starRating >= starIndex;
              return (
                <TouchableOpacity
                  key={`star-${starIndex}`}
                  onPress={() => setStarRating(starIndex)}
                  style={styles.starButton}
                  testID={`star-${starIndex}`}
                  activeOpacity={0.8}
                >
                  <Star size={28} color={filled ? COLORS.accent : COLORS.textSecondary} fill={filled ? COLORS.accent : 'transparent'} />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Comentário (opcional)</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Compartilhe sua opinião sobre este drama..."
            placeholderTextColor={COLORS.textSecondary}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="review-text"
          />

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedType || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={submitReview}
            disabled={!selectedType || isSubmitting}
            testID="submit-review"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.submitButtonText}>Enviar Avaliação</Text>
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
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dramaName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 16,
  },
  recommendationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  recommendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: 'transparent',
  },
  recommendButtonSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  recommendButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  recommendButtonTextSelected: {
    color: COLORS.text,
  },
  notRecommendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.error,
    backgroundColor: 'transparent',
  },
  notRecommendButtonSelected: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  notRecommendButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  notRecommendButtonTextSelected: {
    color: COLORS.text,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  reviewInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
});