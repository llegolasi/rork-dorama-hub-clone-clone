import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BarChart3, Clock, Trophy, Eye, BookOpen, TrendingUp, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';


interface UserStatsDisplayProps {
  userId?: string;
}

export default function UserStatsDisplay({ userId }: UserStatsDisplayProps) {

  const { data: stats, isLoading, error, refetch } = trpc.users.getStats.useQuery(
    { userId: userId || undefined },
    { 
      enabled: !!userId && userId !== '' && userId.length > 0,
      refetchOnMount: true,
      retry: 2,
      retryDelay: 1000
    }
  );
  

  
  const updateStatsMutation = trpc.users.updateStats.useMutation({
    onSuccess: () => {
      refetch();
      Alert.alert('Sucesso', 'Estatísticas atualizadas com sucesso!');
    },
    onError: (error) => {
      Alert.alert('Erro', `Falha ao atualizar estatísticas: ${error.message}`);
    }
  });

  const handleUpdateStats = () => {
    updateStatsMutation.mutate();
  };

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
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.updateButton}
            onPress={handleUpdateStats}
            disabled={updateStatsMutation.isPending}
          >
            <TrendingUp size={16} color={COLORS.accent} />
            <Text style={styles.updateButtonText}>
              {updateStatsMutation.isPending ? 'Atualizando...' : 'Atualizar'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.viewCompleteButton}
            onPress={() => router.push('/statistics')}
          >
            <Text style={styles.viewCompleteButtonText}>Ver Completo</Text>
            <ArrowRight size={16} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
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
          <Text style={styles.statValue}>{stats.dramas_completed || 0}</Text>
          <Text style={styles.statLabel}>Concluídos</Text>
        </View>

        <View style={styles.statCard}>
          <Eye size={20} color={COLORS.accent} />
          <Text style={styles.statValue}>{stats.dramas_watching || 0}</Text>
          <Text style={styles.statLabel}>Assistindo</Text>
        </View>

        <View style={styles.statCard}>
          <BookOpen size={20} color={COLORS.accent} />
          <Text style={styles.statValue}>{stats.dramas_in_watchlist || 0}</Text>
          <Text style={styles.statLabel}>Quero Ver</Text>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  updateButtonText: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '500',
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