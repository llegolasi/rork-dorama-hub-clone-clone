import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  BarChart3,
  Clock,
  Trophy,
  Filter,
  Star,
  Target,
  Zap,
  Award,
  Crown,
  ArrowLeft,
} from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/useAuth';

const { width: screenWidth } = Dimensions.get('window');

type TimeFilter = 'week' | 'month' | 'quarter' | 'year' | 'all';
type StatType = 'overview' | 'time' | 'genres' | 'achievements';

interface ChartData {
  label: string;
  value: number;
  color: string;
}

export default function StatisticsScreen() {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [activeStatType, setActiveStatType] = useState<StatType>('overview');
  const [showFilters, setShowFilters] = useState(false);

  const { data: stats, isLoading, error, refetch } = trpc.users.getStats.useQuery(
    { userId: user?.id },
    {
      enabled: !!user?.id && user.id !== '' && user.id.length > 0,
      refetchOnMount: true,
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error?.message?.includes('UNAUTHORIZED') || error?.message?.includes('401')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: 1000,
    }
  );

  // Mock data for premium features (replace with real data from backend)
  const mockTimeData = useMemo(() => {
    const now = new Date();
    const data: ChartData[] = [];
    
    switch (timeFilter) {
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          data.push({
            label: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
            value: Math.floor(Math.random() * 180) + 30,
            color: COLORS.accent,
          });
        }
        break;
      case 'month':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          if (i % 5 === 0) {
            data.push({
              label: date.getDate().toString(),
              value: Math.floor(Math.random() * 240) + 60,
              color: COLORS.accent,
            });
          }
        }
        break;
      case 'quarter':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          data.push({
            label: date.toLocaleDateString('pt-BR', { month: 'short' }),
            value: Math.floor(Math.random() * 1200) + 300,
            color: COLORS.accent,
          });
        }
        break;
      case 'year':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          data.push({
            label: date.toLocaleDateString('pt-BR', { month: 'short' }),
            value: Math.floor(Math.random() * 2000) + 500,
            color: COLORS.accent,
          });
        }
        break;
      default:
        data.push(
          { label: '2022', value: 8640, color: COLORS.accent },
          { label: '2023', value: 12480, color: COLORS.accent },
          { label: '2024', value: 15360, color: COLORS.accent }
        );
    }
    
    return data;
  }, [timeFilter]);

  const mockGenreData: ChartData[] = [
    { label: 'Romance', value: 35, color: '#FF6B9D' },
    { label: 'Thriller', value: 25, color: '#4ECDC4' },
    { label: 'Comédia', value: 20, color: '#45B7D1' },
    { label: 'Drama', value: 15, color: '#96CEB4' },
    { label: 'Histórico', value: 5, color: '#FFEAA7' },
  ];

  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remainingMinutes}m`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const getTimeFilterLabel = (filter: TimeFilter) => {
    switch (filter) {
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case 'quarter': return 'Últimos 3 Meses';
      case 'year': return 'Este Ano';
      case 'all': return 'Todo o Período';
    }
  };

  const renderBarChart = (data: ChartData[]) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const chartWidth = screenWidth - 64;
    const barWidth = (chartWidth - (data.length - 1) * 8) / data.length;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chart}>
          {data.map((item, index) => {
            const height = (item.value / maxValue) * 120;
            return (
              <View key={index} style={styles.barContainer}>
                <View style={[styles.bar, { height, backgroundColor: item.color, width: barWidth }]} />
                <Text style={styles.barLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.barValue}>
                  {activeStatType === 'time' ? formatWatchTime(item.value) : item.value.toString()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPieChart = (data: ChartData[]) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChart}>
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            return (
              <View key={index} style={styles.pieItem}>
                <View style={[styles.pieColor, { backgroundColor: item.color }]} />
                <Text style={styles.pieLabel}>{item.label}</Text>
                <Text style={styles.pieValue}>{percentage.toFixed(1)}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderOverviewStats = () => {
    if (!stats) return null;

    const totalMinutes = stats.total_watch_time_minutes || 0;
    const avgPerDay = totalMinutes / 365; // Rough estimate
    const avgPerDrama = stats.average_drama_runtime || 0;
    const completionRate = stats.dramas_completed / (stats.dramas_completed + stats.dramas_watching + stats.dramas_in_watchlist) * 100;

    return (
      <View style={styles.overviewGrid}>
        <LinearGradient
          colors={[COLORS.accent + '20', COLORS.accent + '10']}
          style={styles.overviewCard}
        >
          <Clock size={24} color={COLORS.accent} />
          <Text style={styles.overviewValue}>{formatWatchTime(totalMinutes)}</Text>
          <Text style={styles.overviewLabel}>Tempo Total</Text>
          <Text style={styles.overviewSubtext}>
            ~{formatWatchTime(Math.round(avgPerDay))} por dia
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#4ECDC4' + '20', '#4ECDC4' + '10']}
          style={styles.overviewCard}
        >
          <Trophy size={24} color="#4ECDC4" />
          <Text style={styles.overviewValue}>{stats.dramas_completed}</Text>
          <Text style={styles.overviewLabel}>Concluídos</Text>
          <Text style={styles.overviewSubtext}>
            {completionRate.toFixed(1)}% taxa de conclusão
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#FF6B9D' + '20', '#FF6B9D' + '10']}
          style={styles.overviewCard}
        >
          <Target size={24} color="#FF6B9D" />
          <Text style={styles.overviewValue}>{formatWatchTime(Math.round(avgPerDrama))}</Text>
          <Text style={styles.overviewLabel}>Média por Drama</Text>
          <Text style={styles.overviewSubtext}>
            {Math.round(avgPerDrama / 60)} episódios aprox.
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#96CEB4' + '20', '#96CEB4' + '10']}
          style={styles.overviewCard}
        >
          <Zap size={24} color="#96CEB4" />
          <Text style={styles.overviewValue}>{stats.dramas_watching}</Text>
          <Text style={styles.overviewLabel}>Assistindo</Text>
          <Text style={styles.overviewSubtext}>
            Em progresso
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderAchievements = () => {
    const achievements = [
      { icon: Crown, title: 'Maratonista', description: 'Assistiu 10+ dramas', unlocked: true, color: '#FFD700' },
      { icon: Star, title: 'Crítico', description: 'Avaliou 50+ dramas', unlocked: true, color: '#FF6B9D' },
      { icon: Award, title: 'Explorador', description: 'Assistiu 5+ gêneros', unlocked: true, color: '#4ECDC4' },
      { icon: Target, title: 'Dedicado', description: '100h+ assistidas', unlocked: false, color: '#96CEB4' },
      { icon: Trophy, title: 'Lenda', description: 'Completou 100+ dramas', unlocked: false, color: '#FFEAA7' },
      { icon: Zap, title: 'Velocista', description: 'Completou drama em 1 dia', unlocked: false, color: '#DDA0DD' },
    ];

    return (
      <View style={styles.achievementsGrid}>
        {achievements.map((achievement, index) => {
          const IconComponent = achievement.icon;
          return (
            <View
              key={index}
              style={[
                styles.achievementCard,
                { opacity: achievement.unlocked ? 1 : 0.5 }
              ]}
            >
              <LinearGradient
                colors={achievement.unlocked 
                  ? [achievement.color + '20', achievement.color + '10']
                  : ['#333333' + '20', '#333333' + '10']
                }
                style={styles.achievementGradient}
              >
                <IconComponent 
                  size={32} 
                  color={achievement.unlocked ? achievement.color : '#666666'} 
                />
                <Text style={[
                  styles.achievementTitle,
                  { color: achievement.unlocked ? COLORS.text : COLORS.textSecondary }
                ]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
                {achievement.unlocked && (
                  <View style={styles.unlockedBadge}>
                    <Text style={styles.unlockedText}>Desbloqueado</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          );
        })}
      </View>
    );
  };



  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Estatísticas",
            headerStyle: { backgroundColor: COLORS.background },
            headerTitleStyle: {
              fontSize: 28,
              fontWeight: "700",
              color: COLORS.text,
            },
            headerShadowVisible: false,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={COLORS.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando estatísticas...</Text>
        </View>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Estatísticas",
            headerStyle: { backgroundColor: COLORS.background },
            headerTitleStyle: {
              fontSize: 28,
              fontWeight: "700",
              color: COLORS.text,
            },
            headerShadowVisible: false,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={COLORS.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Erro ao carregar estatísticas</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Estatísticas",
          headerStyle: { backgroundColor: COLORS.background },
          headerTitleStyle: {
            fontSize: 28,
            fontWeight: "700",
            color: COLORS.text,
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={20} color={COLORS.accent} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>


        {/* Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Filtros de Tempo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterButtons}>
                {(['week', 'month', 'quarter', 'year', 'all'] as TimeFilter[]).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterChip,
                      timeFilter === filter && styles.filterChipActive
                    ]}
                    onPress={() => setTimeFilter(filter)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      timeFilter === filter && styles.filterChipTextActive
                    ]}>
                      {getTimeFilterLabel(filter)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Stat Type Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabs}>
              {[
                { key: 'overview', label: 'Visão Geral', icon: BarChart3 },
                { key: 'time', label: 'Tempo', icon: Clock },
                { key: 'genres', label: 'Gêneros', icon: Star },
                { key: 'achievements', label: 'Conquistas', icon: Award },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tab,
                      activeStatType === tab.key && styles.tabActive
                    ]}
                    onPress={() => setActiveStatType(tab.key as StatType)}
                  >
                    <IconComponent 
                      size={16} 
                      color={activeStatType === tab.key ? COLORS.accent : COLORS.textSecondary} 
                    />
                    <Text style={[
                      styles.tabText,
                      activeStatType === tab.key && styles.tabTextActive
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeStatType === 'overview' && renderOverviewStats()}
          
          {activeStatType === 'time' && (
            <View>
              <View style={styles.sectionHeader}>
                <Clock size={20} color={COLORS.accent} />
                <Text style={styles.sectionTitle}>Tempo Assistido - {getTimeFilterLabel(timeFilter)}</Text>
              </View>
              {renderBarChart(mockTimeData)}
              
              <View style={styles.timeInsights}>
                <Text style={styles.insightsTitle}>Insights</Text>
                <Text style={styles.insightText}>
                  • Você assiste mais nos fins de semana
                </Text>
                <Text style={styles.insightText}>
                  • Seu pico de atividade é às 20h
                </Text>
                <Text style={styles.insightText}>
                  • Média de 2.5 episódios por sessão
                </Text>
              </View>
            </View>
          )}
          
          {activeStatType === 'genres' && (
            <View>
              <View style={styles.sectionHeader}>
                <Star size={20} color={COLORS.accent} />
                <Text style={styles.sectionTitle}>Distribuição por Gêneros</Text>
              </View>
              {renderPieChart(mockGenreData)}
              
              <View style={styles.genreInsights}>
                <Text style={styles.insightsTitle}>Suas Preferências</Text>
                <Text style={styles.insightText}>
                  • Romance é seu gênero favorito (35%)
                </Text>
                <Text style={styles.insightText}>
                  • Você gosta de variedade - 5 gêneros diferentes
                </Text>
                <Text style={styles.insightText}>
                  • Recomendação: Experimente mais Históricos
                </Text>
              </View>
            </View>
          )}
          
          {activeStatType === 'achievements' && (
            <View>
              <View style={styles.sectionHeader}>
                <Award size={20} color={COLORS.accent} />
                <Text style={styles.sectionTitle}>Conquistas</Text>
              </View>
              {renderAchievements()}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  premiumRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  premiumDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error || '#ff4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  filterButton: {
    padding: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  premiumBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
  },
  filtersContainer: {
    backgroundColor: COLORS.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent + '20',
    borderColor: COLORS.accent,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  tabsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.accent + '20',
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  overviewLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  overviewSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    gap: 8,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    borderRadius: 4,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  barValue: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  pieChartContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  pieChart: {
    gap: 12,
  },
  pieItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pieColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  pieLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  pieValue: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  timeInsights: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  genreInsights: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  achievementGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
    minHeight: 140,
    justifyContent: 'center',
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  achievementDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  unlockedBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  unlockedText: {
    fontSize: 10,
    color: COLORS.background,
    fontWeight: '600',
  },
});