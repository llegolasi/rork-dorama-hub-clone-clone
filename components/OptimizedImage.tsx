import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/colors';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: any;
  contentFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  placeholder?: string;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk';
  enableLiveTextInteraction?: boolean;
  allowDownscaling?: boolean;
}

export default function OptimizedImage({
  source,
  style,
  contentFit = 'cover',
  placeholder,
  priority = 'normal',
  cachePolicy = 'memory-disk',
  enableLiveTextInteraction = false,
  allowDownscaling = true
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [shouldLoad, setShouldLoad] = useState<boolean>(Platform.OS === 'ios');
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = Platform.OS === 'android' ? 2 : 0;

  // Delay loading on Android to prevent blocking
  useEffect(() => {
    if (Platform.OS === 'android') {
      const timer = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          setShouldLoad(true);
        });
      }, 100); // Small delay to prevent blocking
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    
    // Android timeout for slow loading images
    if (Platform.OS === 'android') {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      loadTimeoutRef.current = setTimeout(() => {
        console.log('Image load timeout on Android');
        setIsLoading(false);
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          // Retry with a different approach
          setTimeout(() => {
            setIsLoading(true);
            setHasError(false);
          }, 1000);
        } else {
          setHasError(true);
        }
      }, 8000); // 8 second timeout
    }
  }, [maxRetries]);

  const handleLoadEnd = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    setIsLoading(false);
    
    // Retry logic for Android
    if (Platform.OS === 'android' && retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      console.log(`Image load error, retrying (${retryCountRef.current}/${maxRetries}):`, typeof source === 'object' ? source.uri : source);
      setTimeout(() => {
        setIsLoading(true);
        setHasError(false);
      }, 1000 * retryCountRef.current); // Exponential backoff
    } else {
      setHasError(true);
      console.log('Image load error (final):', typeof source === 'object' ? source.uri : source);
    }
  }, [source, maxRetries]);

  // Android-specific optimizations
  const androidProps = Platform.OS === 'android' ? {
    priority: 'low' as const, // Always use low priority on Android to prevent blocking
    cachePolicy: 'disk' as const, // Prefer disk cache on Android
    recyclingKey: typeof source === 'object' ? source.uri : undefined,
    blurRadius: 0, // Disable blur on Android for performance
  } : {
    priority,
    cachePolicy,
  };

  // Optimize source for Android
  const optimizedSource = Platform.OS === 'android' && typeof source === 'object' 
    ? {
        ...source,
        // Add cache headers for better Android performance
        headers: {
          'Cache-Control': 'max-age=31536000',
          'Accept': 'image/webp,image/jpeg,image/png,*/*',
        }
      }
    : source;

  // Don't render until ready on Android
  if (Platform.OS === 'android' && !shouldLoad) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.loadingContainer, style]}>
          <ActivityIndicator 
            size="small" 
            color={COLORS.textSecondary}
            style={styles.loadingIndicator}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={optimizedSource}
        style={[StyleSheet.absoluteFillObject, style]}
        contentFit={contentFit}
        placeholder={placeholder}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        transition={Platform.OS === 'android' ? 100 : 300}
        priority={androidProps.priority}
        cachePolicy={androidProps.cachePolicy}
        recyclingKey={androidProps.recyclingKey}
        allowDownscaling={Platform.OS === 'android' ? true : allowDownscaling}
        autoplay={false}
      />
      
      {isLoading && !hasError && (
        <View style={[styles.loadingContainer, style]}>
          <ActivityIndicator 
            size="small" 
            color={COLORS.textSecondary}
            style={styles.loadingIndicator}
          />
        </View>
      )}
      
      {hasError && (
        <View style={[styles.errorContainer, style]}>
          <View style={styles.errorPlaceholder} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  loadingIndicator: {
    opacity: Platform.OS === 'android' ? 0.5 : 0.7,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  errorPlaceholder: {
    width: '60%',
    height: '60%',
    backgroundColor: COLORS.border,
    borderRadius: 8,
    opacity: 0.3,
  },
});