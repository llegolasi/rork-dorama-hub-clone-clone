import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';

// Conditionally import native modules only on mobile platforms
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (Platform.OS !== 'web') {
  try {
    const googleAds = require('react-native-google-mobile-ads');
    BannerAd = googleAds.BannerAd;
    BannerAdSize = googleAds.BannerAdSize;
    TestIds = googleAds.TestIds;
  } catch (error) {
    console.warn('Google Mobile Ads not available:', error);
  }
}

export type AdBannerSize = 'BANNER' | 'LARGE_BANNER' | 'MEDIUM_RECTANGLE' | 'FULL_BANNER';

interface AdBannerProps {
  adUnitId: string;
  size?: AdBannerSize;
  placement?: string;
}

const sizeToAdMobSize: Record<AdBannerSize, any> = {
  BANNER: BannerAdSize?.BANNER,
  LARGE_BANNER: BannerAdSize?.LARGE_BANNER,
  MEDIUM_RECTANGLE: BannerAdSize?.MEDIUM_RECTANGLE,
  FULL_BANNER: BannerAdSize?.FULL_BANNER,
};

export default function AdBanner({ adUnitId, size = 'BANNER', placement = 'default' }: AdBannerProps) {
  const adMobSize = useMemo(() => sizeToAdMobSize[size], [size]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Use test ad unit IDs for development
  const getAdUnitId = () => {
    if (__DEV__ && TestIds) {
      return TestIds.BANNER;
    }
    return adUnitId;
  };

  const handleAdLoaded = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleAdError = (error: any) => {
    console.warn('AdMob Banner Error:', error);
    setIsLoading(false);
    setHasError(true);
  };

  // Don't render ads on web platform
  if (Platform.OS === 'web' || !BannerAd) {
    return (
      <View style={styles.webPlaceholder}>
        <Text style={styles.webPlaceholderText}>📱 Anúncio (Mobile Only)</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      testID={`ad-banner-${placement}`}
    >
      <BannerAd
        unitId={getAdUnitId()}
        size={adMobSize}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdError}
      />
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={COLORS.textSecondary} />
          <Text style={styles.loadingText}>Carregando anúncio...</Text>
        </View>
      )}
      
      {hasError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Anúncio indisponível</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    opacity: 0.6,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  webPlaceholder: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  webPlaceholderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
});