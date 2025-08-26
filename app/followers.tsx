import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, UserPlus, UserCheck } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';

interface User {
  id: string;
  username: string;
  displayName: string;
  profileImage?: string;
  isFollowing: boolean;
  followersCount: number;
  isFollowingYou: boolean;
}

interface UserItemProps {
  user: User;
  onToggleFollow: (userId: string) => void;
  onUserPress: (userId: string) => void;
  isLoading?: boolean;
}

function UserItem({ user, onToggleFollow, onUserPress, isLoading }: UserItemProps) {
  return (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => onUserPress(user.id)}
    >
      <Image
        source={{
          uri: user.profileImage || 'https://via.placeholder.com/50x50/333/fff?text=U'
        }}
        style={styles.userAvatar}
      />
      
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{user.displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.followersCount}>
          {user.followersCount} seguidores
        </Text>
        {user.isFollowingYou && (
          <Text style={styles.followsYouLabel}>Te segue</Text>
        )}
      </View>
      
      <TouchableOpacity
        style={[
          styles.followButton,
          user.isFollowing && styles.followingButton,
          isLoading && styles.followButtonDisabled
        ]}
        onPress={() => onToggleFollow(user.id)}
        disabled={isLoading}
      >
        {user.isFollowing ? (
          <>
            <UserCheck size={16} color={COLORS.text} />
            <Text style={[styles.followButtonText, styles.followingText]}>
              Seguindo
            </Text>
          </>
        ) : (
          <>
            <UserPlus size={16} color={COLORS.accent} />
            <Text style={styles.followButtonText}>Seguir</Text>
          </>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function FollowersScreen() {
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

  const handleToggleFollow = async (targetUserId: string) => {
    try {
      await toggleFollowMutation.mutateAsync({ userId: targetUserId });
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return followers;
    return followers.filter(user =>
      user?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [followers, searchQuery]);

  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const renderUser = ({ item }: { item: User }) => (
    <UserItem
      user={item}
      onToggleFollow={handleToggleFollow}
      onUserPress={handleUserPress}
      isLoading={toggleFollowMutation.isPending}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Seguidores',
            headerStyle: { backgroundColor: COLORS.background },
            headerTintColor: COLORS.text,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft color={COLORS.text} size={24} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Carregando seguidores...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Seguidores',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft color={COLORS.text} size={24} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar seguidores..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      
      <FlatList
        data={filteredUsers.filter(Boolean) as User[]}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Nenhum seguidor encontrado' : 'Nenhum seguidor ainda'}
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
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  followersCount: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  followingButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  followButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  followingText: {
    color: COLORS.text,
  },
  followsYouLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
});