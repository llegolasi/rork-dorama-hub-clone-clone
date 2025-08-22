# User Types System Implementation Guide

This guide explains the complete user types system with badges and avatar borders.

## User Types

### 1. Normal Users (Free)
- **Type**: `normal`
- **Features**:
  - 20 daily swipes
  - Can create up to 3 rankings
  - Basic statistics
  - No special badges or borders
  - Standard profile features

### 2. Premium Users (VIP)
- **Type**: `premium`
- **Features**:
  - 50 daily swipes
  - Unlimited rankings
  - Advanced statistics
  - VIP badge (👑) in gold color
  - Access to premium avatar borders
  - Custom profile themes
  - Priority support

### 3. Official Users (Verified)
- **Type**: `official`
- **Features**:
  - Unlimited swipes
  - All premium features
  - Verified badge (✓) in gold color
  - Exclusive avatar borders
  - Access to all app data
  - Special recognition

## Badges System

### Badge Types
1. **VIP Badge** (`vip`)
   - Icon: 👑
   - Color: #FFD700 (Gold)
   - For premium subscribers

2. **Verified Badge** (`verified`)
   - Icon: ✓
   - Color: #FFD700 (Gold)
   - For official accounts

3. **Special Badge** (`special`)
   - Icon: ⭐
   - Color: #8B5CF6 (Purple)
   - For special recognition

## Avatar Borders System

### Border Rarities
1. **Common** - Gray (#9CA3AF)
2. **Rare** - Blue (#3B82F6)
3. **Epic** - Purple (#8B5CF6)
4. **Legendary** - Orange (#F59E0B) - Premium only
5. **Exclusive** - Red (#EF4444) - Official only

### Default Borders
- **Golden Frame**: Premium legendary border
- **Official Frame**: Official exclusive border
- **Silver Frame**: Premium epic border
- **Bronze Frame**: Achievement rare border

## Database Schema

### New Tables
- `user_subscriptions`: Tracks premium subscriptions
- `avatar_borders`: Available avatar borders
- `user_badges`: Available badges
- `user_avatar_borders`: User's unlocked borders
- `user_user_badges`: User's unlocked badges

### Updated Tables
- `users`: Added user type fields
  - `user_type`: 'normal' | 'premium' | 'official'
  - `is_verified`: boolean
  - `verification_type`: 'official' | 'premium' | 'special'
  - `premium_expires_at`: timestamp
  - `daily_swipe_limit`: integer
  - `current_badge_id`: UUID reference
  - `current_avatar_border_id`: UUID reference

## Implementation

### 1. Run the SQL Migration
Execute `database/fix-user-types-system.sql` to set up the complete system.

### 2. Backend Integration
The community posts route now includes user type information in all queries.

### 3. Frontend Components
Use the updated `UserTypeComponents.tsx` to display:
- User badges next to names
- Avatar borders around profile pictures
- Verification icons

### 4. Usage Examples

```tsx
// Display user with badge and border
<UserDisplayName
  displayName="John Doe"
  username="johndoe"
  userType="premium"
  badge={userBadge}
  size="medium"
/>

// Display avatar with border
<AvatarWithBorder
  imageUri="https://example.com/avatar.jpg"
  border={avatarBorder}
  size={60}
  userType="premium"
/>
```

## Automatic Features

### Subscription Management
- When a user subscribes, they automatically become `premium`
- VIP badge is granted automatically
- Premium borders are unlocked
- Daily swipe limit increases to 50

### Official Account Setup
- Use `set_official_user(uuid)` function to make accounts official
- Automatically grants verified badge and official borders
- Sets unlimited swipes

### Expiration Handling
- Expired subscriptions automatically revert to `normal` type
- VIP badges are deactivated
- Swipe limits reset to 20

## Visual Indicators

### In Community Posts
- Premium users show 👑 next to their name
- Official users show ✓ next to their name
- Avatar borders display around profile pictures

### In Profiles
- Badges appear next to display names
- Avatar borders show user status
- Special styling for different user types

## Benefits by User Type

| Feature | Normal | Premium | Official |
|---------|--------|---------|----------|
| Daily Swipes | 20 | 50 | Unlimited |
| Rankings | 3 max | Unlimited | Unlimited |
| Statistics | Basic | Advanced | All |
| Badges | None | VIP | Verified |
| Borders | Basic | Premium | Exclusive |
| Support | Standard | Priority | Direct |

This system provides a clear progression path for users while maintaining the app's social features and encouraging premium subscriptions.