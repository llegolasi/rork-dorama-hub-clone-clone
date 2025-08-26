import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { BarChart3, Clock, Star, User } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import type { UserStats } from '@/types/user';

interface UserStatsComponentProps {
  stats: UserStats;
  isPremium: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function UserStatsComponent({ stats, isPremium }: UserStatsComponentProps) {
  if (!isPremium) {
    return (
      <View style={styles.premiumRequired}>
        <BarChart3 size={48} color={COLORS.textSecondary} />
        <Text style={styles.premiumTitle}>Estatísticas Detalhadas</Text>
        <Text style={styles.premiumDescription}>
          Assine o Dorama Hub+ para ver gráficos detalhados dos seus hábitos de visualização
        </Text>
      </View>
    );
  }

  const totalHours = Math.floor(stats.totalWatchTime / 60);
  const totalMinutes = stats.totalWatchTime % 60;

  const topGenres = Object.entries(stats.genreBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const maxGenreCount = Math.max(...topGenres.map(([, count]) => count));

  const monthlyData = Object.entries(stats.monthlyWatchTime)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .slice(-6); // Last 6 months

  const maxMonthlyTime = Math.max(...monthlyData.map(([, time]) => time));

  const renderGenreBar = ([genre, count]: [string, number], index: number) => {
    const percentage = (count / maxGenreCount) * 100;
    
    return (
      <View key={genre} style={styles.genreItem}>
        <View style={styles.genreInfo}>
          <Text style={styles.genreLabel}>{genre}</Text>
          <Text style={styles.genreCount}>{count} dramas</Text>
        </View>
        <View style={styles.genreBarContainer}>
          <View 
            style={[
              styles.genreBar,
              { width: `${percentage}%` },
              { backgroundColor: getGenreColor(index) }
            ]} 
          />
        </View>
      </View>
    );
  };

  const renderMonthlyBar = ([month, time]: [string, number], index: number) => {
    const percentage = maxMonthlyTime > 0 ? (time / maxMonthlyTime) * 100 : 0;
    const hours = Math.floor(time / 60);
    const monthName = new Date(month).toLocaleDateString('pt-BR', { month: 'short' });
    
    return (
      <View key={month} style={styles.monthlyItem}>
        <View style={styles.monthlyBarContainer}>
          <View 
            style={[
              styles.monthlyBar,
              { height: `${Math.max(percentage, 5)}%` }
            ]} 
          />
        </View>
        <Text style={styles.monthlyLabel}>{monthName}</Text>
        <Text style={styles.monthlyValue}>{hours}h</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <BarChart3 size={24} color={COLORS.accent} />
        <Text style={styles.title}>Suas Estatísticas</Text>
      </View>

      {/* Total Watch Time */}
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <Clock size={20} color={COLORS.accent} />
          <Text style={styles.statTitle}>Tempo Total Assistido</Text>
        </View>
        <Text style={styles.statValue}>
          {totalHours}h {totalMinutes}min
        </Text>
        <Text style={styles.statDescription}>
          Você assistiu o equivalente a {Math.floor(totalHours / 24)} dias de conteúdo!
        </Text>
      </View>

      {/* Favorite Actor */}
      {stats.favoriteActor && (
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <User size={20} color={COLORS.accent} />
            <Text style={styles.statTitle}>Ator/Atriz Favorito(a)</Text>
          </View>
          <Text style={styles.statValue}>{stats.favoriteActor.name}</Text>
          <Text style={styles.statDescription}>
            {stats.favoriteActor.worksWatched} obras assistidas
          </Text>
        </View>
      )}

      {/* Genre Breakdown */}
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <Star size={20} color={COLORS.accent} />
          <Text style={styles.statTitle}>Gêneros Mais Assistidos</Text>
        </View>
        <View style={styles.genreChart}>
          {topGenres.map(renderGenreBar)}
        </View>
      </View>

      {/* Monthly Watch Time */}
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <BarChart3 size={20} color={COLORS.accent} />
          <Text style={styles.statTitle}>Horas por Mês</Text>
        </View>
        <View style={styles.monthlyChart}>
          {monthlyData.map(renderMonthlyBar)}
        </View>
      </View>
    </ScrollView>
  );
}

function getGenreColor(index: number): string {
  const colors = [
    COLORS.accent,
    '#6C5CE7',
    '#74B9FF',
    '#00B894',
    '#FDCB6E',
  ];
  return colors[index % colors.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  statTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 8,
  },
  statDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  genreChart: {
    gap: 12,
  },
  genreItem: {
    gap: 8,
  },
  genreInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  genreLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  genreCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  genreBarContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  genreBar: {
    height: '100%',
    borderRadius: 4,
  },
  monthlyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 20,
  },
  monthlyItem: {
    alignItems: 'center',
    flex: 1,
  },
  monthlyBarContainer: {
    height: 80,
    width: 20,
    backgroundColor: COLORS.border,
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  monthlyBar: {
    width: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minHeight: 4,
  },
  monthlyLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  monthlyValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  premiumRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  premiumDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});