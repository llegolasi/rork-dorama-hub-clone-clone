import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { APP_FEATURES } from '@/constants/onboarding';
import { COLORS } from '@/constants/colors';
import OptimizedImage from '@/components/OptimizedImage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WelcomeStepProps {
  onGetStarted: () => void;
}

export default function WelcomeStep({ onGetStarted }: WelcomeStepProps) {
  const [currentFeature, setCurrentFeature] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
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
  }, [fadeAnim, slideAnim]);

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
      {/* Hero Section */}
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1489599162163-3fb4e0c30e3e?w=800&h=600&fit=crop',
        }}
        style={styles.heroSection}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
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
            <Text style={styles.heroTitle}>DoramaHub</Text>
            <Text style={styles.heroSubtitle}>
              Sua plataforma completa para descobrir, organizar e compartilhar sua paixão por doramas
            </Text>
          </Animated.View>
        </LinearGradient>
      </ImageBackground>

      {/* Features Carousel */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Descubra todas as funcionalidades</Text>
        
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
              <LinearGradient
                colors={feature.gradient as [string, string]}
                style={styles.featureGradient}
              >
                <View style={styles.featureImageContainer}>
                  <OptimizedImage
                    source={{ uri: feature.image }}
                    style={styles.featureImage}
                  />
                  <View style={styles.featureImageOverlay}>
                    <Text style={styles.featureIcon}>{feature.icon}</Text>
                  </View>
                </View>
                
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </ScrollView>

        {/* Pagination Dots */}
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

      {/* Call to Action */}
      <View style={styles.ctaSection}>
        <TouchableOpacity style={styles.getStartedButton} onPress={onGetStarted}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Começar Agora</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.ctaSubtext}>
          Junte-se a milhares de fãs de doramas e descubra sua próxima obsessão! 🎭
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroSection: {
    height: screenHeight * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 'bold' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featuresSection: {
    flex: 1,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  featuresCarousel: {
    flex: 1,
  },
  featureCard: {
    width: screenWidth,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  featureGradient: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  featureImageContainer: {
    height: 200,
    position: 'relative',
  },
  featureImage: {
    width: '100%',
    height: '100%',
  },
  featureImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 60,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featureContent: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 16,
    color: '#666',
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
    paddingBottom: 40,
    alignItems: 'center',
  },
  getStartedButton: {
    width: '100%',
    marginBottom: 16,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#fff',
  },
  ctaSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});