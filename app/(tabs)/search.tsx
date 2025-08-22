import React, { useState, useMemo } from "react";
import { 
  ActivityIndicator, 
  FlatList, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  Platform 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Search, X, Flame, Star, TrendingUp, Film } from "lucide-react-native";

import { COLORS } from "@/constants/colors";
import { searchDramas } from "@/services/api";
import DramaCard from "@/components/DramaCard";
import CategoryPill from "@/components/CategoryPill";
import { getResponsiveColumns, getCardWidth } from "@/constants/utils";

const GENRES = [
  { id: 18, name: "Drama" },
  { id: 10749, name: "Romance" },
  { id: 35, name: "Comedy" },
  { id: 9648, name: "Mystery" },
  { id: 80, name: "Crime" },
  { id: 10759, name: "Action & Adventure" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10751, name: "Family" },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  
  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setDebouncedQuery(searchQuery);
      }
    }, 500);
    
    return () => clearTimeout(handler);
  }, [searchQuery]);
  
  const searchResults = useQuery({
    queryKey: ["search-dramas", debouncedQuery],
    queryFn: () => searchDramas(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });
  
  // Calcular número de colunas responsivo para busca
  const numColumns = useMemo(() => getResponsiveColumns('small'), []);
  const cardWidth = useMemo(() => getCardWidth(numColumns, 4), [numColumns]);
  
  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
  };
  
  const handleGenrePress = (genreId: number) => {
    router.push(`/categories/${genreId}`);
  };
  
  const renderEmptyState = () => {
    if (debouncedQuery.length === 0) {
      return (
        <View style={styles.defaultContent}>
          {/* Categories Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categorias</Text>
            <FlatList
              data={GENRES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleGenrePress(item.id)}>
                  <CategoryPill 
                    genre={item} 
                    selected={false}
                  />
                </TouchableOpacity>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            />
          </View>
          
          {/* Quick Access Cards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acesso Rápido</Text>
            <View style={styles.quickAccessGrid}>
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/trending')}
              >
                <View style={styles.quickAccessIcon}>
                  <Flame size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.quickAccessTitle}>Em Alta</Text>
                <Text style={styles.quickAccessSubtitle}>Os mais populares</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/popular')}
              >
                <View style={styles.quickAccessIcon}>
                  <Star size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.quickAccessTitle}>Bem Avaliados</Text>
                <Text style={styles.quickAccessSubtitle}>Melhores notas</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/categories/latest')}
              >
                <View style={styles.quickAccessIcon}>
                  <TrendingUp size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.quickAccessTitle}>Lançamentos</Text>
                <Text style={styles.quickAccessSubtitle}>Novidades</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickAccessCard}
                onPress={() => router.push('/categories')}
              >
                <View style={styles.quickAccessIcon}>
                  <Film size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.quickAccessTitle}>Todas</Text>
                <Text style={styles.quickAccessSubtitle}>Ver categorias</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    
    if (searchResults.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      );
    }
    
    if (searchResults.data && searchResults.data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>
            Try a different search term or check your spelling
          </Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]} testID="search-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pesquisar</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar K-dramas..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
            testID="search-input"
          />
          
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearButton}
              testID="clear-search"
            >
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {renderEmptyState() || (
        <FlatList
          data={searchResults.data || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.cardContainer}>
              <DramaCard drama={item} size="large" />
            </View>
          )}
          numColumns={2}
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
          testID="search-results"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: COLORS.text,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  resultsContainer: {
    padding: 16,
  },
  cardContainer: {
    flex: 1,
    maxWidth: "50%",
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  defaultContent: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  quickAccessGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  quickAccessCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    width: "48%",
    alignItems: "center",
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 95, 162, 0.1)',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickAccessTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
    textAlign: "center",
  },
  quickAccessSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

});