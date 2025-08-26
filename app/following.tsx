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
import { ArrowLeft, Search, UserMinus } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';

interface User {
  id: string;
  username: string;
  displayName: string;
  profileImage?: string;
  followersCount: number;
  isFollowingYou: boolean;
}

interface UserItemProps {
  user: User;
  onUnfollow: (userId: string) => void;
  onUserPress: (userId: string) => void;
  isLoading?: boolean;
}

function UserItem({ user, onUnfollow, onUserPress, isLoading }: UserItemProps) {
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
          styles.unfollowButton,
          isLoading && styles.unfollowButtonDisabled
        ]}
        onPress={() => onUnfollow(user.id)}
        disabled={isLoading}
      >
        <UserMinus size={16} color={COLORS.text} />
        <Text style={styles.unfollowButtonText}>Deixar de seguir</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function FollowingScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    data: following = [],
    isLoading,
    refetch,
    isRefetching
  } = trpc.users.getFollowingWithDetails.useQuery({
    userId: userId,
    search: searchQuery || undefined,
    limit: 50
  });

  const toggleFollowMutation = trpc.users.toggleFollowUser.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      console.error('Error unfollowing user:', error);
    }
  });

  const handleUnfollow = async (targetUserId: string) => {
    try {
      await toggleFollowMutation.mutateAsync({ userId: targetUserId });
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return following;
    return following.filter(user =>
      user?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [following, searchQuery]);

  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const renderUser = ({ item }: { item: User }) => (
    <UserItem
      user={item}
      onUnfollow={handleUnfollow}
      onUserPress={handleUserPress}
      isLoading={toggleFollowMutation.isPending}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Seguindo',
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
          <Text style={styles.loadingText}>Carregando seguindo...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Seguindo',
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
            placeholder="Buscar pessoas que você segue..."
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
              {searchQuery ? 'Nenhuma pessoa encontrada' : 'Você ainda não segue ninguém'}
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
  unfollowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  unfollowButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
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
  unfollowButtonDisabled: {
    opacity: 0.6,
  },
});