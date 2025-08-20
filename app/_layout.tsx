import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { Platform, InteractionManager } from "react-native";

import { UserContext } from "@/hooks/useUserStore";
import { AuthContext, useAuth } from "@/hooks/useAuth";
import { trpc, trpcClient } from "@/lib/trpc";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Android-optimized query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Platform.OS === 'android' ? 10 * 60 * 1000 : 5 * 60 * 1000, // Longer stale time on Android
      gcTime: Platform.OS === 'android' ? 15 * 60 * 1000 : 10 * 60 * 1000, // Longer garbage collection time on Android
      retry: Platform.OS === 'android' ? 1 : 2, // Fewer retries on Android to prevent blocking
      retryDelay: (attemptIndex) => Platform.OS === 'android' 
        ? Math.min(1000 * 2 ** attemptIndex, 5000) // Exponential backoff on Android
        : Math.min(1000 * 2 ** attemptIndex, 3000),
      refetchOnWindowFocus: false, // Disable on mobile
      refetchOnReconnect: Platform.OS === 'android' ? 'always' : true,
      networkMode: Platform.OS === 'android' ? 'offlineFirst' : 'online',
    },
    mutations: {
      retry: Platform.OS === 'android' ? 1 : 2,
      retryDelay: (attemptIndex) => Platform.OS === 'android'
        ? Math.min(2000 * 2 ** attemptIndex, 8000)
        : Math.min(1000 * 2 ** attemptIndex, 5000),
      networkMode: Platform.OS === 'android' ? 'offlineFirst' : 'online',
    },
  },
});

function RootLayoutNav() {
  const { user, isLoading, needsOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // Redirect to onboarding if not authenticated
      router.replace('/onboarding');
    } else if (user && needsOnboarding && !inAuthGroup) {
      // Redirect to onboarding if user needs to complete onboarding
      router.replace('/onboarding');
    } else if (user && !needsOnboarding && inAuthGroup) {
      // Redirect to main app if user is authenticated and onboarding is complete
      router.replace('/(tabs)');
    }
  }, [user, isLoading, needsOnboarding, segments, router]);

  return (
    <Stack 
      screenOptions={{ 
        headerStyle: { 
          backgroundColor: "#121212",
          // Add extra height for Android to avoid status bar overlap
          ...(Platform.OS === 'android' && { paddingTop: 24 })
        },
        headerTintColor: "#FFFFFF",
        headerBackTitle: "Back",
        contentStyle: {
          backgroundColor: "#121212",
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
      <Stack.Screen 
        name="drama/[id]" 
        options={{ 
          headerTransparent: true,
          headerTitle: () => null,
          headerBackTitle: "Voltar"
        }} 
      />
      <Stack.Screen 
        name="actor/[id]" 
        options={{ 
          headerTransparent: true,
          headerTitle: () => null,
          headerBackTitle: "Voltar"
        }} 
      />
      <Stack.Screen 
        name="categories/[id]" 
        options={{ 
          title: "Category",
          headerBackTitle: "Voltar"
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Delay splash screen hiding on Android to ensure smooth startup
    if (Platform.OS === 'android') {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          SplashScreen.hideAsync();
        }, 200);
      });
    } else {
      SplashScreen.hideAsync();
    }
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthContext>
          <UserContext>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <StatusBar style="light" />
              <RootLayoutNav />
            </GestureHandlerRootView>
          </UserContext>
        </AuthContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}