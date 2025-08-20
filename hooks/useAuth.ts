import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { AuthUser, OnboardingData } from '@/types/user';
import { supabase, hasValidSupabaseConfig } from '@/lib/supabase';


const STORAGE_KEYS = {
  AUTH_USER: 'authUser',
  ONBOARDING_DATA: 'onboardingData'
};

// Helper function to get correct MIME type
const getMimeType = (fileExt: string): string => {
  const ext = fileExt.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg'; // Default to JPEG
  }
};

// Helper function to upload profile image
const uploadProfileImage = async (userId: string, imageUri: string): Promise<string> => {
  const timestamp = Date.now();
  const guessedExt = imageUri.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();
  const fileExt = guessedExt && /^[a-z0-9]+$/.test(guessedExt) ? guessedExt : 'jpg';
  const fileName = `${userId}/profile_${timestamp}.${fileExt}`;

  let fileToUpload: Blob | Uint8Array;
  let contentType = getMimeType(fileExt);

  console.log('Starting image upload process:', { imageUri, fileName, contentType });

  if (Platform.OS === 'web') {
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();
    const normalizedType = (blob.type || contentType).replace('image/jpg', 'image/jpeg');
    fileToUpload = blob;
    contentType = normalizedType || contentType;
    if (!fileToUpload || fileToUpload.size <= 0) {
      throw new Error('Fetched web blob is empty');
    }
  } else {
    // Mobile: Read file as base64 and convert to Uint8Array
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('Image file does not exist');
    }
    console.log('File info:', fileInfo);

    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, { 
      encoding: FileSystem.EncodingType.Base64 
    });
    
    if (!base64 || base64.length === 0) {
      throw new Error('Failed to read image file as base64 or file is empty');
    }

    // Convert base64 to Uint8Array
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    fileToUpload = bytes;
    console.log('Prepared Uint8Array:', { type: contentType, size: fileToUpload.length });

    if (!fileToUpload || fileToUpload.length <= 0) {
      throw new Error('Uint8Array is empty after preparation');
    }
  }

  console.log('Uploading file:', { fileName, contentType, originalUri: imageUri, size: Platform.OS === 'web' ? (fileToUpload as Blob).size : (fileToUpload as Uint8Array).length });

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('profile-pictures')
    .upload(fileName, fileToUpload, {
      cacheControl: '3600',
      upsert: true,
      contentType,
    });

  if (uploadError) {
    console.error('Image upload error:', uploadError);
    throw uploadError;
  }

  if (!uploadData?.path) {
    throw new Error('Upload succeeded but no path returned');
  }

  const { data: { publicUrl } } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(fileName);

  console.log('Profile image uploaded successfully:', { fileName, publicUrl, path: uploadData.path });

  return publicUrl;
};

// Helper function to convert base64 to Uint8Array
const atob = (base64: string): string => {
  if (Platform.OS === 'web') {
    return window.atob(base64);
  }
  // For React Native, we need to implement base64 decoding
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  base64 = base64.replace(/[^A-Za-z0-9+/]/g, '');
  
  while (i < base64.length) {
    const encoded1 = chars.indexOf(base64.charAt(i++));
    const encoded2 = chars.indexOf(base64.charAt(i++));
    const encoded3 = chars.indexOf(base64.charAt(i++));
    const encoded4 = chars.indexOf(base64.charAt(i++));
    
    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    result += String.fromCharCode((bitmap >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
  }
  
  return result;
};

export const [AuthContext, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});

  // Load auth data on mount with Android optimizations
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        // On Android, prioritize cached data first for faster startup
        if (Platform.OS === 'android') {
          // Load cached user data immediately
          const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_USER);
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            console.log('Android: Loaded cached user immediately:', parsedUser.username);
            setIsLoading(false); // Set loading to false immediately with cached data
          }
          
          // Load onboarding data from cache
          const storedOnboarding = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DATA);
          if (storedOnboarding) {
            setOnboardingData(JSON.parse(storedOnboarding));
          }
        }
        
        if (hasValidSupabaseConfig) {
          // Check for existing Supabase session (with timeout for Android)
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), Platform.OS === 'android' ? 8000 : 15000)
          );
          
          let sessionResult;
          try {
            sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as any;
          } catch (timeoutError) {
            console.warn('Session check timed out, using cached data');
            if (Platform.OS === 'ios') {
              setIsLoading(false);
            }
            return;
          }
          
          const { data: { session }, error } = sessionResult;
          
          if (session?.user) {
            // Get user profile from database (with timeout)
            const profilePromise = supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            const profileTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Profile timeout')), Platform.OS === 'android' ? 6000 : 10000)
            );
            
            try {
              const { data: profile } = await Promise.race([profilePromise, profileTimeoutPromise]) as any;
              
              if (profile) {
                const authUser: AuthUser = {
                  id: profile.id,
                  username: profile.username,
                  email: session.user.email || '',
                  displayName: profile.display_name,
                  bio: profile.bio,
                  profileImage: profile.profile_image,
                  isOnboardingComplete: profile.is_onboarding_complete,
                  createdAt: profile.created_at
                };
                setUser(authUser);
                // Persist user data to AsyncStorage for offline access
                await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(authUser));
              }
            } catch (profileError) {
              console.warn('Profile fetch timed out or failed, keeping cached user');
            }
          } else if (Platform.OS === 'ios') {
            // No active session, check AsyncStorage for persisted user (iOS only, Android already loaded)
            const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_USER);
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              console.log('iOS: Loaded persisted user from storage:', parsedUser.username);
            }
          }
        } else {
          // Development mode - check for stored user (iOS only, Android already loaded)
          if (Platform.OS === 'ios') {
            const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_USER);
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          }
        }
        
        // Load onboarding data from AsyncStorage (iOS only, Android already loaded)
        if (Platform.OS === 'ios') {
          const storedOnboarding = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DATA);
          if (storedOnboarding) {
            setOnboardingData(JSON.parse(storedOnboarding));
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading auth data:', error);
        setIsLoading(false);
      }
    };

    // Delay auth loading on Android to prevent blocking UI
    if (Platform.OS === 'android') {
      const timer = setTimeout(() => {
        loadAuthData();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      loadAuthData();
    }
    
    // Listen for auth changes only if Supabase is configured
    let subscription: any;
    if (hasValidSupabaseConfig) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profile) {
            const authUser: AuthUser = {
              id: profile.id,
              username: profile.username,
              email: session.user.email || '',
              displayName: profile.display_name,
              bio: profile.bio,
              profileImage: profile.profile_image,
              isOnboardingComplete: profile.is_onboarding_complete,
              createdAt: profile.created_at
            };
            setUser(authUser);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setOnboardingData({});
        }
      });
      subscription = data.subscription;
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Save user data whenever it changes
  useEffect(() => {
    const saveUserData = async () => {
      try {
        if (user) {
          await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_USER);
        }
      } catch (error) {
        console.error('Error saving user data:', error);
      }
    };

    if (!isLoading) {
      saveUserData();
    }
  }, [user, isLoading]);

  // Save onboarding data whenever it changes
  useEffect(() => {
    const saveOnboardingData = async () => {
      try {
        if (Object.keys(onboardingData).length > 0) {
          await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DATA, JSON.stringify(onboardingData));
        }
      } catch (error) {
        console.error('Error saving onboarding data:', error);
      }
    };

    if (!isLoading) {
      saveOnboardingData();
    }
  }, [onboardingData, isLoading]);

  const updateOnboardingData = (data: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  const clearOnboardingData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_DATA);
      setOnboardingData({});
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
    }
  };

  const signUp = async (credentials: { username: string; email: string; password?: string; authProvider?: 'email' | 'google' | 'apple' }) => {
    try {
      if (hasValidSupabaseConfig) {
        if (credentials.authProvider === 'email' && credentials.password) {
          // Email signup with Supabase
          const { data, error } = await supabase.auth.signUp({
            email: credentials.email,
            password: credentials.password,
            options: {
              data: {
                username: credentials.username,
                display_name: credentials.username
              }
            }
          });
          
          if (error) throw error;
          
          if (data.user) {
            // Wait a moment for the trigger to create the profile
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update the profile with our specific data
            const { error: updateError } = await supabase
              .from('users')
              .update({
                username: credentials.username.toLowerCase(),
                display_name: credentials.username,
                is_onboarding_complete: false
              })
              .eq('id', data.user.id);
              
            if (updateError) {
              console.error('Profile update error:', updateError);
              // Don't throw here, the profile might have been created by trigger
            }
            
            const newUser: AuthUser = {
              id: data.user.id,
              username: credentials.username,
              email: credentials.email,
              displayName: credentials.username,
              isOnboardingComplete: false,
              createdAt: new Date().toISOString()
            };

            setUser(newUser);
            
            updateOnboardingData({
              username: credentials.username,
              email: credentials.email,
              authProvider: 'email'
            });

            return { success: true, user: newUser };
          }
        }
      } else {
        // Development mode - mock signup
        const userId = `dev_${Date.now()}`;
        const newUser: AuthUser = {
          id: userId,
          username: credentials.username,
          email: credentials.email,
          displayName: credentials.username,
          isOnboardingComplete: false,
          createdAt: new Date().toISOString()
        };

        setUser(newUser);
        
        updateOnboardingData({
          username: credentials.username,
          email: credentials.email,
          authProvider: 'email'
        });

        return { success: true, user: newUser };
      }
      
      return { success: false, error: 'Invalid signup method' };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message || 'Failed to create account' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (hasValidSupabaseConfig) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        if (data.user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
            
          if (profile) {
            const authUser: AuthUser = {
              id: profile.id,
              username: profile.username,
              email: data.user.email || '',
              displayName: profile.display_name,
              bio: profile.bio,
              profileImage: profile.profile_image,
              isOnboardingComplete: profile.is_onboarding_complete,
              createdAt: profile.created_at
            };
            
            setUser(authUser);
            return { success: true, user: authUser };
          }
        }
      } else {
        // Development mode - mock signin
        if (email === 'demo@example.com' && password === 'password123') {
          const mockUser: AuthUser = {
            id: 'dev_demo_user',
            username: 'demo_user',
            email: email,
            displayName: 'Demo User',
            isOnboardingComplete: true,
            createdAt: new Date().toISOString()
          };
          
          setUser(mockUser);
          return { success: true, user: mockUser };
        } else {
          return { success: false, error: 'Invalid credentials. Use demo@example.com / password123' };
        }
      }
      
      return { success: false, error: 'User profile not found' };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message || 'Invalid credentials' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (hasValidSupabaseConfig) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'exp://localhost:8081/--/auth/callback'
          }
        });
        
        if (error) throw error;
        
        return { success: true };
      } else {
        // Development mode - mock Google signin
        const mockUser: AuthUser = {
          id: 'dev_google_user',
          username: 'google_user',
          email: 'google@example.com',
          displayName: 'Google User',
          isOnboardingComplete: false,
          createdAt: new Date().toISOString()
        };
        
        setUser(mockUser);
        updateOnboardingData({
          email: 'google@example.com',
          authProvider: 'google'
        });
        
        return { success: true, user: mockUser };
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      return { success: false, error: error.message || 'Failed to sign in with Google' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (hasValidSupabaseConfig) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'exp://localhost:8081/--/auth/reset-password'
        });
        
        if (error) throw error;
        
        return { success: true };
      } else {
        // Development mode - mock password reset
        return { success: true };
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message || 'Failed to send reset email' };
    }
  };

  const signOut = async () => {
    try {
      if (hasValidSupabaseConfig) {
        await supabase.auth.signOut();
      }
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_USER, STORAGE_KEYS.ONBOARDING_DATA]);
      setUser(null);
      setOnboardingData({});
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const completeOnboarding = async (finalData: Partial<OnboardingData>) => {
    if (!user) return { success: false, error: 'No user found' };

    try {
      const completeData = { ...onboardingData, ...finalData };
      
      console.log('Complete onboarding data:', completeData);
      console.log('Current user:', user);
      
      let profileImageUrl: string | null = null;
      
      if (hasValidSupabaseConfig) {
        // Handle profile image upload if it's a local file
        if (completeData.profileImage && !completeData.profileImage.startsWith('http')) {
          try {
            profileImageUrl = await uploadProfileImage(user.id, completeData.profileImage);
          } catch (uploadError) {
            console.error('Error uploading profile image:', uploadError);
            // Continue without profile image if upload fails
          }
        } else if (completeData.profileImage && completeData.profileImage.startsWith('http')) {
          profileImageUrl = completeData.profileImage;
        }
        
        // Update user profile in database
        const updateData: any = {
          display_name: completeData.displayName || user.displayName,
          bio: completeData.bio || null,
          is_onboarding_complete: true
        };
        
        if (profileImageUrl) {
          updateData.profile_image = profileImageUrl;
        }
        
        // Add personal info if available
        if (completeData.gender) {
          updateData.gender = completeData.gender;
        }
        
        if (completeData.birthDate) {
          updateData.birth_date = completeData.birthDate.split('T')[0]; // Extract date part only
        }
        
        console.log('Updating user profile with data:', updateData);
        console.log('Profile image URL to save:', profileImageUrl);
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }
        
        // Update user preferences (use insert with ON CONFLICT)
        if (completeData.favoriteGenres || completeData.lovedDramas) {
          const { error: prefsError } = await supabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              favorite_genres: completeData.favoriteGenres || [],
              loved_dramas: completeData.lovedDramas || []
            })
            .select()
            .single();
            
          // If insert fails due to conflict, try update
          if (prefsError && prefsError.code === '23505') {
            const { error: updateError } = await supabase
              .from('user_preferences')
              .update({
                favorite_genres: completeData.favoriteGenres || [],
                loved_dramas: completeData.lovedDramas || []
              })
              .eq('user_id', user.id);
              
            if (updateError) {
              console.error('Preferences update error:', updateError);
              throw updateError;
            }
          } else if (prefsError) {
            console.error('Preferences insert error:', prefsError);
            throw prefsError;
          }
        }
      }

      const updatedUser: AuthUser = {
        ...user,
        displayName: completeData.displayName || user.displayName,
        profileImage: profileImageUrl || user.profileImage,
        isOnboardingComplete: true
      };

      setUser(updatedUser);
      await clearOnboardingData();

      return { success: true, user: updatedUser };
    } catch (error: any) {
      console.error('Complete onboarding error:', error);
      return { success: false, error: error.message || 'Failed to complete onboarding' };
    }
  };

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      if (hasValidSupabaseConfig) {
        const { error } = await supabase
          .from('users')
          .select('username')
          .eq('username', username.toLowerCase())
          .single();
          
        if (error && error.code === 'PGRST116') {
          // No rows returned, username is available
          return true;
        }
        
        // Username exists
        return false;
      } else {
        // Development mode - mock availability check
        const unavailableUsernames = ['admin', 'user', 'test', 'dorama', 'hub'];
        return !unavailableUsernames.includes(username.toLowerCase());
      }
    } catch (error) {
      console.error('Username check error:', error);
      return false;
    }
  };

  const updateProfile = async (profileData: { displayName?: string; bio?: string; profileImage?: string }) => {
    if (!user) return { success: false, error: 'No user found' };

    try {
      let profileImageUrl: string | null = null;
      
      if (hasValidSupabaseConfig) {
        // Handle profile image upload if it's a local file
        if (profileData.profileImage && !profileData.profileImage.startsWith('http')) {
          try {
            profileImageUrl = await uploadProfileImage(user.id, profileData.profileImage);
          } catch (uploadError) {
            console.error('Error uploading profile image:', uploadError);
            throw uploadError;
          }
        } else if (profileData.profileImage && profileData.profileImage.startsWith('http')) {
          profileImageUrl = profileData.profileImage;
        }
        
        // Update user profile in database
        const updateData: any = {};
        
        if (profileData.displayName !== undefined) {
          updateData.display_name = profileData.displayName;
        }
        
        if (profileData.bio !== undefined) {
          updateData.bio = profileData.bio;
        }
        
        if (profileImageUrl) {
          updateData.profile_image = profileImageUrl;
        }
        
        console.log('Updating user profile with data:', updateData);
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }
      }

      const updatedUser: AuthUser = {
        ...user,
        displayName: profileData.displayName !== undefined ? profileData.displayName : user.displayName,
        bio: profileData.bio !== undefined ? profileData.bio : user.bio,
        profileImage: profileImageUrl || (profileData.profileImage === undefined ? user.profileImage : profileData.profileImage)
      };

      setUser(updatedUser);

      return { success: true, user: updatedUser };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message || 'Failed to update profile' };
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    needsOnboarding: user && !user.isOnboardingComplete,
    onboardingData,
    updateOnboardingData,
    clearOnboardingData,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    completeOnboarding,
    checkUsernameAvailability,
    updateProfile
  };
});