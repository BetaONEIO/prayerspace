import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { DarkColors, LightColors, ThemeColors } from "@/constants/colors";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "prayer_space_theme";

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === "dark" || stored === "light") {
          setMode(stored);
          console.log("[Theme] Loaded stored theme:", stored);
        }
      })
      .catch((e) => console.warn("[Theme] Failed to load theme:", e))
      .finally(() => setIsLoaded(true));
  }, []);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch((e) =>
      console.warn("[Theme] Failed to save theme:", e)
    );
    console.log("[Theme] Theme changed to:", newMode);
  }, []);

  const colors: ThemeColors = mode === "dark" ? DarkColors : LightColors;
  const isDark = mode === "dark";

  return { mode, setTheme, colors, isDark, isLoaded };
});

export function useThemeColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}
