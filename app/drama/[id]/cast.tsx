import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
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
        renderItem={({ item }) => (
          <View style={styles.actorCardContainer}>
            <ActorCard actor={item} />
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
  },
  content: {
    padding: 16,
  },
  actorCardContainer: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
  },
});