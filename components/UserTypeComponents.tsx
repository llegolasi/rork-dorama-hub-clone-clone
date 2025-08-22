import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { UserBadge, AvatarBorder, UserType } from '@/types/user';

// SVG Icons as components
const VerifiedBrandSolid = (props: any) => (
  <Svg width={props.size || 16} height={props.size || 16} viewBox="0 0 2048 2048" {...props}>
    <Path
      fill={props.color || '#FFD700'}
      d="m1845 1024l124 155q18 23 28 50t10 57q0 30-9 57t-26 49t-41 38t-52 24l-191 53q2 51 5 103t4 104q0 36-13 67t-37 54t-55 37t-68 14q-31 0-61-11l-185-70l-109 165q-24 37-62 57t-83 21q-44 0-82-20t-63-58l-109-165l-185 70q-30 11-61 11q-36 0-67-13t-55-37t-37-55t-14-67q0-52 3-104t6-103l-191-53q-29-8-52-24t-40-38t-26-49t-10-57q0-29 10-56t28-51l124-155L79 869q-38-47-38-107q0-30 9-57t26-49t40-38t53-24l191-53q-2-51-5-103t-4-104q0-36 13-67t37-54t55-37t68-14q31 0 61 11l185 70L879 78q24-37 62-57t83-21q44 0 82 20t63 58l109 165l185-70q30-11 61-11q36 0 67 13t55 37t37 55t14 67q0 52-3 104t-6 103l191 53q28 8 52 24t40 38t26 49t10 57q0 60-38 107l-124 155zm-949 369l569-568l-114-114l-455 456l-199-200l-114 114l313 312z"
    />
  </Svg>
);

const Vip2Fill = (props: any) => (
  <Svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" {...props}>
    <G fill="none">
      <Path d="M24 0v24H0V0h24ZM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01l-.184-.092Z" />
      <Path
        fill={props.color || '#FFD700'}
        d="M12.987 5.74a2 2 0 1 0-1.97.002l-.01.018c-.655 1.367-1.565 3.325-2.97 4.06c-1.154.603-2.81.3-4.04.074a1.5 1.5 0 1 0-1.772 1.58l2.948 7.61A3 3 0 0 0 7.97 21h8.06a3 3 0 0 0 2.797-1.916l2.947-7.61a1.5 1.5 0 1 0-1.767-1.624c-1.259.163-2.882.371-4.044-.236c-1.377-.72-2.3-2.543-2.976-3.874Z"
      />
    </G>
  </Svg>
);

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

  // If user has a custom avatar border with image, render it differently
  if (border && border.imageUrl) {
    return (
      <View style={[styles.avatarWithBorderContainer, { width: size, height: size }]}>
        {/* Border Image */}
        <Image 
          source={{ uri: border.imageUrl }}
          style={[
            styles.borderImage,
            {
              width: size,
              height: size,
              position: 'absolute',
              top: 0,
              left: 0,
            }
          ]}
          resizeMode="contain"
        />
        {/* Avatar */}
        <View style={[
          styles.avatarInnerContainer,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
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
      </View>
    );
  }

  // Default border rendering (solid color)
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
        <VerifiedBrandSolid style={[styles.verificationBadge, { color: '#FFD700' }]} />
      );
    }
    if (userType === 'premium') {
      return (
        <Vip2Fill style={[styles.verificationBadge, { color: '#FFD700' }]} />
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
  avatarWithBorderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  borderImage: {
    zIndex: 2,
  },
  avatarInnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 1,
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