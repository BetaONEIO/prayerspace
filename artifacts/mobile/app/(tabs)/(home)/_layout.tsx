import { Stack } from "expo-router";
import React from "react";
import { useThemeColors } from "@/providers/ThemeProvider";

export default function HomeLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
