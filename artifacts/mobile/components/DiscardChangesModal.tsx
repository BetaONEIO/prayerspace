import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import { AlertTriangle, PenLine } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";

interface DiscardChangesModalProps {
  visible: boolean;
  message: string;
  onStay: () => void;
  onDiscard: () => void;
}

export default function DiscardChangesModal({
  visible,
  message,
  onStay,
  onDiscard,
}: DiscardChangesModalProps) {
  const colors = useThemeColors();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: 20, stiffness: 320, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.88, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onStay}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onStay} />

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.destructive + "16" }]}>
            <AlertTriangle size={26} color={colors.destructive} strokeWidth={2} />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Discard changes?
          </Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>
            {message}
          </Text>

          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.stayBtn,
                { borderColor: colors.border, backgroundColor: colors.secondary },
                pressed && styles.btnPressed,
              ]}
              onPress={onStay}
            >
              <PenLine size={15} color={colors.foreground} strokeWidth={2} />
              <Text style={[styles.stayBtnText, { color: colors.foreground }]}>
                Keep editing
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.discardBtn,
                { backgroundColor: colors.destructive },
                pressed && styles.btnPressed,
              ]}
              onPress={onDiscard}
            >
              <Text style={styles.discardBtnText}>Discard</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: "center" as const,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: "800" as const,
    letterSpacing: -0.4,
    textAlign: "center" as const,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center" as const,
    fontWeight: "500" as const,
    marginBottom: 8,
  },
  buttons: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  stayBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  stayBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  discardBtn: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 15,
    borderRadius: 999,
  },
  discardBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#fff",
  },
  btnPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
