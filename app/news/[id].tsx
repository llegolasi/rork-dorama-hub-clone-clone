import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { WebView } from 'react-native-webview';
import InstagramStyleComments from '@/components/InstagramStyleComments';

const { width: screenWidth } = Dimensions.get('window');

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [webViewHeight, setWebViewHeight] = useState<number>(400);
  const [isWebViewLoaded, setIsWebViewLoaded] = useState<boolean>(false);

  const newsQuery = trpc.news.getPostById.useQuery({
    postId: id!
  }, {
    enabled: !!id
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.loadingText}>Carregando notícia...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Erro ao carregar</Text>
      <Text style={styles.errorMessage}>
        Não foi possível carregar a notícia. Tente novamente mais tarde.
      </Text>
    </View>
  );

  if (newsQuery.isLoading) {
    return (
      <>
        <Stack.Screen 
          options={{
            title: 'Carregando...',
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            headerTitleStyle: {
              fontWeight: '700',
            },
          }} 
        />
        <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
          {renderLoadingState()}
        </View>
      </>
    );
  }

  if (newsQuery.error || !newsQuery.data) {
    return (
      <>
        <Stack.Screen 
          options={{
            title: 'Erro',
            headerStyle: {
              backgroundColor: COLORS.background,
            },
            headerTintColor: COLORS.text,
            headerTitleStyle: {
              fontWeight: '700',
            },
          }} 
        />
        <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
          {renderErrorState()}
        </View>
      </>
    );
  }

  const post = newsQuery.data;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: ${COLORS.text};
          background-color: ${COLORS.background};
          margin: 0;
          padding: 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .content {
          padding: 20px;
          max-width: 100%;
        }
        img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 8px;
          margin: 16px 0;
          display: block;
        }
        iframe {
          max-width: 100% !important;
          width: 100% !important;
          height: 200px;
          border-radius: 8px;
          margin: 16px 0;
          border: none;
        }
        div[style*="position:relative"] {
          position: relative !important;
          width: 100% !important;
          max-width: 100% !important;
          padding-bottom: 56.25% !important;
          height: 0 !important;
          overflow: hidden !important;
          border-radius: 10px !important;
          margin: 16px 0 !important;
        }
        div[style*="position:relative"] iframe {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
        }
        p {
          margin: 16px 0;
          font-size: 16px;
          line-height: 1.6;
          word-wrap: break-word;
        }
        h1, h2, h3, h4, h5, h6 {
          color: ${COLORS.text};
          margin: 24px 0 16px 0;
          word-wrap: break-word;
        }
        a {
          color: ${COLORS.accent};
          text-decoration: none;
          word-wrap: break-word;
        }
        a:hover {
          text-decoration: underline;
        }
        blockquote {
          border-left: 4px solid ${COLORS.accent};
          padding-left: 16px;
          margin: 16px 0;
          font-style: italic;
          background-color: ${COLORS.card};
          padding: 16px;
          border-radius: 8px;
          word-wrap: break-word;
        }
        @media (max-width: 480px) {
          .content {
            padding: 16px;
          }
          p {
            font-size: 15px;
          }
          iframe {
            height: 180px;
          }
        }
      </style>
      <script>
        function sendHeight() {
          const height = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          );
          
          if (height > 100) {
            window.ReactNativeWebView?.postMessage(JSON.stringify({ 
              type: 'height', 
              height: height + 20
            }));
          }
        }
        
        // Send height once everything is loaded
        if (document.readyState === 'complete') {
          setTimeout(sendHeight, 100);
        } else {
          window.addEventListener('load', () => {
            setTimeout(sendHeight, 100);
          });
        }
      </script>
    </head>
    <body>
      <div class="content">
        ${post.html_content}
      </div>
    </body>
    </html>
  `;

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Notícia',
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: '700',
          },
        }} 
      />
      
      <View style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <InstagramStyleComments 
          articleId={post.id} 
          renderContent={() => (
            <View style={styles.contentHeader}>
              <View style={styles.header}>
                <View style={styles.authorContainer}>
                  <View style={styles.authorAvatar}>
                    <Text style={styles.authorInitial}>📰</Text>
                  </View>
                  <View style={styles.authorInfo}>
                    <Text style={styles.authorName}>Dorama Hub</Text>
                    <View style={styles.timeContainer}>
                      <Calendar size={14} color={COLORS.textSecondary} />
                      <Text style={styles.timeText}>
                        {formatDate(post.published_at || post.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <Text style={styles.title}>{post.title}</Text>
              
              {post.cover_image_url && (
                <Image 
                  source={{ uri: post.cover_image_url }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
              )}
              
              <View style={styles.contentContainer}>
                {Platform.OS === 'web' ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: post.html_content }}
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      lineHeight: '1.6',
                      color: COLORS.text,
                      fontSize: '16px'
                    }}
                  />
                ) : (
                  <WebView
                    source={{ html: htmlContent }}
                    style={[styles.webView, { height: webViewHeight }]}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    onMessage={(event) => {
                      try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'height' && data.height) {
                          const newHeight = Math.max(Math.min(data.height, 2500), 200);
                          setWebViewHeight(newHeight);
                          if (!isWebViewLoaded) {
                            setIsWebViewLoaded(true);
                          }
                        }
                      } catch (e) {
                        console.log('WebView message parsing error:', e);
                      }
                    }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={false}
                    mixedContentMode="compatibility"
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                  />
                )}
              </View>
              </View>
            )}
          />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentHeader: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  coverImage: {
    width: screenWidth,
    height: 200,
    backgroundColor: COLORS.border,
    marginBottom: 24,
  },
  contentContainer: {
    paddingHorizontal: 0,
    minHeight: 400,
  },
  webView: {
    backgroundColor: 'transparent',
    minHeight: 200,
    width: screenWidth,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});