import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { COLORS } from "@/constants/colors";
import { Genre } from "@/types/drama";

interface CategoryPillProps {
  genre: Genre;
  selected?: boolean;
}

export default function CategoryPill({ genre, selected = false }: CategoryPillProps) {
  const router = useRouter();
  
  const handlePress = () => {
    router.push(`/categories/${genre.id}`);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        selected && styles.selectedContainer
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={`category-${genre.id}`}
    >
      <Text 
        style={[
          styles.text,
          selected && styles.selectedText
        ]}
      >
        {genre.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedContainer: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  text: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "500",
  },
  selectedText: {
    color: COLORS.text,
  },
});