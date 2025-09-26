import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Award, Trophy, Star } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import type { Achievement } from '@/types/user';

interface CompletedAchievementsDisplayProps {
  userId: string;
  isOwnProfile?: boolean;
  maxDisplay?: number;
  onViewAll?: () => void;
}

export default function CompletedAchievementsDisplay({ 
  userId, 
  isOwnProfile = false, 
  maxDisplay = 6,
  onViewAll 
}: CompletedAchievementsDisplayProps) {
  const { data: completedAchievements = [], isLoading } = trpc.achievements.getUserCompletedAchievements.useQuery({
    userId,
    limit: maxDisplay + 1, // Get one extra to know if there are more
    offset: 0
  });

  const { data: achievementStats } = trpc.achievements.getUserAchievementStats.useQuery({
    userId
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Award size={20} color={COLORS.accent} />
          <Text style={styles.title}>Conquistas</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  if (completedAchievements.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Award size={20} color={COLORS.accent} />
          <Text style={styles.title}>Conquistas</Text>
        </View>
        <View style={styles.emptyState}>
          <Award size={32} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            {isOwnProfile ? 'Você ainda não desbloqueou nenhuma conquista' : 'Nenhuma conquista desbloqueada ainda'}
          </Text>
        </View>
      </View>
    );
  }

  const displayAchievements = completedAchievements.slice(0, maxDisplay);
  const hasMore = completedAchievements.length > maxDisplay;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return '#6B7280';
      case 'rare':
        return '#6366F1';
      case 'legendary':
        return '#F59E0B';
      default:
        return COLORS.textSecondary;
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return Award;
      case 'rare':
        return Trophy;
      case 'legendary':
        return Star;
      default:
        return Award;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Award size={20} color={COLORS.accent} />
        <Text style={styles.title}>Conquistas</Text>
        {achievementStats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {achievementStats.unlockedAchievements}/{achievementStats.totalAchievements}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${achievementStats.completionPercentage}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementsList}
      >
        {displayAchievements.map((achievement) => {
          const IconComponent = getRarityIcon(achievement.rarity);
          const rarityColor = getRarityColor(achievement.rarity);
          
          return (
            <View key={achievement.id} style={styles.achievementCard}>
              <View style={[styles.achievementIcon, { borderColor: rarityColor + '40' }]}>
                <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
                <View style={[styles.rarityIndicator, { backgroundColor: rarityColor }]}>
                  <IconComponent size={10} color="white" />
                </View>
                {achievement.isPremium && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>+</Text>
                  </View>
                )}
              </View>
              <Text style={styles.achievementName} numberOfLines={2}>
                {achievement.name}
              </Text>
              <Text style={styles.achievementDate}>
                {new Date(achievement.unlockedAt!).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit'
                })}
              </Text>
            </View>
          );
        })}

        {hasMore && onViewAll && (
          <TouchableOpacity style={styles.viewAllCard} onPress={onViewAll}>
            <View style={styles.viewAllIcon}>
              <Award size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.viewAllText}>Ver todas</Text>
            <Text style={styles.viewAllCount}>+{completedAchievements.length - maxDisplay}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {achievementStats?.mostRecentAchievement && (
        <View style={styles.recentAchievement}>
          <Text style={styles.recentLabel}>Mais recente:</Text>
          <View style={styles.recentContent}>
            <Text style={styles.recentEmoji}>{achievementStats.mostRecentAchievement.icon}</Text>
            <Text style={styles.recentName}>{achievementStats.mostRecentAchievement.name}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  statsContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  achievementsList: {
    gap: 12,
    paddingRight: 16,
  },
  achievementCard: {
    alignItems: 'center',
    width: 80,
  },
  achievementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  achievementEmoji: {
    fontSize: 24,
  },
  rarityIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  premiumBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    backgroundColor: '#FDCB6E',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  premiumBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: 'white',
  },
  achievementName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  viewAllCard: {
    alignItems: 'center',
    width: 80,
    justifyContent: 'center',
  },
  viewAllIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent + '20',
    borderWidth: 2,
    borderColor: COLORS.accent + '40',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 2,
  },
  viewAllCount: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  recentAchievement: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  recentLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  recentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentEmoji: {
    fontSize: 16,
  },
  recentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
});