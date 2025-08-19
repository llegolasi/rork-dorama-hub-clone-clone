import React, { useCallback } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";

import { COLORS } from "@/constants/colors";
import { Drama } from "@/types/drama";
import DramaCard from "./DramaCard";

interface HorizontalListProps {
  title: string;
  data: Drama[];
  viewAllRoute?: string;
  cardSize?: "small" | "medium" | "large";
  loading?: boolean;
}

export default function HorizontalList({ 
  title, 
  data, 
  viewAllRoute,
  cardSize = "medium",
  loading = false
}: HorizontalListProps) {
  const router = useRouter();
  
  console.log(`HorizontalList [${title}]:`, {
    dataLength: data?.length || 0,
    firstItem: data?.[0] ? { id: data[0].id, name: data[0].name } : null
  });
  
  const handleViewAll = () => {
    if (viewAllRoute) {
      router.push(viewAllRoute as any);
    }
  };

  const renderItem = useCallback(({ item }: { item: Drama }) => (
    <DramaCard drama={item} size={cardSize} />
  ), [cardSize]);

  const getItemLayout = useCallback((data: any, index: number) => {
    const itemWidth = cardSize === 'large' ? 200 : cardSize === 'medium' ? 160 : 120;
    return {
      length: itemWidth + 16, // item width + margin
      offset: (itemWidth + 16) * index,
      index,
    };
  }, [cardSize]);

  if (loading) {
    // Show loading skeleton
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={[styles.loadingCard, cardSize === "small" ? styles.loadingCardSmall : styles.loadingCardMedium]} />
          ))}
        </View>
      </View>
    );
  }

  if (!data || data.length === 0) {
    // Show empty state instead of hiding completely
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum drama encontrado</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{title}</Text>
        
        {viewAllRoute && (
          <TouchableOpacity 
            onPress={handleViewAll}
            style={styles.viewAllButton}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>Ver todas</Text>
            <ChevronRight size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        testID={`horizontal-list-${title.toLowerCase().replace(/\s/g, "-")}`}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={Platform.OS === 'android' ? 3 : 10}
        windowSize={Platform.OS === 'android' ? 2 : 21}
        initialNumToRender={Platform.OS === 'android' ? 2 : 10}
        updateCellsBatchingPeriod={Platform.OS === 'android' ? 100 : 50}
        getItemLayout={getItemLayout}
        legacyImplementation={Platform.OS === 'android'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    paddingLeft: 16,
  },
  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginRight: 16,
    opacity: 0.5,
  },
  loadingCardSmall: {
    width: 120,
    height: 200,
  },
  loadingCardMedium: {
    width: 160,
    height: 280,
  },
  emptyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
});