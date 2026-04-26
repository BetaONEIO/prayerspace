import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RefreshCw, Heart, BookOpen, Archive, X } from "lucide-react-native";
import { LightColors as Colors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";

export type FollowUpOption =
  | "share_update"
  | "still_need_prayer"
  | "mark_answered"
  | "archive";

interface Props {
  visible: boolean;
  onClose: () => void;
  onOption: (option: FollowUpOption) => void;
  prayerSnippet?: string;
}

const OPTIONS: {
  key: FollowUpOption;
  emoji: string;
  label: string;
  sub: string;
  color: string;
  bg: string;
}[] = [
  {
    key: "share_update",
    emoji: "✍️",
    label: "Share an update",
    sub: "Let people know how it went",
    color: Colors.primary,
    bg: Colors.primary + "10",
  },
  {
    key: "still_need_prayer",
    emoji: "🙏",
    label: "Still need prayer",
    sub: "Keep this request active",
    color: "#7C5CBF",
    bg: "#7C5CBF10",
  },
  {
    key: "mark_answered",
    emoji: "✨",
    label: "Mark as answered",
    sub: "Celebrate what God did",
    color: "#2A9D6C",
    bg: "#2A9D6C10",
  },
  {
    key: "archive",
    emoji: "📂",
    label: "Archive",
    sub: "Move to archived requests",
    color: Colors.mutedForeground,
    bg: Colors.muted,
  },
];

export default function PrayerFollowUpModal({
  visible,
  onClose,
  onOption,
  prayerSnippet,
}: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleOption = useCallback(
    (key: FollowUpOption) => {
      onOption(key);
      onClose();
    },
    [onOption, onClose]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={styles.dragHandle} />

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <X size={18} color={Colors.mutedForeground} />
          </Pressable>

          <View style={styles.topContent}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🌿</Text>
            </View>
            <Text style={styles.title}>How did this go?</Text>
            <Text style={styles.subtitle}>Would you like to share an update?</Text>
            {prayerSnippet ? (
              <View style={styles.snippetCard}>
                <Text style={styles.snippetText} numberOfLines={2}>
                  "{prayerSnippet}"
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.options}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={[styles.optionRow, { backgroundColor: opt.bg }]}
                onPress={() => handleOption(opt.key)}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: opt.color }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.optionSub}>{opt.sub}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FAF8F5",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  topContent: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  iconEmoji: {
    fontSize: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  snippetCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: "90%",
  },
  snippetText: {
    fontSize: 13,
    color: Colors.secondaryForeground,
    lineHeight: 20,
    fontStyle: "italic",
    textAlign: "center",
  },
  options: {
    gap: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionEmoji: {
    fontSize: 22,
    width: 32,
    textAlign: "center",
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 16,
  },
});
