import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from './useAuth';

interface SwipeStatus {
  swipes_used: number;
  daily_limit: number;
  remaining_swipes: number;
  can_swipe: boolean;
  is_premium: boolean;
}

export function useSwipeLimit() {
  const [swipeStatus, setSwipeStatus] = useState<SwipeStatus>({
    swipes_used: 0,
    daily_limit: 20,
    remaining_swipes: 20,
    can_swipe: true,
    is_premium: false
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();
  
  // Query para obter status atual dos swipes
  const swipeStatusQuery = trpc.discover.getDailySwipesStatus.useQuery(
    undefined,
    {
      enabled: !!user,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    }
  );
  
  // Mutation para incrementar swipes
  const incrementSwipesMutation = trpc.discover.incrementDailySwipes.useMutation({
    onSuccess: (data) => {
      console.log('Swipe increment success:', data);
      if (data.success) {
        setSwipeStatus({
          swipes_used: data.swipes_used,
          daily_limit: data.daily_limit,
          remaining_swipes: data.remaining_swipes === -1 ? Infinity : data.remaining_swipes,
          can_swipe: data.is_premium || data.swipes_used < data.daily_limit,
          is_premium: data.is_premium
        });
        // Also refetch the status to ensure consistency
        swipeStatusQuery.refetch();
      }
    },
    onError: (error) => {
      console.error('Error incrementing swipes:', error);
    }
  });
  
  useEffect(() => {
    if (swipeStatusQuery.data) {
      setSwipeStatus({
        swipes_used: swipeStatusQuery.data.swipes_used,
        daily_limit: swipeStatusQuery.data.daily_limit,
        remaining_swipes: swipeStatusQuery.data.remaining_swipes === -1 ? Infinity : swipeStatusQuery.data.remaining_swipes,
        can_swipe: swipeStatusQuery.data.can_swipe,
        is_premium: swipeStatusQuery.data.is_premium
      });
    }
    setIsLoading(swipeStatusQuery.isLoading);
  }, [swipeStatusQuery.data, swipeStatusQuery.isLoading]);
  
  const incrementSwipeCount = async (): Promise<boolean> => {
    try {
      const result = await incrementSwipesMutation.mutateAsync();
      return result.success;
    } catch (error) {
      console.error('Error incrementing swipe count:', error);
      return false;
    }
  };
  
  return {
    swipesUsed: swipeStatus.swipes_used,
    remainingSwipes: swipeStatus.remaining_swipes,
    canSwipe: swipeStatus.can_swipe,
    isPremium: swipeStatus.is_premium,
    isLoading: isLoading || incrementSwipesMutation.isPending,
    incrementSwipeCount,
    dailyLimit: swipeStatus.daily_limit,
    refetch: swipeStatusQuery.refetch
  };
}