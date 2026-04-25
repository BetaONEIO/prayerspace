import React, { useEffect, useRef, useMemo } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { useThemeColors } from "@/providers/ThemeProvider";

interface ThemedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
}

export default function ThemedSwitch({ value, onValueChange, testID }: ThemedSwitchProps) {
  const colors = useThemeColors();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: false,
      bounciness: 4,
      speed: 18,
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.muted, colors.primary],
  });

  const thumbLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={8}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.thumb, { left: thumbLeft }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    position: "relative",
  },
  thumb: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
});
