import React, { ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme, getThemeColors } from "../context/ThemeContext";

export const StatusCard = ({
  title,
  count,
  icon,
  highlight = false,
  onPress,
}) => {
  const { isDarkMode } = useTheme();
  const colors = getThemeColors(isDarkMode);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        highlight
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.card },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <Text
        style={[
          styles.count,
          highlight ? styles.highlightText : { color: colors.text },
        ]}
      >
        {count}
      </Text>
      <Text
        style={[
          styles.title,
          highlight ? styles.highlightText : { color: colors.textSecondary },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    marginBottom: 12,
  },
  count: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: "#666",
  },
  highlightText: {
    color: "white",
  },
});
