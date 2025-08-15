import React, { useState } from 'react';
import { 
  ActivityIndicator, 
  FlatList, 
  RefreshControl, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Platform,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { Bell, BellRing, Clock, Star } from 'lucide-react-native';

import { COLORS } from '@/constants/colors';
import { getUpcomingDramas } from '@/services/api';
import { TMDB_IMAGE_BASE_URL, POSTER_SIZE } from '@/constants/config';
import { Drama } from '@/types/drama';

interface ReleaseItem extends Drama {
  hasReminder?: boolean;
}

export default function ReleasesCalendarScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  const upcomingQuery = useQuery({
    queryKey: ['upcoming-dramas'],
    queryFn: () => getUpcomingDramas(1)
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await upcomingQuery.refetch();
    setRefreshing(false);
  };

  const formatReleaseDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return { text: 'Hoje', color: COLORS.accent };
    } else if (diffDays === 1) {
      return { text: 'Amanhã', color: COLORS.accent };
    } else if (diffDays <= 7) {
      return { text: `Em ${diffDays} dias`, color: '#FF9500' };
    } else if (diffDays <= 30) {
      const weeks = Math.ceil(diffDays / 7);
      return { text: `Em ${weeks} semana${weeks > 1 ? 's' : ''}`, color: COLORS.textSecondary };
    } else {
      return { 
        text: date.toLocaleDateString('pt-BR', { 
          day: 'numeric', 
          month: 'short',
          year: diffDays > 365 ? 'numeric' : undefined
        }), 
        color: COLORS.textSecondary 
      };
    }
  };

  const getTimeSection = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return 'Próxima Semana';
    } else if (diffDays <= 30) {
      return 'Este Mês';
    } else {
      return 'Próximos Meses';
    }
  };

  const handleReminderToggle = (drama: Drama) => {
    // TODO: Implementar lógica de lembretes
    // Por enquanto, apenas mostrar um alert
    Alert.alert(
      'Lembrete',
      `Lembrete para "${drama.name}" será implementado em breve!`,
      [{ text: 'OK' }]
    );
  };

  const groupedData = React.useMemo(() => {
    if (!upcomingQuery.data?.results) return [];
    
    const groups: { [key: string]: ReleaseItem[] } = {};
    
    upcomingQuery.data.results.forEach((drama) => {
      const section = getTimeSection(drama.first_air_date);
      if (!groups[section]) {
        groups[section] = [];
      }
      groups[section].push({
        ...drama,
        hasReminder: false // TODO: Verificar se usuário tem lembrete ativo
      });
    });
    
    // Converter para array de seções
    const sections = Object.keys(groups).map(sectionTitle => ({
      title: sectionTitle,
      data: groups[sectionTitle]
    }));
    
    // Ordenar seções por proximidade
    const sectionOrder = ['Próxima Semana', 'Este Mês', 'Próximos Meses'];
    sections.sort((a, b) => {
      const aIndex = sectionOrder.indexOf(a.title);
      const bIndex = sectionOrder.indexOf(b.title);
      return aIndex - bIndex;
    });
    
    // Flatten para FlatList
    const flatData: ({ type: 'header'; title: string } | { type: 'item'; item: ReleaseItem })[] = [];
    
    sections.forEach(section => {
      flatData.push({ type: 'header', title: section.title });
      section.data.forEach(item => {
        flatData.push({ type: 'item', item });
      });
    });
    
    return flatData;
  }, [upcomingQuery.data]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
        </View>
      );
    }
    
    const drama = item.item as ReleaseItem;
    const releaseInfo = formatReleaseDate(drama.first_air_date);
    const formattedRating = drama.vote_average ? drama.vote_average.toFixed(1) : '0.0';
    
    return (
      <TouchableOpacity
        style={styles.dramaCard}
        onPress={() => router.push(`/drama/${drama.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.posterContainer}>
          <Image
            source={{
              uri: drama.poster_path
                ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${drama.poster_path}`
                : 'https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=No+Poster'
            }}
            style={styles.poster}
            contentFit="cover"
          />
        </View>
        
        <View style={styles.dramaInfo}>
          <Text style={styles.dramaTitle} numberOfLines={2}>
            {drama.name}
          </Text>
          <Text style={styles.dramaOriginalTitle} numberOfLines={1}>
            {drama.original_name}
          </Text>
          
          <View style={styles.metaInfo}>
            <View style={styles.releaseInfo}>
              <Clock size={14} color={releaseInfo.color} />
              <Text style={[styles.releaseText, { color: releaseInfo.color }]}>
                {releaseInfo.text}
              </Text>
            </View>
            
            {drama.vote_average > 0 && (
              <View style={styles.ratingInfo}>
                <Star size={12} color={COLORS.accent} fill={COLORS.accent} />
                <Text style={styles.ratingText}>{formattedRating}</Text>
              </View>
            )}
          </View>
          
          {drama.overview && (
            <Text style={styles.overview} numberOfLines={2}>
              {drama.overview}
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.reminderButton}
          onPress={() => handleReminderToggle(drama)}
          activeOpacity={0.7}
        >
          {drama.hasReminder ? (
            <BellRing size={20} color={COLORS.accent} />
          ) : (
            <Bell size={20} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (upcomingQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            title: 'Calendário de Lançamentos',
            headerStyle: { backgroundColor: COLORS.background },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontSize: 24, fontWeight: '700' }
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando lançamentos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Calendário de Lançamentos',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontSize: 24, fontWeight: '700' }
        }} 
      />
      
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.listContent, 
          { paddingTop: Platform.OS === 'ios' ? 0 : 16 }
        ]}
        data={groupedData}
        keyExtractor={(item, index) => 
          item.type === 'header' ? `header-${item.title}` : `item-${item.item.id}-${index}`
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        testID="releases-calendar-list"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  dramaCard: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  posterContainer: {
    width: 80,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.card,
  },
  dramaInfo: {
    flex: 1,
    paddingRight: 12,
  },
  dramaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  dramaOriginalTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  releaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  releaseText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 2,
  },
  overview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  reminderButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignSelf: 'flex-start',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
});