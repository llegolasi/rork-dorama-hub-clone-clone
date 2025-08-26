import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { Filter, X, Crown } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

interface AdvancedFiltersProps {
  visible: boolean;
  onClose: () => void;
  isPremium: boolean;
  onFiltersApply: (filters: FilterOptions) => void;
}

interface FilterOptions {
  genre?: string;
  country?: string;
  timeRange?: string;
  sortBy?: string;
}

const GENRES = [
  'Todos',
  'Romance',
  'Thriller',
  'Comédia',
  'Drama',
  'Histórico',
  'Fantasia',
  'Ação',
  'Mistério',
  'Slice of Life',
];

const COUNTRIES = [
  'Todos',
  'Coreia do Sul',
  'Brasil',
  'Estados Unidos',
  'México',
  'Argentina',
  'Japão',
  'Tailândia',
];

const TIME_RANGES = [
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mês' },
  { id: 'year', label: 'Este ano' },
  { id: 'all', label: 'Todos os tempos' },
];

const SORT_OPTIONS = [
  { id: 'likes', label: 'Mais curtidos' },
  { id: 'comments', label: 'Mais comentados' },
  { id: 'recent', label: 'Mais recentes' },
  { id: 'trending', label: 'Em alta' },
];

export default function AdvancedFilters({ 
  visible, 
  onClose, 
  isPremium, 
  onFiltersApply 
}: AdvancedFiltersProps) {
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedCountry, setSelectedCountry] = useState('Todos');
  const [selectedTimeRange, setSelectedTimeRange] = useState('month');
  const [selectedSort, setSelectedSort] = useState('likes');

  const handleApplyFilters = () => {
    const filters: FilterOptions = {
      genre: selectedGenre !== 'Todos' ? selectedGenre : undefined,
      country: selectedCountry !== 'Todos' ? selectedCountry : undefined,
      timeRange: selectedTimeRange,
      sortBy: selectedSort,
    };
    onFiltersApply(filters);
    onClose();
  };

  const handleReset = () => {
    setSelectedGenre('Todos');
    setSelectedCountry('Todos');
    setSelectedTimeRange('month');
    setSelectedSort('likes');
  };

  if (!isPremium) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <View style={styles.premiumRequiredContainer}>
            <Crown size={48} color="#FDCB6E" />
            <Text style={styles.premiumTitle}>Filtros Avançados</Text>
            <Text style={styles.premiumDescription}>
              Assine o Dorama Hub+ para acessar filtros avançados e descobrir rankings por gênero e país!
            </Text>
            <TouchableOpacity style={styles.premiumButton} onPress={onClose}>
              <Text style={styles.premiumButtonText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filtersContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Filter size={20} color={COLORS.accent} />
              <Text style={styles.title}>Filtros Avançados</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Genre Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Gênero</Text>
              <View style={styles.optionsGrid}>
                {GENRES.map((genre) => (
                  <TouchableOpacity
                    key={genre}
                    style={[
                      styles.optionButton,
                      selectedGenre === genre && styles.selectedOption,
                    ]}
                    onPress={() => setSelectedGenre(genre)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedGenre === genre && styles.selectedOptionText,
                    ]}>
                      {genre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Country Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>País dos Usuários</Text>
              <View style={styles.optionsGrid}>
                {COUNTRIES.map((country) => (
                  <TouchableOpacity
                    key={country}
                    style={[
                      styles.optionButton,
                      selectedCountry === country && styles.selectedOption,
                    ]}
                    onPress={() => setSelectedCountry(country)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedCountry === country && styles.selectedOptionText,
                    ]}>
                      {country}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Período</Text>
              <View style={styles.optionsGrid}>
                {TIME_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.id}
                    style={[
                      styles.optionButton,
                      selectedTimeRange === range.id && styles.selectedOption,
                    ]}
                    onPress={() => setSelectedTimeRange(range.id)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedTimeRange === range.id && styles.selectedOptionText,
                    ]}>
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Ordenar por</Text>
              <View style={styles.optionsGrid}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionButton,
                      selectedSort === option.id && styles.selectedOption,
                    ]}
                    onPress={() => setSelectedSort(option.id)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedSort === option.id && styles.selectedOptionText,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  filtersContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: COLORS.accent + '20',
    borderColor: COLORS.accent,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  selectedOptionText: {
    color: COLORS.accent,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
  premiumRequiredContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  premiumDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  premiumButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  premiumButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
});