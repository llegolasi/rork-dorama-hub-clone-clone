import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, MessageCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import AdBanner from '@/components/ads/AdBanner';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  cover_image_url?: string;
  plain_text_content: string;
  published_at: string;
  created_at: string;
  status: string;
}

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const newsQuery = trpc.news.getPosts.useQuery({
    limit: 50,
    offset: 0
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await newsQuery.refetch();
    setRefreshing(false);
  };

  const handleNewsPress = useCallback((item: NewsItem) => {
    console.log('[News] Navigate to detail for', item.id);
    router.push(`/news/${item.id}` as any);
  }, [router]);

  const getExcerpt = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Agora mesmo';
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return 'Ontem';
      } else if (diffInDays < 7) {
        return `${diffInDays} dias atrás`;
      } else {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    }
  };

  const renderNewsCard = useCallback(({ item }: { item: NewsItem }) => (
    <TouchableOpacity
      style={styles.newsCard}
      onPress={() => handleNewsPress(item)}
      activeOpacity={0.8}
      testID={`news-card-${item.id}`}
    >
      {item.cover_image_url && (
        <Image 
          source={{ uri: item.cover_image_url }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.authorContainer}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitial}>📰</Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>Dorama Hub</Text>
              <View style={styles.timeContainer}>
                <Calendar size={12} color={COLORS.textSecondary} />
                <Text style={styles.timeText}>{formatDate(item.published_at || item.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <Text style={styles.newsTitle}>{item.title}</Text>
        <Text style={styles.newsContent}>{getExcerpt(item.plain_text_content)}</Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.engagementContainer}>
            <MessageCircle size={14} color={COLORS.textSecondary} />
            <Text style={styles.engagementText}>Leia mais</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), [handleNewsPress]);

  const renderNewsItem = ({ item, index }: { item: NewsItem; index: number }) => {
    const showAd = index > 0 && index % 4 === 0;
    return (
      <View>
        {showAd && (
          <AdBanner
            adUnitId="ca-app-pub-2720532297693900/8165623336"
            size="BANNER"
            placement={`news-list-${index}`}
          />
        )}
        {renderNewsCard({ item })}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Últimas Notícias</Text>
      <Text style={styles.subtitle}>
        Fique por dentro das novidades do mundo dos K-dramas
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Nenhuma notícia disponível</Text>
      <Text style={styles.emptyMessage}>
        Não há notícias para exibir no momento. Tente novamente mais tarde.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.loadingText}>Carregando notícias...</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Notícias',
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: '700',
          },
          headerShadowVisible: false,
        }} 
      />
      
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        {newsQuery.isLoading ? (
          renderLoadingState()
        ) : (
          <FlatList
            data={newsQuery.data || []}
            keyExtractor={(item) => item.id}
            renderItem={renderNewsItem}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.accent}
                colors={[COLORS.accent]}
              />
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  newsCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.border,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  newsContent: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  engagementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementText: {
    fontSize: 14,
    color: COLORS.accent,
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});