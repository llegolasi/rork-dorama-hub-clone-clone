import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Home, Search, User, Bookmark, Users, Heart } from "lucide-react-native";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { COLORS } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";

export default function TabLayout() {
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || needsOnboarding) {
        router.replace('/onboarding');
      }
    }
  }, [isAuthenticated, isLoading, needsOnboarding, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!isAuthenticated || needsOnboarding) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.tabBarInactive,
        tabBarStyle: {
          backgroundColor: COLORS.tabBar,
          borderTopColor: COLORS.border,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
        },
        headerTintColor: COLORS.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Descobrir",
          headerShown: false,
          tabBarIcon: ({ color }) => <Heart color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Pesquisar",
          headerShown: false,
          tabBarIcon: ({ color }) => <Search color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: "Minhas Listas",
          headerShown: false,
          tabBarIcon: ({ color }) => <Bookmark color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Comunidade",
          headerShown: false,
          tabBarIcon: ({ color }) => <Users color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}