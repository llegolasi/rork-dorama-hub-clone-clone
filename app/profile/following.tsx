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
import { ArrowLeft, Search, UserMinus } from 'lucide-react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { trpc } from '@/lib/trpc';

interface Following {
  id: string;
  username: string;
  displayName: string;
  profileImage?: string;
  isFollowingYou: boolean;
  followersCount: number;
}

const FollowingScreen = () => {
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

  const filteredFollowing = useMemo(() => {
    if (!searchQuery.trim()) return following;
    return following.filter(user =>
      user?.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user?.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [following, searchQuery]);

  const handleUnfollow = async (targetUserId: string) => {
    try {
      await toggleFollowMutation.mutateAsync({ userId: targetUserId });
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  const renderFollowingItem = ({ item: user }: { item: Following }) => (
    <View style={styles.followingItem}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => handleUserPress(user.id)}
      >
        <Image
          source={{ uri: user.profileImage || 'https://via.placeholder.com/50x50/333/fff?text=U' }}
          style={styles.profileImage}
          contentFit="cover"
        />
        <View style={styles.userDetails}>
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          <Text style={styles.followersCount}>
            {user.followersCount} seguidores
          </Text>
          {user.isFollowingYou && (
            <Text style={styles.followsYouLabel}>Te segue</Text>
          )}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.unfollowButton,
          toggleFollowMutation.isPending && styles.unfollowButtonDisabled
        ]}
        onPress={() => handleUnfollow(user.id)}
        disabled={toggleFollowMutation.isPending}
      >
        <UserMinus size={16} color={COLORS.text} />
        <Text style={styles.unfollowButtonText}>Deixar de seguir</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Seguindo',
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
            <Text style={styles.loadingText}>Carregando seguindo...</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Seguindo',
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
            placeholder="Buscar pessoas que você segue..."
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Following Count */}
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            Seguindo {filteredFollowing.length} {filteredFollowing.length === 1 ? 'pessoa' : 'pessoas'}
          </Text>
        </View>

        {/* Following List */}
        <FlatList
          style={styles.followingList}
          data={filteredFollowing.filter(Boolean) as Following[]}
          renderItem={renderFollowingItem}
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
                {searchQuery ? 'Nenhuma pessoa encontrada' : 'Você ainda não segue ninguém'}
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
  followingList: {
    flex: 1,
  },
  followingItem: {
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
  unfollowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  unfollowButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
  unfollowButtonDisabled: {
    opacity: 0.6,
  },
});

export default FollowingScreen;