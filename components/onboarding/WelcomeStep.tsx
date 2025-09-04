import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { APP_FEATURES, TRENDING_DRAMA_BANNERS } from '@/constants/onboarding';
import { COLORS } from '@/constants/colors';
import OptimizedImage from '@/components/OptimizedImage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WelcomeStepProps {
  onGetStarted: () => void;
}

export default function WelcomeStep({ onGetStarted }: WelcomeStepProps) {
  const [currentFeature, setCurrentFeature] = useState<number>(0);
  const [currentBanner, setCurrentBanner] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const bannerFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-rotate banners
    const bannerInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(bannerFadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(bannerFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
      
      setCurrentBanner(prev => (prev + 1) % TRENDING_DRAMA_BANNERS.length);
    }, 4000);

    return () => clearInterval(bannerInterval);
  }, [fadeAnim, slideAnim, bannerFadeAnim]);

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    setCurrentFeature(index);
  };

  const scrollToFeature = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
    setCurrentFeature(index);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Dynamic Hero Section with Trending Dramas */}
      <Animated.View style={[styles.heroSection, { opacity: bannerFadeAnim }]}>
        <ImageBackground
          source={{ uri: TRENDING_DRAMA_BANNERS[currentBanner].backdrop }}
          style={styles.heroBackground}
          resizeMode="cover"
        >
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.4)',
              'rgba(0,0,0,0.6)',
              'rgba(0,0,0,0.8)'
            ]}
            style={styles.heroOverlay}
          >
            <Animated.View
              style={[
                styles.heroContent,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.logoContainer}>
                <Text style={styles.heroTitle}>DoramaHub</Text>
                <View style={styles.taglineContainer}>
                  <Text style={styles.tagline}>Sua paixão por doramas</Text>
                  <Text style={styles.tagline}>em um só lugar</Text>
                </View>
              </View>
              
              <View style={styles.trendingContainer}>
                <Text style={styles.trendingLabel}>Em alta agora:</Text>
                <Text style={styles.trendingTitle}>
                  {TRENDING_DRAMA_BANNERS[currentBanner].title}
                </Text>
              </View>
              
              <View style={styles.bannerIndicators}>
                {TRENDING_DRAMA_BANNERS.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.bannerIndicator,
                      currentBanner === index && styles.bannerIndicatorActive,
                    ]}
                  />
                ))}
              </View>
            </Animated.View>
          </LinearGradient>
        </ImageBackground>
      </Animated.View>

      {/* Enhanced Features Section */}
      <View style={styles.featuresSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tudo que você precisa</Text>
          <Text style={styles.sectionSubtitle}>para ser um verdadeiro fã de doramas</Text>
        </View>
        
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.featuresCarousel}
        >
          {APP_FEATURES.map((feature, index) => (
            <View key={feature.id} style={styles.featureCard}>
              <ImageBackground
                source={{ uri: feature.backdrop }}
                style={styles.featureBackground}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={[
                    'rgba(0,0,0,0.3)',
                    'rgba(0,0,0,0.7)',
                    'rgba(0,0,0,0.9)'
                  ]}
                  style={styles.featureOverlay}
                >
                  <View style={styles.featureHeader}>
                    <View style={styles.featureIconContainer}>
                      <Text style={styles.featureIcon}>{feature.icon}</Text>
                    </View>
                    <OptimizedImage
                      source={{ uri: feature.image }}
                      style={styles.featurePoster}
                    />
                  </View>
                  
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </View>
          ))}
        </ScrollView>

        {/* Enhanced Pagination */}
        <View style={styles.pagination}>
          {APP_FEATURES.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.paginationDot,
                currentFeature === index && styles.paginationDotActive,
              ]}
              onPress={() => scrollToFeature(index)}
            />
          ))}
        </View>
      </View>

      {/* Enhanced Call to Action */}
      <View style={styles.ctaSection}>
        <View style={styles.ctaContent}>
          <Text style={styles.ctaTitle}>Pronto para começar?</Text>
          <Text style={styles.ctaSubtext}>
            Junte-se a milhares de fãs e descubra sua próxima obsessão! 🎭✨
          </Text>
        </View>
        
        <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E', '#FFB6B6']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.buttonText}>Começar Jornada</Text>
            <Text style={styles.buttonEmoji}>🚀</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  heroSection: {
    height: screenHeight * 0.5,
  },
  heroBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  heroTitle: {
    fontSize: 52,
    fontWeight: 'bold' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontWeight: '300' as const,
  },
  trendingContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trendingLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trendingTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 3,
  },
  bannerIndicatorActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  featuresSection: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 30,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 25,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresCarousel: {
    flex: 1,
  },
  featureCard: {
    width: screenWidth,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  featureBackground: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  featureOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  featureIcon: {
    fontSize: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featurePoster: {
    width: 80,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  featureContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featureDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#FF6B6B',
    width: 24,
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    paddingTop: 20,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  ctaContent: {
    alignItems: 'center',
    marginBottom: 30,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  getStartedButton: {
    width: '100%',
    elevation: 8,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#fff',
    marginRight: 8,
  },
  buttonEmoji: {
    fontSize: 20,
  },
});