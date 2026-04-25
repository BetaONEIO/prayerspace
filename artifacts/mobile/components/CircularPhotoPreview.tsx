import React, { useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Dimensions, Animated, Platform } from "react-native";
import { Image } from "expo-image";
import { Check, RotateCcw } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.78, 320);
const BORDER_WIDTH = 1200;

interface CircularPhotoPreviewProps {
  visible: boolean;
  imageUri: string | null;
  onConfirm: (uri: string) => void;
  onRetake: () => void;
}

export default function CircularPhotoPreview({ visible, imageUri, onConfirm, onRetake }: CircularPhotoPreviewProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 260, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.88);
    }
  }, [visible, fadeAnim, scaleAnim]);

  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="none" onRequestClose={onRetake} statusBarTranslucent>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.topBar}>
          <Pressable style={styles.retakeBtn} onPress={onRetake} testID="retake-btn">
            <RotateCcw size={17} color={colors.foreground} />
            <Text style={styles.retakeBtnText}>Retake</Text>
          </Pressable>
        </View>

        <View style={styles.previewArea}>
          <Text style={styles.previewLabel}>PROFILE PHOTO PREVIEW</Text>
          <Animated.View style={[styles.circleWrapper, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.circleOuter}>
              <Image source={{ uri: imageUri }} style={styles.circleImage} contentFit="cover" />
            </View>
            <View style={styles.circleMaskOverlay} pointerEvents="none" />
          </Animated.View>
          <Text style={styles.previewHint}>Your photo will appear like this on your profile</Text>
        </View>

        <View style={styles.smallPreviewRow}>
          {[{ size: 64, label: "Profile" }, { size: 44, label: "Chat" }, { size: 32, label: "Comment" }].map(({ size, label }) => (
            <View key={label} style={styles.smallPreviewItem}>
              <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" as const, borderWidth: 2, borderColor: colors.border }}>
                <Image source={{ uri: imageUri }} style={{ width: size, height: size }} contentFit="cover" />
              </View>
              <Text style={styles.smallPreviewLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomActions}>
          <Pressable style={({ pressed }) => [styles.usePhotoBtn, pressed && styles.usePhotoBtnPressed]} onPress={() => onConfirm(imageUri)} testID="use-photo-btn">
            <Check size={20} color={colors.primaryForeground} strokeWidth={2.5} />
            <Text style={styles.usePhotoBtnText}>Use This Photo</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topBar: { paddingTop: Platform.OS === "ios" ? 60 : 44, paddingHorizontal: 24, paddingBottom: 12, flexDirection: "row" as const, alignItems: "center" as const },
    retakeBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 7, backgroundColor: colors.secondary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
    retakeBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.foreground },
    previewArea: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: 20, paddingHorizontal: 24 },
    previewLabel: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 2 },
    circleWrapper: { alignItems: "center" as const, justifyContent: "center" as const, position: "relative" as const },
    circleOuter: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, overflow: "hidden" as const, borderWidth: 4, borderColor: colors.card },
    circleImage: { width: CIRCLE_SIZE, height: CIRCLE_SIZE },
    circleMaskOverlay: { position: "absolute" as const, width: CIRCLE_SIZE + 2 * BORDER_WIDTH, height: CIRCLE_SIZE + 2 * BORDER_WIDTH, borderRadius: (CIRCLE_SIZE + 2 * BORDER_WIDTH) / 2, borderWidth: BORDER_WIDTH, borderColor: colors.background + "EC", top: -(BORDER_WIDTH - 2), left: -(BORDER_WIDTH - 2) },
    previewHint: { fontSize: 13, color: colors.mutedForeground, textAlign: "center" as const, lineHeight: 20, maxWidth: 240 },
    smallPreviewRow: { flexDirection: "row" as const, alignItems: "flex-end" as const, justifyContent: "center" as const, gap: 32, paddingHorizontal: 24, paddingBottom: 28 },
    smallPreviewItem: { alignItems: "center" as const, gap: 8 },
    smallPreviewLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: "500" as const },
    bottomActions: { paddingHorizontal: 24, paddingBottom: Platform.OS === "ios" ? 48 : 32, gap: 12 },
    usePhotoBtn: { backgroundColor: colors.primary, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 18, borderRadius: 18, gap: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
    usePhotoBtnPressed: { opacity: 0.85 },
    usePhotoBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground, letterSpacing: 0.2 },
  });
}
