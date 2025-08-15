import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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
          {Platform.OS === 'web' ? 'Web mock' : 'Expo Go mock'}
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
});