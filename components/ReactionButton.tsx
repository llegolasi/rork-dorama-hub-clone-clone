import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Heart } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { REACTION_EMOJIS } from '@/constants/achievements';

interface ReactionButtonProps {
  isLiked: boolean;
  likesCount: number;
  isPremium: boolean;
  onReaction: (reactionId: string) => void;
}

export default function ReactionButton({ 
  isLiked, 
  likesCount, 
  isPremium, 
  onReaction 
}: ReactionButtonProps) {
  const [showReactions, setShowReactions] = useState(false);

  const handleBasicLike = () => {
    onReaction('like');
  };

  const handleReactionSelect = (reactionId: string) => {
    onReaction(reactionId);
    setShowReactions(false);
  };

  const handleLongPress = () => {
    if (isPremium) {
      setShowReactions(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.reactionButton}
        onPress={handleBasicLike}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        <Heart 
          size={16} 
          color={isLiked ? COLORS.accent : COLORS.textSecondary}
          fill={isLiked ? COLORS.accent : 'transparent'}
        />
        <Text style={[
          styles.reactionText,
          isLiked && styles.likedText
        ]}>
          {likesCount}
        </Text>
      </TouchableOpacity>

      {isPremium && (
        <Modal
          visible={showReactions}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReactions(false)}
        >
          <Pressable 
            style={styles.modalOverlay}
            onPress={() => setShowReactions(false)}
          >
            <View style={styles.reactionsContainer}>
              <Text style={styles.reactionsTitle}>Escolha sua reação</Text>
              <View style={styles.reactionsGrid}>
                {REACTION_EMOJIS.map((reaction) => (
                  <TouchableOpacity
                    key={reaction.id}
                    style={styles.reactionOption}
                    onPress={() => handleReactionSelect(reaction.id)}
                  >
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                    <Text style={styles.reactionName}>{reaction.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Dorama Hub+ Exclusivo</Text>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  likedText: {
    color: COLORS.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionsContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxWidth: 300,
    width: '90%',
  },
  reactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  reactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  reactionOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    width: '30%',
  },
  reactionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  reactionName: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  premiumBadge: {
    backgroundColor: '#FDCB6E' + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 16,
    alignSelf: 'center',
  },
  premiumBadgeText: {
    fontSize: 12,
    color: '#FDCB6E',
    fontWeight: '600',
  },
});