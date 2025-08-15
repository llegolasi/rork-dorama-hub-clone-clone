import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { X, Heart, Info } from 'lucide-react-native';

import { COLORS } from '@/constants/colors';
import { Drama } from '@/types/drama';
import { TMDB_IMAGE_BASE_URL, POSTER_SIZE } from '@/constants/config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth - 40;
const CARD_HEIGHT = screenHeight * 0.6;

interface SwipeCardProps {
  drama: Drama;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onPress: () => void;
  onInfoPress: () => void;
  isActive: boolean;
  testID?: string;
}

export default function SwipeCard({ 
  drama, 
  onSwipeLeft, 
  onSwipeRight, 
  onPress, 
  onInfoPress,
  isActive,
  testID 
}: SwipeCardProps) {
  const releaseYear = drama.first_air_date 
    ? new Date(drama.first_air_date).getFullYear() 
    : null;

  const genres = drama.genre_ids?.slice(0, 2).map(id => {
    const genreMap: { [key: number]: string } = {
      18: 'Drama',
      35: 'Comédia',
      10759: 'Ação',
      9648: 'Mistério',
      10765: 'Ficção',
      10766: 'Soap',
      10767: 'Talk Show',
      10768: 'Guerra'
    };
    return genreMap[id] || 'Drama';
  }) || ['Drama'];

  // For web, render a simple card without animations
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.cardContainer, { 
        transform: [{ scale: isActive ? 1 : 0.95 }],
        opacity: isActive ? 1 : 0.8 
      }]} testID={testID}>
        <TouchableOpacity 
          style={styles.card} 
          onPress={onPress}
          activeOpacity={0.95}
          disabled={!isActive}
        >
          <CardContent 
            drama={drama} 
            onInfoPress={onInfoPress}
            releaseYear={releaseYear}
            genres={genres}
          />
        </TouchableOpacity>
        
        {/* Web action buttons */}
        <View style={styles.webActionsContainer}>
          <TouchableOpacity 
            style={[styles.webActionButton, styles.webPassButton]}
            onPress={onSwipeLeft}
          >
            <X size={20} color="#FF6B6B" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.webActionButton, styles.webLikeButton]}
            onPress={onSwipeRight}
          >
            <Heart size={20} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // For native platforms, use the reanimated version
  return <NativeSwipeCard {...{ drama, onSwipeLeft, onSwipeRight, onPress, onInfoPress, isActive, testID, releaseYear, genres }} />;
}

// Shared card content component
function CardContent({ 
  drama, 
  onInfoPress, 
  releaseYear, 
  genres 
}: { 
  drama: Drama; 
  onInfoPress: () => void; 
  releaseYear: number | null;
  genres: string[];
}) {
  return (
    <>
      <View style={styles.posterContainer}>
        <Image
          source={{
            uri: drama.poster_path
              ? `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZE}${drama.poster_path}`
              : "https://via.placeholder.com/342x513/1C1C1E/8E8E93?text=No+Poster"
          }}
          style={styles.poster}
          contentFit="cover"
        />
        
        <View style={styles.gradientOverlay} />
        
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {drama.name}
          </Text>
          
          <View style={styles.metaContainer}>
            {releaseYear && (
              <Text style={styles.year}>{releaseYear}</Text>
            )}
            {genres.length > 0 && releaseYear && (
              <View style={styles.metaDivider} />
            )}
            {genres.length > 0 && (
              <Text style={styles.genre}>{genres.join(', ')}</Text>
            )}
          </View>
          
          {drama.vote_average > 0 && (
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>⭐ {drama.vote_average.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.infoButton} 
        onPress={(e) => {
          e.stopPropagation();
          onInfoPress();
        }}
      >
        <Info size={20} color={COLORS.text} />
      </TouchableOpacity>
    </>
  );
}

// Native implementation with reanimated (only loaded on native)
function NativeSwipeCard({ 
  drama, 
  onSwipeLeft, 
  onSwipeRight, 
  onPress, 
  onInfoPress,
  isActive,
  testID,
  releaseYear,
  genres
}: SwipeCardProps & { releaseYear: number | null; genres: string[] }) {
  // Dynamic imports for native-only dependencies
  const { PanGestureHandler } = require('react-native-gesture-handler');
  const Animated = require('react-native-reanimated').default;
  const {
    useAnimatedGestureHandler,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolate,
  } = require('react-native-reanimated');

  const SWIPE_THRESHOLD = screenWidth * 0.25;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(isActive ? 1 : 0.95);
  const opacity = useSharedValue(isActive ? 1 : 0.8);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      'worklet';
    },
    onActive: (event: any) => {
      'worklet';
      if (!isActive) return;
      
      translateX.value = event.translationX;
      // Reduzir movimento vertical no Android para melhor performance
      translateY.value = Platform.OS === 'android' ? event.translationY * 0.05 : event.translationY * 0.1;
    },
    onEnd: (event: any) => {
      'worklet';
      if (!isActive) return;

      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;

      if (shouldSwipeLeft) {
        // Animação mais simples no Android
        const springConfig = Platform.OS === 'android' ? { damping: 30, stiffness: 200 } : { damping: 20 };
        translateX.value = withSpring(-screenWidth * 1.5, springConfig);
        runOnJS(onSwipeLeft)();
      } else if (shouldSwipeRight) {
        const springConfig = Platform.OS === 'android' ? { damping: 30, stiffness: 200 } : { damping: 20 };
        translateX.value = withSpring(screenWidth * 1.5, springConfig);
        runOnJS(onSwipeRight)();
      } else {
        const springConfig = Platform.OS === 'android' ? { damping: 25, stiffness: 300 } : {};
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    // Reduzir rotação no Android para melhor performance
    const maxRotation = Platform.OS === 'android' ? 10 : 15;
    const rotation = interpolate(
      translateX.value,
      [-screenWidth / 2, 0, screenWidth / 2],
      [-maxRotation, 0, maxRotation],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -50, 0],
      [1, 0.5, 0],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, 50, SWIPE_THRESHOLD],
      [0, 0.5, 1],
      Extrapolate.CLAMP
    );

    return { opacity };
  });

  React.useEffect(() => {
    // Animações mais rápidas no Android
    const springConfig = Platform.OS === 'android' 
      ? { damping: 25, stiffness: 300 }
      : { damping: 15, stiffness: 200 };
      
    scale.value = withSpring(isActive ? 1 : 0.95, springConfig);
    opacity.value = withSpring(isActive ? 1 : 0.8, springConfig);
    
    if (isActive) {
      translateX.value = 0;
      translateY.value = 0;
    }
  }, [isActive, scale, opacity, translateX, translateY]);

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} enabled={isActive}>
      <Animated.View style={[styles.cardContainer, animatedStyle]} testID={testID}>
        <TouchableOpacity 
          style={styles.card} 
          onPress={onPress}
          activeOpacity={0.95}
          disabled={!isActive}
        >
          <CardContent 
            drama={drama} 
            onInfoPress={onInfoPress}
            releaseYear={releaseYear}
            genres={genres}
          />
        </TouchableOpacity>

        <Animated.View style={[styles.actionOverlay, styles.leftAction, leftActionStyle]}>
          <View style={styles.actionIcon}>
            <X size={40} color="#FF6B6B" />
          </View>
          <Text style={[styles.actionText, { color: '#FF6B6B' }]}>PULAR</Text>
        </Animated.View>

        <Animated.View style={[styles.actionOverlay, styles.rightAction, rightActionStyle]}>
          <View style={styles.actionIcon}>
            <Heart size={40} color={COLORS.accent} />
          </View>
          <Text style={[styles.actionText, { color: COLORS.accent }]}>CURTIR</Text>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
  },
  card: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12, // Reduzido para melhor performance
      },
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
    }),
    overflow: 'hidden',
  },
  posterContainer: {
    flex: 1,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.card,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    ...Platform.select({
      ios: {
        backgroundColor: 'rgba(0,0,0,0.4)',
      },
      android: {
        backgroundColor: 'rgba(0,0,0,0.4)',
      },
      web: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
      },
    }),
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  year: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  metaDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 8,
  },
  genre: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  ratingContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftAction: {
    left: 0,
  },
  rightAction: {
    right: 0,
  },
  actionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  webActionsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  webActionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  webPassButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  webLikeButton: {
    backgroundColor: 'rgba(139, 69, 255, 0.1)',
  },
});