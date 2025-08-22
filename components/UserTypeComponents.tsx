import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { UserBadge, AvatarBorder, UserType } from '@/types/user';

interface UserBadgeDisplayProps {
  badge?: UserBadge;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const UserBadgeDisplay: React.FC<UserBadgeDisplayProps> = ({ 
  badge, 
  size = 'medium', 
  showText = false 
}) => {
  if (!badge) return null;

  const sizeStyles = {
    small: { fontSize: 12, padding: 2 },
    medium: { fontSize: 14, padding: 4 },
    large: { fontSize: 16, padding: 6 }
  };

  return (
    <View style={[styles.badgeContainer, { backgroundColor: badge.color + '20' }]}>
      <Text style={[styles.badgeIcon, sizeStyles[size]]}>{badge.icon}</Text>
      {showText && (
        <Text style={[styles.badgeText, { color: badge.color }, sizeStyles[size]]}>
          {badge.name}
        </Text>
      )}
    </View>
  );
};

interface AvatarWithBorderProps {
  imageUri?: string;
  border?: AvatarBorder;
  size?: number;
  userType?: UserType;
}

export const AvatarWithBorder: React.FC<AvatarWithBorderProps> = ({ 
  imageUri, 
  border, 
  size = 50,
  userType = 'normal'
}) => {
  const borderWidth = size * 0.08;
  const innerSize = size - (borderWidth * 2);

  const getBorderColor = () => {
    if (border) {
      switch (border.rarity) {
        case 'common': return '#9CA3AF';
        case 'rare': return '#3B82F6';
        case 'epic': return '#8B5CF6';
        case 'legendary': return '#F59E0B';
        case 'exclusive': return '#EF4444';
        default: return '#9CA3AF';
      }
    }
    
    switch (userType) {
      case 'premium': return '#FFD700';
      case 'official': return '#1DA1F2';
      default: return '#E5E7EB';
    }
  };

  return (
    <View style={[
      styles.avatarContainer,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: borderWidth,
        borderColor: getBorderColor(),
      }
    ]}>
      {imageUri ? (
        <Image 
          source={{ uri: imageUri }} 
          style={[
            styles.avatar,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
            }
          ]}
        />
      ) : (
        <View style={[
          styles.avatarPlaceholder,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
          }
        ]}>
          <Text style={[styles.avatarPlaceholderText, { fontSize: innerSize * 0.4 }]}>👤</Text>
        </View>
      )}
    </View>
  );
};

interface UserDisplayNameProps {
  displayName: string;
  username?: string;
  userType?: UserType;
  badge?: UserBadge;
  size?: 'small' | 'medium' | 'large';
  showUsername?: boolean;
}

export const UserDisplayName: React.FC<UserDisplayNameProps> = ({
  displayName,
  username,
  userType = 'normal',
  badge,
  size = 'medium',
  showUsername = true
}) => {
  const textSizes = {
    small: { displayName: 14, username: 12 },
    medium: { displayName: 16, username: 14 },
    large: { displayName: 18, username: 16 }
  };

  const getVerificationBadge = () => {
    if (userType === 'official') {
      return (
        <Text style={[styles.verificationBadge, { color: '#FFD700' }]}>✓</Text>
      );
    }
    return null;
  };

  return (
    <View style={styles.userNameContainer}>
      <View style={styles.displayNameRow}>
        <Text style={[
          styles.displayName, 
          { fontSize: textSizes[size].displayName }
        ]}>
          {displayName}
        </Text>
        {getVerificationBadge()}
        {badge && (
          <UserBadgeDisplay 
            badge={badge} 
            size={size === 'large' ? 'medium' : 'small'} 
          />
        )}
      </View>
      {showUsername && username && (
        <Text style={[
          styles.username, 
          { fontSize: textSizes[size].username }
        ]}>
          @{username}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeIcon: {
    fontWeight: 'bold' as const,
  },
  badgeText: {
    fontWeight: '600' as const,
    marginLeft: 2,
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    resizeMode: 'cover' as const,
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#9CA3AF',
  },
  userNameContainer: {
    flex: 1,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontWeight: '600' as const,
    color: '#111827',
  },
  username: {
    color: '#6B7280',
    marginTop: 2,
  },
  verificationBadge: {
    fontSize: 16,
    marginLeft: 4,
    fontWeight: 'bold' as const,
  },
});