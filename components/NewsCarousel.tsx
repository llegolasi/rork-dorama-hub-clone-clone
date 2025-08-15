import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, MessageCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

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

interface NewsCarouselProps {
  news: NewsItem[];
}

export default function NewsCarousel({ news }: NewsCarouselProps) {
  const router = useRouter();
  
  console.log('NewsCarousel rendered with news:', {
    newsLength: news?.length,
    news: news
  });

  const handleNewsPress = (item: NewsItem) => {
    router.push(`/news/${item.id}` as any);
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
      return `${diffInDays}d atrás`;
    }
  };

  const getExcerpt = (content: string, maxLength: number = 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  if (!news || news.length === 0) {
    console.log('NewsCarousel: No news data, showing placeholder');
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📰 Últimas Notícias</Text>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push('/news' as any)}
          >
            <Text style={styles.viewAllText}>Ver Todas</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Carregando notícias...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📰 Últimas Notícias</Text>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => router.push('/news' as any)}
        >
          <Text style={styles.viewAllText}>Ver Todas</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={296}
        snapToAlignment="start"
      >
        {news.slice(0, 5).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.newsCard}
            onPress={() => handleNewsPress(item)}
            activeOpacity={0.8}
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
              
              <Text style={styles.newsTitle} numberOfLines={3}>
                {item.title}
              </Text>
              
              <Text style={styles.newsContent} numberOfLines={3}>
                {getExcerpt(item.plain_text_content)}
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.engagementContainer}>
                  <MessageCircle size={14} color={COLORS.textSecondary} />
                  <Text style={styles.engagementText}>Leia mais</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  scrollView: {
    paddingLeft: 20,
  },
  scrollContent: {
    paddingRight: 20,
    flexGrow: 0,
  },
  newsCard: {
    width: 280,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  coverImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.border,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  authorInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  newsContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engagementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  engagementText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});