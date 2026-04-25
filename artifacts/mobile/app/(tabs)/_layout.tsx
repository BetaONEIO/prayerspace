import { Tabs } from "expo-router";
import { Home, Sun, Users, MessageCircle } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/providers/ThemeProvider";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: (Platform.OS === "ios" ? 56 : 56) + bottomInset,
          paddingBottom: bottomInset > 0 ? bottomInset : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pray"
        options={{
          title: "Pray",
          tabBarIcon: ({ color, size }) => <Sun size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
