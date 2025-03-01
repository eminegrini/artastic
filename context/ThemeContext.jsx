import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Get device preference
  const deviceTheme = useColorScheme();
  const [theme, setTheme] = useState("light");

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("theme");
        if (savedTheme) {
          setTheme(savedTheme);
        } else if (deviceTheme) {
          // Use device preference if no saved preference
          setTheme(deviceTheme);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      }
    };

    loadTheme();
  }, [deviceTheme]);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem("theme", newTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const setDarkMode = async (enabled) => {
    const newTheme = enabled ? "dark" : "light";
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem("theme", newTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDarkMode: theme === "dark",
        toggleTheme,
        setDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Define theme colors
export const lightTheme = {
  background: "#F7F8FC",
  card: "#FFFFFF",
  text: "#333333",
  textSecondary: "#666666",
  textTertiary: "#999999",
  primary: "#6C63FF",
  border: "#F0F0F0",
  shadow: "rgba(0, 0, 0, 0.05)",
  divider: "#EEEEEE",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  statusBar: "dark-content",
};

export const darkTheme = {
  background: "#121212",
  card: "#1E1E1E",
  text: "#F5F5F5",
  textSecondary: "#B0B0B0",
  textTertiary: "#757575",
  primary: "#8C83FF",
  border: "#2C2C2C",
  shadow: "rgba(0, 0, 0, 0.2)",
  divider: "#2C2C2C",
  success: "#66BB6A",
  warning: "#FFA726",
  error: "#EF5350",
  statusBar: "light-content",
};

export const getThemeColors = (isDark) => {
  return isDark ? darkTheme : lightTheme;
};
