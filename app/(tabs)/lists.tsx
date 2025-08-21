import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Play, Bookmark, CheckCircle } from "lucide-react-native";
import { COLORS } from "@/constants/colors";
import { ListType } from "@/types/user";
import { useUserLists } from "@/hooks/useUserStore";
import { WatchingList } from "@/components/lists/WatchingList";
import { WatchlistList } from "@/components/lists/WatchlistList";
import { CompletedList } from "@/components/lists/CompletedList";

type TabType = "watching" | "watchlist" | "completed";

const tabs: { key: TabType; title: string; listType: ListType }[] = [
  { key: "watching", title: "Assistindo", listType: "watching" },
  { key: "watchlist", title: "Quero Assistir", listType: "watchlist" },
  { key: "completed", title: "Concluídos", listType: "completed" },
];

const getTabIcon = (tabKey: TabType, isActive: boolean) => {
  const color = isActive ? COLORS.accent : COLORS.textSecondary;
  switch (tabKey) {
    case "watching":
      return <Play size={18} color={color} />;
    case "watchlist":
      return <Bookmark size={18} color={color} />;
    case "completed":
      return <CheckCircle size={18} color={color} />;
    default:
      return null;
  }
};

export default function ListsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("watching");
  const { lists } = useUserLists();

  const renderTabContent = () => {
    switch (activeTab) {
      case "watching":
        return <WatchingList dramas={lists.watching} />;
      case "watchlist":
        return <WatchlistList dramas={lists.watchlist} />;
      case "completed":
        return <CompletedList dramas={lists.completed} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Listas</Text>
      </View>

      {/* Tab Container */}
      <View style={styles.tabContainer}>
        {/* First Row: Assistindo and Quero Assistir */}
        <View style={styles.tabRow}>
          {tabs.slice(0, 2).map((tab) => {
            const isActive = activeTab === tab.key;
            const count = lists[tab.listType].length;
            
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  isActive && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab(tab.key)}
                testID={`tab-${tab.key}`}
              >
                <View style={styles.tabIcon}>
                  {getTabIcon(tab.key, isActive)}
                </View>
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.activeTabText,
                  ]}
                >
                  {tab.title}
                </Text>
                {count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        
        {/* Second Row: Concluídos */}
        <View style={styles.tabRow}>
          {tabs.slice(2).map((tab) => {
            const isActive = activeTab === tab.key;
            const count = lists[tab.listType].length;
            
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  isActive && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab(tab.key)}
                testID={`tab-${tab.key}`}
              >
                <View style={styles.tabIcon}>
                  {getTabIcon(tab.key, isActive)}
                </View>
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.activeTabText,
                  ]}
                >
                  {tab.title}
                </Text>
                {count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-start',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    gap: 6,
    flex: 1,
    maxWidth: '48%',
  },
  activeTabButton: {
    backgroundColor: COLORS.accent + '20',
  },
  tabIcon: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.accent,
  },
  countBadge: {
    marginLeft: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.background,
  },
  content: {
    flex: 1,
  },
});