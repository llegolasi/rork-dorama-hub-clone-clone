import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { BookOpen, Search, Film } from "lucide-react-native";

interface EmptyStateProps {
  title: string;
  subtitle: string;
  actionText?: string;
  onAction?: () => void;
  icon?: "book" | "search" | "film";
}

export function EmptyState({
  title,
  subtitle,
  actionText,
  onAction,
  icon = "book",
}: EmptyStateProps) {
  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      // Default action: navigate to home
      router.push("/(tabs)");
    }
  };

  const renderIcon = () => {
    const iconProps = {
      size: 48,
      color: COLORS.textSecondary,
    };

    switch (icon) {
      case "search":
        return <Search {...iconProps} />;
      case "film":
        return <Film {...iconProps} />;
      default:
        return <BookOpen {...iconProps} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {renderIcon()}
        </View>
        
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        
        {actionText && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAction}
            testID="empty-state-action"
          >
            <Text style={styles.actionButtonText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  content: {
    alignItems: "center",
    maxWidth: 280,
  },
  iconContainer: {
    marginBottom: 24,
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  actionButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
});