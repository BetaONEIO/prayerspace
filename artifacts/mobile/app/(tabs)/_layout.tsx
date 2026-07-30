import { Tabs } from "expo-router";
import React from "react";
import { useThemeColors } from "@/providers/ThemeProvider";
import FloatingTabBar from "@/components/FloatingTabBar";
import {
  HomeTabIcon,
  PrayTabIcon,
  PeopleTabIcon,
  MessageTabIcon,
} from "@/components/TabIcons";

export default function TabLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <HomeTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="pray"
        options={{
          title: "Pray",
          tabBarIcon: ({ color, size }) => <PrayTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }) => <PeopleTabIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <MessageTabIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
