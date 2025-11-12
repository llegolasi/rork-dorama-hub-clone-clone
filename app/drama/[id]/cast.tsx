import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { COLORS } from '@/constants/colors';
import { getDramaCredits } from '@/services/api';
import ActorCard from '@/components/ActorCard';

export default function DramaCastScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dramaId = parseInt(id || '0', 10);

  const { data: credits, isLoading } = useQuery({
    queryKey: ['drama-credits', dramaId],
    queryFn: () => getDramaCredits(dramaId),
    enabled: !!dramaId,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const cast = credits?.cast || [];

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Elenco',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
        }} 
      />
      
      <FlatList
        data={cast}
        renderItem={({ item, index }) => (
          <ActorCard actor={item} index={index} />
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Elenco Principal</Text>
            <Text style={styles.headerSubtitle}>
              {cast.length} {cast.length === 1 ? 'ator' : 'atores'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 0,
    gap: 16,
  },
  header: {
    marginBottom: 20,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});