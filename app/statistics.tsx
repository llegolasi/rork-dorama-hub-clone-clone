import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import {
  BarChart3,
  Clock,
  Trophy,
  Star,
  Target,
  Zap,
  Award,
  Calendar,
  Eye,
} from 'lucide-react-native';
import { Stack } from 'expo-router';
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

  const { data: stats, isLoading, error, refetch } = trpc.users.getStats.useQuery(
    { userId: user?.id, timeFilter },
    {
      enabled: !!user?.id && user.id !== '' && user.id.length > 0,
      refetchOnMount: true,
      retry: 2,
      retryDelay: 1000,
    }
  );

  const formatWatchTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d${remainingHours > 0 ? ` ${remainingHours}h` : ''}`;
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

  const AnimatedBar = ({ item, index, height, barWidth, maxValue }: {
    item: ChartData;
    index: number;
    height: number;
    barWidth: number;
    maxValue: number;
  }) => {
    const animatedHeight = useRef(new Animated.Value(0)).current;
    const animatedOpacity = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.sequence([
        Animated.delay(index * 100),
        Animated.parallel([
          Animated.timing(animatedHeight, {
            toValue: height,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(animatedOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, [height, index, animatedHeight, animatedOpacity]);
    
    const isHighest = item.value === maxValue;
    
    return (
      <Animated.View style={[styles.barContainer, { opacity: animatedOpacity }]}>
        <View style={styles.barWrapper}>
          {/* Value label on top of bar */}
          {height > 15 && (
            <Text style={styles.barTopValue}>
              {activeStatType === 'time' ? formatWatchTime(item.value) : item.value.toString()}
            </Text>
          )}
          
          {/* Bar with gradient effect */}
          <Animated.View
            style={[
              styles.animatedBar,
              {
                width: barWidth,
                height: animatedHeight,
                shadowColor: item.color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isHighest ? 0.3 : 0.15,
                shadowRadius: isHighest ? 4 : 2,
                elevation: isHighest ? 4 : 2,
              }
            ]}
          >
            <LinearGradient
              colors={[
                item.color,
                item.color + 'E6',
                item.color + 'CC'
              ]}
              style={styles.barGradient}
            />
          </Animated.View>
          
          {/* Base line */}
          <View style={[styles.barBase, { width: barWidth }]} />
        </View>
        
        {/* Bottom labels */}
        <Text style={styles.barLabel} numberOfLines={1}>
          {item.label}
        </Text>
      </Animated.View>
    );
  };

  const renderBarChart = (data: ChartData[]) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.noDataText}>Nenhum dado disponível</Text>
        </View>
      );
    }

    const maxValue = Math.max(...data.map(d => d.value));
    const chartWidth = screenWidth - 120; // More space for Y-axis labels
    const barWidth = Math.min(32, Math.max(20, (chartWidth - (data.length - 1) * 8) / data.length));

    return (
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxisLabels}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const value = Math.round(maxValue * ratio);
            return (
              <Text 
                key={index} 
                style={[
                  styles.yAxisLabel, 
                  { bottom: 50 + (120 * ratio) }
                ]}
              >
                {activeStatType === 'time' ? formatWatchTime(value) : value.toString()}
              </Text>
            );
          })}
        </View>
        
        {/* Chart grid lines */}
        <View style={styles.chartGrid}>
          {[0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <View 
              key={index} 
              style={[
                styles.gridLine, 
                { bottom: 50 + (120 * ratio) }
              ]} 
            />
          ))}
        </View>
        
        <View style={styles.chart}>
          {data.map((item, index) => {
            const height = maxValue > 0 ? Math.max(8, (item.value / maxValue) * 120) : 8;
            return (
              <AnimatedBar
                key={`${item.label}-${index}`}
                item={item}
                index={index}
                height={height}
                barWidth={barWidth}
                maxValue={maxValue}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderPieChart = (data: ChartData[]) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.pieChartContainer}>
          <Text style={styles.noDataText}>Nenhum gênero registrado</Text>
        </View>
      );
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChart}>
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <View key={`${item.label}-${index}`} style={styles.pieItem}>
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
    const avgPerDay = stats.average_episodes_per_day || 0;
    const completionRate = stats.completion_rate || 0;

    return (
      <View style={styles.overviewGrid}>
        <LinearGradient
          colors={[COLORS.accent + '20', COLORS.accent + '10']}
          style={styles.overviewCard}
        >
          <Clock size={28} color={COLORS.accent} />
          <Text style={styles.overviewValue}>{formatWatchTime(totalMinutes)}</Text>
          <Text style={styles.overviewLabel}>Tempo Total</Text>
          <Text style={styles.overviewSubtext}>
            {stats.total_episodes_watched} episódios
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#4ECDC4' + '20', '#4ECDC4' + '10']}
          style={styles.overviewCard}
        >
          <Trophy size={28} color="#4ECDC4" />
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
          <Target size={28} color="#FF6B9D" />
          <Text style={styles.overviewValue}>{avgPerDay.toFixed(1)}</Text>
          <Text style={styles.overviewLabel}>Episódios/Dia</Text>
          <Text style={styles.overviewSubtext}>
            Média diária
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#96CEB4' + '20', '#96CEB4' + '10']}
          style={styles.overviewCard}
        >
          <Zap size={28} color="#96CEB4" />
          <Text style={styles.overviewValue}>{stats.dramas_watching}</Text>
          <Text style={styles.overviewLabel}>Assistindo</Text>
          <Text style={styles.overviewSubtext}>
            Em progresso
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#FFEAA7' + '20', '#FFEAA7' + '10']}
          style={styles.overviewCard}
        >
          <Eye size={28} color="#FFEAA7" />
          <Text style={styles.overviewValue}>{stats.dramas_in_watchlist}</Text>
          <Text style={styles.overviewLabel}>Na Lista</Text>
          <Text style={styles.overviewSubtext}>
            Para assistir
          </Text>
        </LinearGradient>

        <LinearGradient
          colors={['#DDA0DD' + '20', '#DDA0DD' + '10']}
          style={styles.overviewCard}
        >
          <Calendar size={28} color="#DDA0DD" />
          <Text style={styles.overviewValue}>{stats.most_active_hour}h</Text>
          <Text style={styles.overviewLabel}>Hora Favorita</Text>
          <Text style={styles.overviewSubtext}>
            Mais ativo
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderAchievements = () => {
    if (!stats) return null;

    const achievements = [
      { 
        icon: Trophy, 
        title: 'Maratonista', 
        description: 'Assistiu 10+ dramas', 
        unlocked: stats.dramas_completed >= 10, 
        color: '#FFD700',
        progress: `${stats.dramas_completed}/10`
      },
      { 
        icon: Star, 
        title: 'Crítico', 
        description: 'Completou 50+ dramas', 
        unlocked: stats.dramas_completed >= 50, 
        color: '#FF6B9D',
        progress: `${stats.dramas_completed}/50`
      },
      { 
        icon: Award, 
        title: 'Explorador', 
        description: 'Assistiu 5+ gêneros', 
        unlocked: (stats.genre_data?.length || 0) >= 5, 
        color: '#4ECDC4',
        progress: `${stats.genre_data?.length || 0}/5`
      },
      { 
        icon: Target, 
        title: 'Dedicado', 
        description: '100h+ assistidas', 
        unlocked: (stats.total_watch_time_minutes || 0) >= 6000, 
        color: '#96CEB4',
        progress: `${Math.round((stats.total_watch_time_minutes || 0) / 60)}h/100h`
      },
      { 
        icon: Clock, 
        title: 'Lenda', 
        description: 'Completou 100+ dramas', 
        unlocked: stats.dramas_completed >= 100, 
        color: '#FFEAA7',
        progress: `${stats.dramas_completed}/100`
      },
      { 
        icon: Zap, 
        title: 'Velocista', 
        description: '500+ episódios', 
        unlocked: (stats.total_episodes_watched || 0) >= 500, 
        color: '#DDA0DD',
        progress: `${stats.total_episodes_watched || 0}/500`
      },
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
                { opacity: achievement.unlocked ? 1 : 0.7 }
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
                <Text style={styles.achievementProgress}>
                  {achievement.progress}
                </Text>
                {achievement.unlocked && (
                  <View style={styles.unlockedBadge}>
                    <Text style={styles.unlockedText}>✓ Desbloqueado</Text>
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
              fontSize: 20,
              fontWeight: "600",
              color: COLORS.text,
            },
            headerShadowVisible: false,
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
              fontSize: 20,
              fontWeight: "600",
              color: COLORS.text,
            },
            headerShadowVisible: false,
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
            fontSize: 20,
            fontWeight: "600",
            color: COLORS.text,
          },
          headerShadowVisible: false,
        }}
      />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Time Filter Tabs */}
        <View style={styles.filtersContainer}>
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
              {renderBarChart(stats?.time_data || [])}
              
              {stats && (
                <View style={styles.timeInsights}>
                  <Text style={styles.insightsTitle}>Insights</Text>
                  <Text style={styles.insightText}>
                    • Você assiste em média {stats.average_episodes_per_day.toFixed(1)} episódios por dia
                  </Text>
                  <Text style={styles.insightText}>
                    • Seu horário mais ativo é às {stats.most_active_hour}h
                  </Text>
                  <Text style={styles.insightText}>
                    • Total de {stats.total_episodes_watched} episódios assistidos
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {activeStatType === 'genres' && (
            <View>
              <View style={styles.sectionHeader}>
                <Star size={20} color={COLORS.accent} />
                <Text style={styles.sectionTitle}>Distribuição por Gêneros</Text>
              </View>
              {renderPieChart(stats?.genre_data || [])}
              
              {stats?.genre_data && stats.genre_data.length > 0 && (
                <View style={styles.genreInsights}>
                  <Text style={styles.insightsTitle}>Suas Preferências</Text>
                  <Text style={styles.insightText}>
                    • {stats.genre_data[0]?.label} é seu gênero favorito ({stats.genre_data[0]?.value}%)
                  </Text>
                  <Text style={styles.insightText}>
                    • Você gosta de variedade - {stats.genre_data.length} gêneros diferentes
                  </Text>
                  {stats.genre_data.length < 5 && (
                    <Text style={styles.insightText}>
                      • Recomendação: Experimente mais gêneros para descobrir novos favoritos
                    </Text>
                  )}
                </View>
              )}
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
  filtersContainer: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 220,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
    marginLeft: 60,
    marginRight: 20,
    paddingTop: 30,
    gap: 8,
  },
  barContainer: {
    alignItems: 'center',
    position: 'relative',
    minWidth: 20,
  },
  barWrapper: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  animatedBar: {
    borderRadius: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    minHeight: 8,
    overflow: 'hidden',
  },
  barGradient: {
    flex: 1,
    borderRadius: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barBase: {
    height: 1.5,
    backgroundColor: COLORS.border + '60',
    borderRadius: 1,
    marginTop: 1,
  },
  barTopValue: {
    fontSize: 10,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    position: 'absolute',
    top: -18,
    zIndex: 1,
    minWidth: 30,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 6,
    maxWidth: 40,
  },
  chartGrid: {
    position: 'absolute',
    left: 60,
    right: 20,
    top: 50,
    bottom: 50,
    pointerEvents: 'none',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0.5,
    backgroundColor: COLORS.border + '40',
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 50,
    bottom: 50,
    width: 55,
    pointerEvents: 'none',
  },
  yAxisLabel: {
    position: 'absolute',
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'right',
    right: 8,
    fontWeight: '500',
    transform: [{ translateY: -6 }],
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: 20,
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
    minHeight: 160,
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
  achievementProgress: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  unlockedBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  unlockedText: {
    fontSize: 10,
    color: COLORS.background,
    fontWeight: '600',
  },
});