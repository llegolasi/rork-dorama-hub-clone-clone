import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BarChart3, Clock, Trophy, Eye, BookOpen, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';


interface UserStatsDisplayProps {
  userId?: string;
  isOwnProfile?: boolean;
}

export default function UserStatsDisplay({ userId, isOwnProfile = false }: UserStatsDisplayProps) {

  const { data: stats, isLoading, error, refetch } = trpc.users.getStats.useQuery(
    { userId: userId },
    { 
      enabled: !!userId && userId !== '' && userId.length > 0 && userId !== 'undefined',
      refetchOnMount: true,
      retry: 2,
      retryDelay: 1000
    }
  );
  

  


  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remainingMinutes}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando estatísticas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Erro ao carregar estatísticas</Text>
        <Text style={styles.errorDetails}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Nenhuma estatística disponível</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <BarChart3 size={24} color={COLORS.accent} />
          <Text style={styles.title}>Estatísticas</Text>
        </View>
        {isOwnProfile && (
          <TouchableOpacity 
            style={styles.viewCompleteButton}
            onPress={() => router.push('/statistics')}
          >
            <Text style={styles.viewCompleteButtonText}>Ver Completo</Text>
            <ArrowRight size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Clock size={20} color={COLORS.accent} />
          <Text style={styles.statValue}>
            {formatWatchTime(stats.total_watch_time_minutes || 0)}
          </Text>
          <Text style={styles.statLabel}>Tempo Total</Text>
        </View>

        <View style={styles.statCard}>
          <Trophy size={20} color={COLORS.accent} />
          <Text style={styles.statValue}>{stats.total_episodes_watched || 0}</Text>
          <Text style={styles.statLabel}>Episódios</Text>
        </View>

        <View style={styles.statCard}>
          <Eye size={20} color={COLORS.accent} />
          <Text style={styles.statValue}>{stats.dramas_completed || 0}</Text>
          <Text style={styles.statLabel}>Concluídos</Text>
        </View>

        <View style={styles.statCard}>
          <BookOpen size={20} color={COLORS.accent} />
          <Text style={styles.statValue}>{stats.dramas_watching || 0}</Text>
          <Text style={styles.statLabel}>Assistindo</Text>
        </View>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },

  viewCompleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewCompleteButtonText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },


  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error || '#ff4444',
    textAlign: 'center',
    padding: 20,
  },
  errorDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 12,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
});