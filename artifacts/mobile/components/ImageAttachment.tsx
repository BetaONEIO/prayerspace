import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { ImagePlus, X, AlertCircle, RefreshCw } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

interface ImageAttachmentProps {
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
  onRemove: () => void;
  onPress?: () => void;
  isUploading?: boolean;
  uploadError?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  chipMode?: boolean;
}

export default function ImageAttachment({ imageUri, onImageSelected, onRemove, onPress, isUploading = false, uploadError = null, onRetry, disabled = false, chipMode = false }: ImageAttachmentProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePickImage = useCallback(async () => {
    if (disabled || isUploading) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission Needed", "Please allow access to your photo library.", [{ text: "OK" }]); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled && result.assets[0]) onImageSelected(result.assets[0].uri);
  }, [disabled, isUploading, onImageSelected]);

  if (!imageUri) {
    if (chipMode) {
      return (
        <Pressable
          style={({ pressed }) => [styles.chipBtn, disabled && styles.chipBtnDisabled, pressed && styles.chipBtnPressed]}
          onPress={handlePickImage}
          disabled={disabled}
          testID="image-attach-btn"
        >
          <ImagePlus size={14} color={disabled ? colors.mutedForeground + "60" : colors.mutedForeground} />
          <Text style={[styles.chipBtnText, disabled && styles.chipBtnTextDisabled]}>Photo</Text>
        </Pressable>
      );
    }
    return (
      <Pressable style={[styles.addImageBtn, disabled && styles.addImageBtnDisabled]} onPress={handlePickImage} disabled={disabled} testID="image-attach-btn">
        <ImagePlus size={20} color={disabled ? colors.mutedForeground + "60" : colors.primary} />
      </Pressable>
    );
  }

  return (
    <View style={styles.previewWrap} testID="image-preview">
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} disabled={!onPress} />
      <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" pointerEvents="none" />
      {isUploading && <View style={styles.uploadingOverlay}><ActivityIndicator size="small" color="#fff" /></View>}
      {uploadError && (
        <View style={styles.errorOverlay}>
          <AlertCircle size={14} color="#fff" />
          <Text style={styles.errorOverlayText} numberOfLines={1}>Upload failed</Text>
          {onRetry && <Pressable style={styles.retryBtn} onPress={onRetry}><RefreshCw size={12} color="#fff" /></Pressable>}
        </View>
      )}
      <Pressable style={styles.removeBtn} onPress={onRemove} hitSlop={8} testID="image-remove-btn">
        <X size={11} color="#fff" strokeWidth={3} />
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chipBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    chipBtnDisabled: { opacity: 0.5 },
    chipBtnPressed: { opacity: 0.7 },
    chipBtnText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
    },
    chipBtnTextDisabled: { opacity: 0.5 },
    addImageBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1.5, borderColor: colors.primary + "25", borderStyle: "dashed" as const },
    addImageBtnDisabled: { backgroundColor: colors.muted, borderColor: colors.border },
    previewWrap: { width: 68, height: 68, borderRadius: 14, overflow: "hidden" as const, borderWidth: 1.5, borderColor: colors.primary + "30", position: "relative" as const },
    previewImage: { width: "100%", height: "100%" },
    uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center" as const, justifyContent: "center" as const },
    errorOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(220,50,50,0.75)", alignItems: "center" as const, justifyContent: "center" as const, gap: 3, paddingHorizontal: 4 },
    errorOverlayText: { fontSize: 9, color: "#fff", fontWeight: "700" as const, textAlign: "center" as const },
    retryBtn: { marginTop: 2, padding: 3, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8 },
    removeBtn: { position: "absolute" as const, top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center" as const, justifyContent: "center" as const },
  });
}
