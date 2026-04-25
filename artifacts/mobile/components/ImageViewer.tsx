import React, { useCallback, useRef, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Animated,
  StatusBar,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { X } from "lucide-react-native";

interface ImageViewerProps {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}

export default function ImageViewer({ uri, visible, onClose }: ImageViewerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [fadeAnim, onClose]);

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {Platform.OS === "android" && <StatusBar backgroundColor="black" barStyle="light-content" />}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="contain"
        />
        <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12} testID="image-viewer-close">
          <X size={20} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  image: {
    width: "100%",
    height: "80%",
  },
  closeBtn: {
    position: "absolute" as const,
    top: Platform.OS === "ios" ? 56 : 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
});
