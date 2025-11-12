import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, Platform, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import OptimizedImage from './OptimizedImage';

import { COLORS } from "@/constants/colors";
import { PROFILE_SIZE, TMDB_IMAGE_BASE_URL } from "@/constants/config";
import { CastMember } from "@/types/drama";

interface ActorCardProps {
  actor: CastMember;
  size?: "small" | "medium" | "grid";
  index?: number;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export default function ActorCard({ actor, size = "grid", index }: ActorCardProps) {
  const router = useRouter();
  
  const handlePress = () => {
    router.push(`/actor/${actor.id}`);
  };
  
  const getContainerStyle = () => {
    if (size === "small") return styles.containerSmall;
    if (size === "grid") return [styles.containerGrid, { width: CARD_WIDTH }];
    return styles.containerMedium;
  };
  
  const getImageStyle = () => {
    if (size === "small") return styles.imageSmall;
    if (size === "grid") return [styles.imageGrid, { width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }];
    return styles.imageMedium;
  };
  
  const getNameStyle = () => {
    if (size === "small") return styles.nameSmall;
    if (size === "grid") return styles.nameGrid;
    return styles.nameMedium;
  };
  
  const getCharacterStyle = () => {
    if (size === "small") return styles.characterSmall;
    if (size === "grid") return styles.characterGrid;
    return styles.characterMedium;
  };

  return (
    <TouchableOpacity 
      style={[styles.container, getContainerStyle()]} 
      onPress={handlePress}
      activeOpacity={0.8}
      testID={`actor-card-${actor.id}`}
    >
      <View style={styles.imageWrapper}>
        <OptimizedImage
          source={{ 
            uri: actor.profile_path 
              ? `${TMDB_IMAGE_BASE_URL}/${PROFILE_SIZE}${actor.profile_path}` 
              : "https://via.placeholder.com/185x278/1C1C1E/8E8E93?text=No+Image" 
          }}
          style={[styles.image, getImageStyle()]}
          contentFit="cover"
          priority={Platform.OS === 'android' ? 'low' : 'normal'}
          cachePolicy={Platform.OS === 'android' ? 'disk' : 'memory-disk'}
          placeholder="https://via.placeholder.com/185x278/1C1C1E/8E8E93?text=Loading"
        />
        {size === "grid" && (
          <View style={styles.gradientOverlay} />
        )}
      </View>
      
      <View style={[styles.infoContainer, size === "grid" && styles.infoContainerGrid]}>
        <Text style={[styles.name, getNameStyle()]} numberOfLines={2}>
          {actor.name}
        </Text>
        
        {actor.character && (
          <Text style={[styles.character, getCharacterStyle()]} numberOfLines={2}>
            {actor.character}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  containerSmall: {
    width: 100,
  },
  containerMedium: {
    width: 120,
  },
  containerGrid: {
    marginRight: 0,
    borderRadius: 20,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    backgroundColor: COLORS.border,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  imageSmall: {
    height: 100,
    width: 100,
  },
  imageMedium: {
    height: 120,
    width: 120,
  },
  imageGrid: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  infoContainer: {
    padding: 10,
    backgroundColor: COLORS.card,
  },
  infoContainerGrid: {
    padding: 14,
    minHeight: 80,
  },
  name: {
    color: COLORS.text,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  nameSmall: {
    fontSize: 12,
  },
  nameMedium: {
    fontSize: 13,
  },
  nameGrid: {
    fontSize: 15,
    lineHeight: 20,
  },
  character: {
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 16,
  },
  characterSmall: {
    fontSize: 10,
  },
  characterMedium: {
    fontSize: 11,
  },
  characterGrid: {
    fontSize: 13,
    lineHeight: 18,
  },
});