import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { Achievement } from '@/types/user';

interface AchievementsGridProps {
  achievements: Achievement[];
  isPremium: boolean;
}

export default function AchievementsGrid({ achievements, isPremium }: AchievementsGridProps) {
  const renderAchievement = (achievement: Achievement) => {
    const isUnlocked = !!achievement.unlockedAt;
    const canView = !achievement.isPremium || isPremium;
    
    return (
      <View
        key={achievement.id}
        style={[
          styles.achievementCard,
          !canView && styles.lockedCard,
          isUnlocked && styles.unlockedCard,
          achievement.rarity === 'rare' && styles.rareCard,
          achievement.rarity === 'legendary' && styles.legendaryCard,
        ]}
      >
        <View style={styles.achievementIcon}>
          <Text style={[
            styles.iconText,
            !canView && styles.lockedIcon,
            isUnlocked && styles.unlockedIcon,
          ]}>
            {canView ? achievement.icon : '🔒'}
          </Text>
          {achievement.isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>+</Text>
            </View>
          )}
        </View>
        
        <Text style={[
          styles.achievementName,
          !canView && styles.lockedText,
        ]}>
          {canView ? achievement.name : 'Conquista Premium'}
        </Text>
        
        <Text style={[
          styles.achievementDescription,
          !canView && styles.lockedText,
        ]}>
          {canView ? achievement.description : 'Assine o Dorama Hub+ para desbloquear'}
        </Text>
        
        {isUnlocked && achievement.unlockedAt && (
          <Text style={styles.unlockedDate}>
            Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
          </Text>
        )}
      </View>
    );
  };

  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const lockedAchievements = achievements.filter(a => !a.unlockedAt);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Conquistas</Text>
        <Text style={styles.subtitle}>
          {unlockedAchievements.length} de {achievements.length} desbloqueadas
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${(unlockedAchievements.length / achievements.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      {unlockedAchievements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desbloqueadas</Text>
          <View style={styles.achievementsGrid}>
            {unlockedAchievements.map(renderAchievement)}
          </View>
        </View>
      )}

      {lockedAchievements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>A Desbloquear</Text>
          <View style={styles.achievementsGrid}>
            {lockedAchievements.map(renderAchievement)}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  achievementCard: {
    width: '47%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unlockedCard: {
    borderColor: COLORS.accent + '40',
    backgroundColor: COLORS.card + 'E0',
  },
  rareCard: {
    borderColor: '#6C5CE7' + '40',
  },
  legendaryCard: {
    borderColor: '#FDCB6E' + '40',
  },
  lockedCard: {
    opacity: 0.6,
  },
  achievementIcon: {
    position: 'relative',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 32,
  },
  unlockedIcon: {
    textShadowColor: COLORS.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  lockedIcon: {
    opacity: 0.5,
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    backgroundColor: '#FDCB6E',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.background,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  lockedText: {
    opacity: 0.7,
  },
  unlockedDate: {
    fontSize: 10,
    color: COLORS.accent,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
});