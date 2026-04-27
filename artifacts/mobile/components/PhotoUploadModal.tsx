import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Animated, ActivityIndicator, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Camera, ImageIcon, Trash2, X } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import InAppCropper from "@/components/InAppCropper";

interface PhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string) => void;
  onRemovePhoto?: () => void;
  hasExistingPhoto?: boolean;
  isUploading?: boolean;
}

export default function PhotoUploadModal({ visible, onClose, onImageSelected, onRemovePhoto, hasExistingPhoto = false, isUploading = false }: PhotoUploadModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [cropUri, setCropUri] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const requestPermission = useCallback(async (type: "camera" | "library") => {
    if (type === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === "granted";
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === "granted";
    }
  }, []);

  const openCropper = useCallback(async (uri: string) => {
    try {
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1500 } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCropUri(resized.uri);
    } catch {
      setCropUri(uri);
    }
    setShowCropper(true);
  }, []);

  const handleTakePhoto = useCallback(async () => {
    if (Platform.OS !== "web") { const granted = await requestPermission("camera"); if (!granted) return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: "images", allowsEditing: false, quality: 1 });
    if (!result.canceled && result.assets[0]) await openCropper(result.assets[0].uri);
  }, [requestPermission, openCropper]);

  const handleChooseFromLibrary = useCallback(async () => {
    if (Platform.OS !== "web") { const granted = await requestPermission("library"); if (!granted) return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: false, quality: 1 });
    if (!result.canceled && result.assets[0]) await openCropper(result.assets[0].uri);
  }, [requestPermission, openCropper]);

  const handleCropConfirm = useCallback((uri: string) => { setShowCropper(false); setCropUri(null); onImageSelected(uri); }, [onImageSelected]);
  const handleCropCancel = useCallback(() => { setShowCropper(false); setCropUri(null); }, []);

  return (
    <>
      <Modal visible={visible && !showCropper} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>Profile Photo</Text>
              <Pressable style={styles.closeBtn} onPress={onClose}><X size={18} color={colors.mutedForeground} /></Pressable>
            </View>
            <Text style={styles.subtitle}>Choose a photo — you'll crop it to a circle right in the app</Text>

            {isUploading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Uploading photo…</Text>
              </View>
            ) : (
              <View style={styles.options}>
                {Platform.OS !== "web" && (
                  <Pressable style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]} onPress={handleTakePhoto} testID="take-photo-btn">
                    <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}><Camera size={22} color={colors.primary} /></View>
                    <View style={styles.optionText}><Text style={styles.optionTitle}>Take Photo</Text><Text style={styles.optionDesc}>Use your camera</Text></View>
                  </Pressable>
                )}
                <Pressable style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]} onPress={handleChooseFromLibrary} testID="choose-library-btn">
                  <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}><ImageIcon size={22} color={colors.primary} /></View>
                  <View style={styles.optionText}><Text style={styles.optionTitle}>Choose from Library</Text><Text style={styles.optionDesc}>Pick from your photos</Text></View>
                </Pressable>
                {hasExistingPhoto && onRemovePhoto && (
                  <Pressable style={({ pressed }) => [styles.optionCard, styles.optionCardDestructive, pressed && styles.optionCardPressed]} onPress={() => { onRemovePhoto(); onClose(); }} testID="remove-photo-btn">
                    <View style={[styles.iconWrap, { backgroundColor: colors.destructive + "18" }]}><Trash2 size={22} color={colors.destructive} /></View>
                    <View style={styles.optionText}><Text style={[styles.optionTitle, { color: colors.destructive }]}>Remove Photo</Text><Text style={styles.optionDesc}>Revert to default avatar</Text></View>
                  </Pressable>
                )}
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>

      <InAppCropper visible={showCropper} imageUri={cropUri} onConfirm={handleCropConfirm} onCancel={handleCropCancel} />
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, paddingHorizontal: 24, paddingTop: 12 },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
    title: { fontSize: 20, fontWeight: "700" as const, color: colors.foreground },
    closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    subtitle: { fontSize: 13, color: colors.mutedForeground, marginBottom: 24, lineHeight: 19 },
    options: { gap: 12 },
    optionCard: { flexDirection: "row" as const, alignItems: "center" as const, backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 16 },
    optionCardDestructive: { borderColor: colors.destructive + "25" },
    optionCardPressed: { opacity: 0.7 },
    iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const },
    optionText: { flex: 1, gap: 2 },
    optionTitle: { fontSize: 15, fontWeight: "600" as const, color: colors.foreground },
    optionDesc: { fontSize: 12, color: colors.mutedForeground },
    loadingContainer: { alignItems: "center" as const, paddingVertical: 32, gap: 14 },
    loadingText: { fontSize: 14, color: colors.mutedForeground, fontWeight: "500" as const },
  });
}
