import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeft, Search, UserPlus, UserCheck } from 'lucide-react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';

interface Follower {
  id: string;
  username: string;
  displayName: string;
  profileImage?: string;
  isFollowing: boolean;
  isFollowingYou: boolean;
  followersCount: number;
}

const FollowersScreen = () => {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    data: followers = [],
    isLoading,
    refetch,
    isRefetching
  } = trpc.users.getFollowersWithDetails.useQuery({
    userId: userId,
    search: searchQuery || undefined,
    limit: 50
  });

  const toggleFollowMutation = trpc.users.toggleFollowUser.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Error toggling follow:', error);
    }
  });

  const filteredFollowers = useMemo(() => {
    if (!searchQuery.trim()) return followers;
    return followers.filter(follower =>
      follower?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      follower?.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [followers, searchQuery]);

  const handleFollowToggle = async (followerId: string) => {
    try {
      await toggleFollowMutation.mutateAsync({ userId: followerId });
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const renderFollowerItem = ({ item: follower }: { item: Follower }) => (
    <View style={styles.followerItem}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => handleUserPress(follower.id)}
      >
        <Image
          source={{ uri: follower.profileImage || 'https://via.placeholder.com/50x50/333/fff?text=U' }}
          style={styles.profileImage}
          contentFit="cover"
        />
        <View style={styles.userDetails}>
          <Text style={styles.displayName}>{follower.displayName}</Text>
          <Text style={styles.username}>@{follower.username}</Text>
          <Text style={styles.followersCount}>
            {follower.followersCount} seguidores
          </Text>
          {follower.isFollowingYou && (
            <Text style={styles.followsYouLabel}>Te segue</Text>
          )}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.followButton, 
          follower.isFollowing && styles.followingButton,
          toggleFollowMutation.isPending && styles.followButtonDisabled
        ]}
        onPress={() => handleFollowToggle(follower.id)}
        disabled={toggleFollowMutation.isPending}
      >
        {follower.isFollowing ? (
          <UserCheck size={16} color={COLORS.text} />
        ) : (
          <UserPlus size={16} color={COLORS.accent} />
        )}
        <Text style={[styles.followButtonText, follower.isFollowing && styles.followingButtonText]}>
          {follower.isFollowing ? 'Seguindo' : 'Seguir'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Seguidores',
            headerStyle: { backgroundColor: COLORS.background },
            headerTintColor: COLORS.text,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={COLORS.text} />
              </TouchableOpacity>
            ),
          }}
        />
        
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Carregando seguidores...</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Seguidores',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar seguidores..."
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Followers Count */}
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredFollowers.length} {filteredFollowers.length === 1 ? 'seguidor' : 'seguidores'}
          </Text>
        </View>

        {/* Followers List */}
        <FlatList
          style={styles.followersList}
          data={filteredFollowers.filter(Boolean) as Follower[]}
          renderItem={renderFollowerItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl 
              refreshing={isRefetching} 
              onRefresh={refetch}
              tintColor={COLORS.accent}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Nenhum seguidor encontrado' : 'Você ainda não tem seguidores'}
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  countContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  followersList: {
    flex: 1,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  followsYouLabel: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '500',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  followingButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  followingButtonText: {
    color: COLORS.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  followersCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
});

export default FollowersScreen;