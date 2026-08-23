import React, { useEffect, useMemo, useRef } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { dismissKeyboard } from "@/lib/keyboard";

interface Props {
  visible: boolean;
  title?: string;
  value: string;
  placeholder: string;
  maxLength?: number;
  onChangeText: (text: string) => void;
  onDone: () => void;
}

export default function FullScreenTextEditor({
  visible,
  title = "Edit text",
  value,
  placeholder,
  maxLength,
  onChangeText,
  onDone,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const finish = () => {
    dismissKeyboard();
    onDone();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={finish}
    >
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.closeButton}
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel="Done editing"
          >
            <X size={19} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            style={styles.doneButton}
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel="Done editing"
          >
            <Check size={17} color={colors.primaryForeground} strokeWidth={2.5} />
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>

        <View style={styles.editorWrap}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground + "88"}
            multiline
            maxLength={maxLength}
            textAlignVertical="top"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={finish}
            autoCorrect
          />
          {maxLength !== undefined && (
            <Text style={styles.counter}>
              {value.length} / {maxLength}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
    },
    header: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 17,
      fontWeight: "800" as const,
      color: colors.foreground,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    doneButton: {
      minWidth: 70,
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    doneText: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: "700" as const,
    },
    editorWrap: {
      flex: 1,
      paddingTop: 22,
      position: "relative",
    },
    input: {
      flex: 1,
      padding: 0,
      paddingBottom: 44,
      color: colors.foreground,
      fontSize: 20,
      lineHeight: 29,
      fontWeight: "500" as const,
    },
    counter: {
      position: "absolute",
      right: 0,
      bottom: 16,
      color: colors.mutedForeground,
      fontSize: 11,
      fontWeight: "700" as const,
      letterSpacing: 0.5,
    },
  });
}