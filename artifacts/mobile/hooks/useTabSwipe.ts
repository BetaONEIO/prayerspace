import { useRef } from "react";
import { PanResponder, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

type TabRoute = "/(tabs)/(home)" | "/(tabs)/pray" | "/(tabs)/community" | "/(tabs)/activity";

export function useTabSwipe(prev: TabRoute | null, next: TabRoute | null) {
  const router = useRouter();
  const isSwiping = useRef(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const { dx, dy } = gestureState;
      return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
    },
    onPanResponderGrant: () => {
      isSwiping.current = false;
    },
    onPanResponderRelease: (_, gestureState) => {
      if (isSwiping.current) return;
      const { dx, vx } = gestureState;

      if (dx < -SWIPE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD) {
        if (next) {
          isSwiping.current = true;
          if (Platform.OS !== "web") {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push(next as never);
        }
      } else if (dx > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD) {
        if (prev) {
          isSwiping.current = true;
          if (Platform.OS !== "web") {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push(prev as never);
        }
      }
    },
  });

  return panResponder.panHandlers;
}
