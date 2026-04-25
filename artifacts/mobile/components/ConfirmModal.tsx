import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Animated,
} from "react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      backdropAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, backdropAnim, scaleAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View
          style={[styles.card, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.btnRow}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.cancelBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                destructive ? styles.destructiveBtn : styles.confirmBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  styles.confirmText,
                  destructive && styles.destructiveText,
                ]}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 32,
    },
    card: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 28,
      padding: 28,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.18,
      shadowRadius: 32,
      elevation: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 21,
      marginBottom: 24,
    },
    btnRow: {
      flexDirection: "column" as const,
      gap: 10,
    },
    btn: {
      paddingVertical: 16,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    btnPressed: {
      opacity: 0.82,
    },
    cancelBtn: {
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmBtn: {
      backgroundColor: colors.primary,
    },
    destructiveBtn: {
      backgroundColor: colors.destructive + "15",
      borderWidth: 1,
      borderColor: colors.destructive + "40",
    },
    cancelText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.secondaryForeground,
    },
    confirmText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    destructiveText: {
      color: colors.destructive,
    },
  });
}
