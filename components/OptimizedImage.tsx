import React, { useState, useCallback } from 'react';
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
}

export default function OptimizedImage({
  source,
  style,
  contentFit = 'cover',
  placeholder,
  priority = 'normal',
  cachePolicy = 'memory-disk'
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Android-specific optimizations
  const androidProps = Platform.OS === 'android' ? {
    priority,
    cachePolicy,
    recyclingKey: typeof source === 'object' ? source.uri : undefined,
  } : {};

  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        style={[StyleSheet.absoluteFillObject, style]}
        contentFit={contentFit}
        placeholder={placeholder}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        transition={Platform.OS === 'android' ? 200 : 300}
        {...androidProps}
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