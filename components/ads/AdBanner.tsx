import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';

export type AdBannerSize = 'BANNER' | 'LARGE_BANNER' | 'MEDIUM_RECTANGLE' | 'FULL_BANNER';

interface AdBannerProps {
  adUnitId: string;
  size?: AdBannerSize;
  placement?: string;
}

const sizeToDims: Record<AdBannerSize, { width: number; height: number }> = {
  BANNER: { width: 320, height: 50 },
  LARGE_BANNER: { width: 320, height: 100 },
  MEDIUM_RECTANGLE: { width: 300, height: 250 },
  FULL_BANNER: { width: 468, height: 60 },
};

export default function AdBanner({ adUnitId, size = 'BANNER', placement = 'default' }: AdBannerProps) {
  const dims = useMemo(() => sizeToDims[size], [size]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Simulate loading delay for Android optimization
  useEffect(() => {
    const loadTimeout = Platform.OS === 'android' ? 1500 : 800;
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, loadTimeout);

    // Simulate occasional errors on Android
    if (Platform.OS === 'android' && Math.random() < 0.1) {
      const errorTimer = setTimeout(() => {
        setHasError(true);
        setIsLoading(false);
      }, loadTimeout + 500);
      return () => {
        clearTimeout(timer);
        clearTimeout(errorTimer);
      };
    }

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View
        style={[styles.container]}
        accessibilityRole="adjustable"
        testID={`ad-banner-${placement}-loading`}
      >
        <View style={[styles.banner, styles.loadingBanner, { width: dims.width, height: dims.height }]}>
          <ActivityIndicator 
            size="small" 
            color={COLORS.textSecondary} 
            style={styles.loadingIndicator}
          />
          <Text style={styles.loadingText}>Carregando anúncio...</Text>
        </View>
      </View>
    );
  }

  if (hasError) {
    return (
      <View
        style={[styles.container]}
        accessibilityRole="adjustable"
        testID={`ad-banner-${placement}-error`}
      >
        <View style={[styles.banner, styles.errorBanner, { width: dims.width, height: dims.height }]}>
          <Text style={styles.errorText}>Anúncio indisponível</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container]}
      accessibilityRole="adjustable"
      testID={`ad-banner-${placement}`}
    >
      <View style={[styles.banner, { width: dims.width, height: dims.height }]}>
        <Text style={styles.adLabel}>AdMob Test Banner</Text>
        <Text style={styles.adUnit} numberOfLines={1}>
          {adUnitId}
        </Text>
        <Text style={styles.platform}>
          {Platform.OS === 'web' ? 'Web mock' : Platform.OS === 'android' ? 'Android optimized' : 'iOS optimized'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  banner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  adLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '600' as const,
  },
  adUnit: {
    fontSize: 12,
    color: COLORS.text,
  },
  platform: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  loadingBanner: {
    backgroundColor: COLORS.background,
    borderStyle: 'dashed',
  },
  loadingIndicator: {
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  errorBanner: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.textSecondary,
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
});