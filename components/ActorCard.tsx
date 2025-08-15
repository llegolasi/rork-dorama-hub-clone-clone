import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { COLORS } from "@/constants/colors";
import { PROFILE_SIZE, TMDB_IMAGE_BASE_URL } from "@/constants/config";
import { CastMember } from "@/types/drama";

interface ActorCardProps {
  actor: CastMember;
  size?: "small" | "medium";
}

export default function ActorCard({ actor, size = "medium" }: ActorCardProps) {
  const router = useRouter();
  
  const handlePress = () => {
    router.push(`/actor/${actor.id}`);
  };
  
  const getContainerStyle = () => {
    return size === "small" ? styles.containerSmall : styles.containerMedium;
  };
  
  const getImageStyle = () => {
    return size === "small" ? styles.imageSmall : styles.imageMedium;
  };
  
  const getNameStyle = () => {
    return size === "small" ? styles.nameSmall : styles.nameMedium;
  };
  
  const getCharacterStyle = () => {
    return size === "small" ? styles.characterSmall : styles.characterMedium;
  };

  return (
    <TouchableOpacity 
      style={[styles.container, getContainerStyle()]} 
      onPress={handlePress}
      activeOpacity={0.7}
      testID={`actor-card-${actor.id}`}
    >
      <Image
        source={{ 
          uri: actor.profile_path 
            ? `${TMDB_IMAGE_BASE_URL}/${PROFILE_SIZE}${actor.profile_path}` 
            : "https://via.placeholder.com/185x278/1C1C1E/8E8E93?text=No+Image" 
        }}
        style={[styles.image, getImageStyle()]}
        contentFit="cover"
        transition={300}
      />
      
      <View style={styles.infoContainer}>
        <Text style={[styles.name, getNameStyle()]} numberOfLines={1}>
          {actor.name}
        </Text>
        
        {actor.character && (
          <Text style={[styles.character, getCharacterStyle()]} numberOfLines={1}>
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
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  containerSmall: {
    width: 100,
  },
  containerMedium: {
    width: 120,
  },
  image: {
    backgroundColor: COLORS.border,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  imageSmall: {
    height: 100,
    width: 100,
  },
  imageMedium: {
    height: 120,
    width: 120,
  },
  infoContainer: {
    padding: 8,
  },
  name: {
    color: COLORS.text,
    fontWeight: "600",
  },
  nameSmall: {
    fontSize: 12,
  },
  nameMedium: {
    fontSize: 13,
  },
  character: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  characterSmall: {
    fontSize: 10,
  },
  characterMedium: {
    fontSize: 11,
  },
});