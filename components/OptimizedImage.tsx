import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
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
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setHasError(true);
      }, 10000); // 10 second timeout
    }
  }, []);

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
    setHasError(true);
    console.log('Image load error:', typeof source === 'object' ? source.uri : source);
  }, [source]);

  // Android-specific optimizations
  const androidProps = Platform.OS === 'android' ? {
    priority: 'low' as const, // Always use low priority on Android to prevent blocking
    cachePolicy: 'disk' as const, // Prefer disk cache on Android
    recyclingKey: typeof source === 'object' ? source.uri : undefined,
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
        }
      }
    : source;

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
        transition={Platform.OS === 'android' ? 150 : 300}
        priority={androidProps.priority}
        cachePolicy={androidProps.cachePolicy}
        recyclingKey={androidProps.recyclingKey}
      />
      
      {isLoading && (
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
    opacity: 0.7,
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