import React, { useContext, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme, useThemeColors } from "@/providers/ThemeProvider";
import type { ThemeColors } from "@/constants/colors";

/**
 * Telegram-style floating pill tab bar.
 * A detached rounded bar hovering above the bottom edge with labels under
 * each icon and a rounded highlight bubble behind the active tab's icon.
 */
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  // Web needs an explicit bottom inset (home indicator area isn't reported)
  const bottomOffset =
    Platform.OS === "web" ? Math.max(insets.bottom, 34) : Math.max(insets.bottom, 12);

  // Report the space the floating bar occupies so screens using
  // useBottomTabBarHeight() pad their content correctly.
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext) as
    | ((height: number) => void)
    | undefined;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: bottomOffset }]}
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height + bottomOffset)}
      accessibilityRole={Platform.OS === "web" ? ("tablist" as const) : undefined}
    >
      <View style={styles.pill}>
        {/* Frosted glass background — blurred content shows through the pill */}
        <View style={styles.pillClip}>
          <BlurView
            intensity={50}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.pillTint} />
        </View>
        {state.routes.map((route, index) => {
          const options = descriptors[route.key]?.options ?? {};
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;
          const isFocused = state.index === index;
          const tint = isFocused ? colors.primary : colors.tabIconDefault;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <TabItem
              key={route.key}
              focused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              label={label}
              tint={tint}
              colors={colors}
              styles={styles}
              renderIcon={options.tabBarIcon}
              testID={options.tabBarButtonTestID ?? `tab-${route.name}`}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  focused,
  onPress,
  onLongPress,
  label,
  tint,
  styles,
  renderIcon,
  testID,
}: {
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  label: string;
  tint: string;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  renderIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  testID?: string;
}) {
  const bubbleAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(bubbleAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  }, [focused, bubbleAnim]);

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      onLongPress={onLongPress}
      testID={testID}
      accessibilityRole={Platform.OS === "web" ? ("tab" as const) : "button"}
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={styles.iconSlot}>
        <Animated.View
          style={[
            styles.bubble,
            { opacity: bubbleAnim, transform: [{ scale: bubbleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
          ]}
        />
        {renderIcon?.({ focused, color: tint, size: 22 })}
      </View>
      <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    wrap: {
      position: "absolute" as const,
      left: 0,
      right: 0,
      alignItems: "center" as const,
    },
    pill: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginHorizontal: 20,
      alignSelf: "center" as const,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      // Frosted glass on web via backdrop blur (BlurView web support is partial);
      // native platforms get a real BlurView underlay instead.
      ...(Platform.OS === "web"
        ? ({
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            backgroundColor: isDark ? "rgba(15,23,42,0.55)" : "rgba(255,255,255,0.55)",
          } as object)
        : {}),
      // Elevation / shadow
      ...(Platform.OS === "android"
        ? { elevation: 10 }
        : Platform.OS === "web"
          ? ({ boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(0,0,0,0.18)" } as object)
          : {
              shadowColor: "#000",
              shadowOpacity: isDark ? 0.3 : 0.15,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
            }),
    },
    pillClip: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 999,
      overflow: "hidden" as const,
      // On web the pill itself carries the backdrop blur; skip the underlay
      display: Platform.OS === "web" ? ("none" as const) : ("flex" as const),
    },
    pillTint: {
      ...StyleSheet.absoluteFillObject,
      // Soft theme-aware wash over the blur so icons/labels stay legible
      backgroundColor: isDark ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.45)",
    },
    item: {
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 14,
      paddingVertical: 2,
      minWidth: 68,
    },
    iconSlot: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    bubble: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 22,
      backgroundColor: colors.primary + "1F",
    },
    label: {
      fontSize: 11,
      fontWeight: "600" as const,
      marginTop: 2,
    },
  });
}
