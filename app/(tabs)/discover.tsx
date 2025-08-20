import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { X, Heart, RotateCcw, Crown } from 'lucide-react-native';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useUserLists } from '@/hooks/useUserStore';
import { useAuth } from '@/hooks/useAuth';
import SwipeCard from '@/components/SwipeCard';
import PremiumLimitModal from '@/components/PremiumLimitModal';
import type { Drama } from '@/types/drama';

export default function DiscoverScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addToList } = useUserLists();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [cachedDramas, setCachedDramas] = useState<Drama[]>([]);
  const [isSwipeInProgress, setIsSwipeInProgress] = useState<boolean>(false);
  const swipeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Query para obter status de swipes diários
  const swipesStatusQuery = trpc.discover.getDailySwipesStatus.useQuery(
    undefined,
    {
      enabled: !!user,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );

  // Query para obter dramas pré-selecionados - otimizado para Android
  const discoverDramasQuery = trpc.discover.getDramas.useQuery(
    { limit: Platform.OS === 'android' ? 10 : 15 }, // Ainda menor no Android
    {
      enabled: !!user,
      staleTime: 2 * 60 * 60 * 1000, // 2 horas - cache mais longo
      refetchOnWindowFocus: false,
      retry: 1,
      refetchInterval: false,
      gcTime: 10 * 60 * 1000, // 10 minutos de garbage collection
    }
  );
  
  // Query otimizada para buscar detalhes dos dramas em lotes menores
  const dramasDetailsQuery = useQuery({
    queryKey: ['discover-dramas-details', discoverDramasQuery.data],
    queryFn: async () => {
      const dramaIds = discoverDramasQuery.data;
      
      if (!dramaIds || dramaIds.length === 0) {
        console.log('No drama IDs available');
        return [];
      }
      
      console.log(`Fetching details for ${dramaIds.length} K-dramas`);
      
      // Buscar em lotes menores no Android para melhor performance
      const batchSize = Platform.OS === 'android' ? 3 : 5;
      const batches = [];
      for (let i = 0; i < dramaIds.length; i += batchSize) {
        batches.push(dramaIds.slice(i, i + batchSize));
      }
      
      const allDramas: Drama[] = [];
      
      for (const batch of batches) {
        try {
          const batchPromises = batch.map(async (dramaId: number) => {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), Platform.OS === 'android' ? 15000 : 10000); // Timeout mais generoso
              
              const response = await fetch(
                `https://api.themoviedb.org/3/tv/${dramaId}?api_key=8265bd1679663a7ea12ac168da84d2e8&language=pt-BR`,
                { signal: controller.signal }
              );
              
              clearTimeout(timeoutId);
              
              if (response.ok) {
                const data = await response.json();
                return data;
              }
              return null;
            } catch (error) {
              // Handle AbortError specifically
              if (error instanceof Error && error.name === 'AbortError') {
                console.warn(`Request timeout for drama ${dramaId}, retrying...`);
                // Retry once without timeout for aborted requests
                try {
                  const retryResponse = await fetch(
                    `https://api.themoviedb.org/3/tv/${dramaId}?api_key=8265bd1679663a7ea12ac168da84d2e8&language=pt-BR`
                  );
                  if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    return retryData;
                  }
                } catch (retryError) {
                  console.error(`Retry failed for drama ${dramaId}:`, retryError);
                }
              } else {
                console.error(`Error fetching drama ${dramaId}:`, error);
              }
              return null;
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          const validBatchDramas = batchResults.filter(drama => drama !== null) as Drama[];
          allDramas.push(...validBatchDramas);
          
          // Pausa entre batches para não sobrecarregar a API
          if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, Platform.OS === 'android' ? 300 : 150));
          }
        } catch (error) {
          console.error('Error processing batch:', error);
        }
      }
      
      console.log(`Successfully fetched ${allDramas.length} K-drama details`);
      return allDramas;
    },
    enabled: !!discoverDramasQuery.data && discoverDramasQuery.data.length > 0,
    staleTime: 4 * 60 * 60 * 1000, // 4 horas - cache muito longo
    refetchOnWindowFocus: false,
    retry: 1,
    refetchInterval: false,
    gcTime: 30 * 60 * 1000, // 30 minutos de garbage collection
    networkMode: 'offlineFirst', // Prioriza cache offline
  });
  
  // Mutations
  const skipDramaMutation = trpc.discover.skipDrama.useMutation({
    onSuccess: () => {
      console.log('Drama skipped successfully');
    },
    onError: (error) => {
      console.error('Error skipping drama:', error);
    }
  });
  
  const incrementSwipesMutation = trpc.discover.incrementDailySwipes.useMutation({
    onSuccess: (data) => {
      console.log('Swipe incremented:', data);
      // Refetch swipes status
      swipesStatusQuery.refetch();
    },
    onError: (error) => {
      console.error('Error incrementing swipes:', error);
    }
  });

  // Use fresh data or cached dramas
  const dramas = useMemo(() => {
    if (dramasDetailsQuery.data && dramasDetailsQuery.data.length > 0) {
      // Cache the fresh data
      setCachedDramas(dramasDetailsQuery.data);
      return dramasDetailsQuery.data;
    }
    return cachedDramas;
  }, [dramasDetailsQuery.data, cachedDramas]);
  
  const currentDrama = dramas[currentIndex];
  const nextDrama = dramas[currentIndex + 1];
  
  // Swipe status
  const swipesUsed = swipesStatusQuery.data?.swipes_used || 0;
  const remainingSwipes = swipesStatusQuery.data?.remaining_swipes || 20;
  const canSwipe = swipesStatusQuery.data?.can_swipe || true;
  const isPremium = swipesStatusQuery.data?.is_premium || false;
  const dailyLimit = swipesStatusQuery.data?.daily_limit || 20;

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!user) {
      console.log('User not authenticated');
      return;
    }

    // Previne múltiplos swipes simultâneos
    if (isSwipeInProgress) {
      console.log('Swipe already in progress, ignoring');
      return;
    }

    // Check if user can swipe
    if (!canSwipe) {
      console.log('User reached swipe limit, showing modal');
      // Pequeno delay para garantir que o modal seja exibido corretamente no Android
      setTimeout(() => {
        setShowLimitModal(true);
      }, Platform.OS === 'android' ? 100 : 0);
      return;
    }

    if (!currentDrama) {
      console.log('No current drama available');
      return;
    }

    setIsSwipeInProgress(true);
    
    // Clear any existing timeout
    if (swipeTimeoutRef.current) {
      clearTimeout(swipeTimeoutRef.current);
    }

    try {
      // Move to next drama immediately for better UX
      const nextIndex = currentIndex < dramas.length - 1 ? currentIndex + 1 : 0;
      setCurrentIndex(nextIndex);
      
      // Handle backend operations in background
      const handleBackgroundOperations = async () => {
        try {
          // Increment swipe count
          const swipeResult = await incrementSwipesMutation.mutateAsync();
          
          if (!swipeResult.success) {
            // Revert index change if swipe failed
            setCurrentIndex(currentIndex);
            console.log('Swipe failed, showing limit modal');
            setTimeout(() => {
              setShowLimitModal(true);
            }, Platform.OS === 'android' ? 100 : 0);
            return;
          }

          if (direction === 'right') {
            // Add to watchlist with metadata for better performance
            await addToList(currentDrama.id, 'watchlist', (currentDrama as any).number_of_episodes || undefined, {
              name: currentDrama.name,
              poster_path: currentDrama.poster_path,
              first_air_date: currentDrama.first_air_date,
              number_of_episodes: (currentDrama as any).number_of_episodes || null
            });
            console.log(`Added ${currentDrama.name} to watchlist`);
          } else {
            // Skip drama
            await skipDramaMutation.mutateAsync({ dramaId: currentDrama.id });
            console.log(`Skipped ${currentDrama.name}`);
          }
          
          // Fetch more dramas when getting close to the end (menos agressivo no Android)
          const threshold = Platform.OS === 'android' ? 2 : 3;
          if (nextIndex >= dramas.length - threshold) {
            console.log('Getting close to end, fetching more dramas...');
            // Debounce no Android para evitar múltiplas chamadas
            if (Platform.OS === 'android') {
              setTimeout(() => {
                discoverDramasQuery.refetch();
              }, 500);
            } else {
              discoverDramasQuery.refetch();
            }
          }
        } catch (error) {
          console.error('Error in background operations:', error);
          // Don't revert UI changes for background errors
        }
      };
      
      // Execute background operations without blocking UI
      handleBackgroundOperations();
      
    } catch (error) {
      console.error('Error handling swipe:', error);
      // Revert index change on error
      setCurrentIndex(currentIndex);
    } finally {
      // Reset swipe progress after a short delay
      swipeTimeoutRef.current = setTimeout(() => {
        setIsSwipeInProgress(false);
      }, 300) as any;
    }
  }, [user, canSwipe, currentDrama, currentIndex, dramas.length, addToList, skipDramaMutation, incrementSwipesMutation, discoverDramasQuery, isSwipeInProgress]);

  const handleSwipeLeft = useCallback(() => {
    handleSwipe('left');
  }, [handleSwipe]);

  const handleSwipeRight = useCallback(() => {
    handleSwipe('right');
  }, [handleSwipe]);

  const handleCardPress = useCallback(() => {
    if (currentDrama) {
      router.push(`/drama/${currentDrama.id}`);
    }
  }, [currentDrama, router]);

  const handleInfoPress = useCallback(() => {
    if (currentDrama) {
      router.push(`/drama/${currentDrama.id}`);
    }
  }, [currentDrama, router]);

  const handleRefresh = useCallback(() => {
    if (user && !discoverDramasQuery.isFetching && !dramasDetailsQuery.isFetching) {
      discoverDramasQuery.refetch();
      dramasDetailsQuery.refetch();
      swipesStatusQuery.refetch();
      setCurrentIndex(0);
      setCachedDramas([]);
    }
  }, [user, discoverDramasQuery, dramasDetailsQuery, swipesStatusQuery]);

  const handleUpgrade = useCallback(() => {
    console.log('Navigating to subscription screen');
    setShowLimitModal(false);
    // Navigate to premium subscription screen
    setTimeout(() => {
      router.push('/subscription');
    }, Platform.OS === 'android' ? 200 : 100);
  }, [router]);
  
  const handleCloseModal = useCallback(() => {
    console.log('Closing limit modal');
    setShowLimitModal(false);
  }, []);

  React.useEffect(() => {
    if (!isPremium && !canSwipe && !showLimitModal) {
      setTimeout(() => setShowLimitModal(true), Platform.OS === 'android' ? 150 : 0);
    }
  }, [canSwipe, isPremium, showLimitModal]);

  // Loading states
  const isInitialLoading = user 
    ? ((discoverDramasQuery.isLoading || dramasDetailsQuery.isLoading || swipesStatusQuery.isLoading) && dramas.length === 0)
    : false;
    
  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorTitle}>Faça login para descobrir</Text>
        <Text style={styles.errorText}>
          Você precisa estar logado para descobrir novos K-dramas personalizados.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.push('/onboarding')}>
          <Text style={styles.retryButtonText}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    );
  }
    
  if (isInitialLoading && dramas.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Carregando K-dramas...</Text>
      </View>
    );
  }

  const hasError = discoverDramasQuery.error || dramasDetailsQuery.error;
    
  if ((hasError || dramas.length === 0) && !isInitialLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorTitle}>Ops! Algo deu errado</Text>
        <Text style={styles.errorText}>
          {dramas.length === 0 
            ? 'Não há mais K-dramas disponíveis para descobrir no momento. Tente novamente mais tarde.'
            : 'Não conseguimos carregar os K-dramas. Verifique sua conexão e tente novamente.'
          }
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <RotateCcw size={20} color={COLORS.background} />
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Descobrir</Text>
          <View style={styles.statsContainer}>
            {isPremium ? (
              <View style={styles.premiumBadge}>
                <Crown size={16} color="#FDCB6E" />
                <Text style={styles.premiumText}>Ilimitado</Text>
              </View>
            ) : (
              <Text style={styles.swipeCounter}>
                {remainingSwipes} swipes restantes
              </Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <RotateCcw size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Cards Container */}
      <View style={styles.cardsContainer}>
        {/* Next Card (Background) */}
        {nextDrama && (
          <SwipeCard
            drama={nextDrama}
            onSwipeLeft={() => {}}
            onSwipeRight={() => {}}
            onPress={() => {}}
            onInfoPress={() => {}}
            isActive={false}
            testID="next-drama-card"
          />
        )}
        
        {/* Current Card (Foreground) */}
        {currentDrama && (
          <SwipeCard
            key={`${currentDrama.id}-${currentIndex}`}
            drama={currentDrama}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onPress={handleCardPress}
            onInfoPress={handleInfoPress}
            isActive={true}
            testID="current-drama-card"
          />
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.passButton, (isSwipeInProgress) && { opacity: 0.5 }]}
          onPress={handleSwipeLeft}
          disabled={isSwipeInProgress}
        >
          <X size={28} color={(!canSwipe || isSwipeInProgress) ? "#999" : "#FF6B6B"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.likeButton, (isSwipeInProgress) && { opacity: 0.5 }]}
          onPress={handleSwipeRight}
          disabled={isSwipeInProgress}
        >
          <Heart size={28} color={(!canSwipe || isSwipeInProgress) ? "#999" : COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Deslize para a esquerda para pular • Deslize para a direita para adicionar à lista
        </Text>
      </View>

      {/* Premium Limit Modal */}
      <PremiumLimitModal
        visible={showLimitModal}
        onClose={handleCloseModal}
        onUpgrade={handleUpgrade}
        swipesUsed={swipesUsed}
        dailyLimit={dailyLimit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeCounter: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDCB6E' + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FDCB6E',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 60,
    paddingVertical: 20,
    gap: 60,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  passButton: {
    backgroundColor: '#FF6B6B' + '20',
  },
  likeButton: {
    backgroundColor: COLORS.accent + '20',
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  instructionsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
});