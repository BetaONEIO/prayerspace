import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
  Platform,
  Image as RNImage,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import { Check, RotateCcw } from "lucide-react-native";
import { LightColors as Colors } from "@/constants/colors";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";

const { width: SW, height: SH } = Dimensions.get("window");
const CROP_SIZE = Math.min(SW * 0.82, 320);
const CROP_R = CROP_SIZE / 2;

function getTouchDistance(
  t1: { pageX: number; pageY: number },
  t2: { pageX: number; pageY: number }
) {
  return Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
}

interface InAppCropperProps {
  visible: boolean;
  imageUri: string | null;
  onConfirm: (uri: string) => void;
  onCancel: () => void;
}

export default function InAppCropper({
  visible,
  imageUri,
  onConfirm,
  onCancel,
}: InAppCropperProps) {
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cropAreaH, setCropAreaH] = useState(SH * 0.65);

  const imgW = useRef(1);
  const imgH = useRef(1);
  const bScale = useRef(1);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const cx = useRef(0);
  const cy = useRef(0);
  const cs = useRef(1);

  const gsx = useRef(0);
  const gsy = useRef(0);
  const gss = useRef(1);
  const gsd = useRef(1);
  const pinchStarted = useRef(false);

  useEffect(() => {
    if (!visible || !imageUri) return;
    setReady(false);
    setProcessing(false);

    const reset = () => {
      cx.current = 0;
      cy.current = 0;
      cs.current = 1;
      translateX.setValue(0);
      translateY.setValue(0);
      scaleAnim.setValue(1);
    };

    if (Platform.OS === "web") {
      imgW.current = 800;
      imgH.current = 800;
      bScale.current = CROP_SIZE / 800;
      reset();
      setReady(true);
      return;
    }

    RNImage.getSize(
      imageUri,
      (w, h) => {
        console.log("[InAppCropper] image size:", w, h);
        imgW.current = w;
        imgH.current = h;
        bScale.current = Math.max(CROP_SIZE / w, CROP_SIZE / h);
        reset();
        setReady(true);
      },
      (err) => {
        console.error("[InAppCropper] getSize error:", err);
        imgW.current = 800;
        imgH.current = 800;
        bScale.current = CROP_SIZE / 800;
        reset();
        setReady(true);
      }
    );
  }, [visible, imageUri, translateX, translateY, scaleAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        gsx.current = cx.current;
        gsy.current = cy.current;
        gss.current = cs.current;
        pinchStarted.current = false;
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        let newUs = cs.current;

        if (touches && touches.length >= 2) {
          const d = getTouchDistance(touches[0], touches[1]) || 1;
          if (!pinchStarted.current) {
            gsd.current = d;
            gss.current = cs.current;
            gsx.current = cx.current;
            gsy.current = cy.current;
            pinchStarted.current = true;
          }
          newUs = Math.max(1, gss.current * (d / gsd.current));
          cs.current = newUs;
          scaleAnim.setValue(newUs);
        } else {
          if (pinchStarted.current) {
            pinchStarted.current = false;
            gsx.current = cx.current;
            gsy.current = cy.current;
          }
        }

        const totalScale = bScale.current * newUs;
        const dw = imgW.current * totalScale;
        const dh = imgH.current * totalScale;
        const mx = Math.max(0, (dw - CROP_SIZE) / 2);
        const my = Math.max(0, (dh - CROP_SIZE) / 2);

        const rawX = touches && touches.length >= 2 ? cx.current : gsx.current + gs.dx;
        const rawY = touches && touches.length >= 2 ? cy.current : gsy.current + gs.dy;
        const newCx = Math.min(mx, Math.max(-mx, rawX));
        const newCy = Math.min(my, Math.max(-my, rawY));

        cx.current = newCx;
        cy.current = newCy;
        translateX.setValue(newCx);
        translateY.setValue(newCy);
      },
      onPanResponderRelease: () => {
        pinchStarted.current = false;
      },
    })
  ).current;

  const handleConfirm = useCallback(async () => {
    if (!imageUri) return;
    setProcessing(true);
    try {
      const totalScale = bScale.current * cs.current;
      const originX = Math.max(
        0,
        imgW.current / 2 - CROP_R / totalScale - cx.current / totalScale
      );
      const originY = Math.max(
        0,
        imgH.current / 2 - CROP_R / totalScale - cy.current / totalScale
      );
      const dim = Math.min(
        CROP_SIZE / totalScale,
        imgW.current - originX,
        imgH.current - originY
      );

      console.log("[InAppCropper] crop params:", {
        originX: Math.round(originX),
        originY: Math.round(originY),
        dim: Math.round(dim),
        totalScale,
      });

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.round(originX),
              originY: Math.round(originY),
              width: Math.round(Math.max(1, dim)),
              height: Math.round(Math.max(1, dim)),
            },
          },
          { resize: { width: 400, height: 400 } },
        ],
        {
          compress: 0.92,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      console.log("[InAppCropper] cropped uri:", result.uri);
      onConfirm(result.uri);
    } catch (err) {
      console.error("[InAppCropper] crop failed:", err);
      onConfirm(imageUri);
    } finally {
      setProcessing(false);
    }
  }, [imageUri, onConfirm]);

  if (!imageUri) return null;

  const displayW = imgW.current * bScale.current;
  const displayH = imgH.current * bScale.current;

  const circleTop = (cropAreaH - CROP_SIZE) / 2;
  const circleSideGap = (SW - CROP_SIZE) / 2;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable
            style={styles.cancelBtn}
            onPress={onCancel}
            testID="cropper-cancel-btn"
          >
            <RotateCcw size={15} color="#fff" />
            <Text style={styles.cancelText}>Retake</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Move and Scale</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View
          style={styles.cropArea}
          onLayout={(e) => setCropAreaH(e.nativeEvent.layout.height)}
          {...panResponder.panHandlers}
        >
          {ready && (
            <Animated.View
              style={{
                width: displayW,
                height: displayH,
                transform: [
                  { translateX },
                  { translateY },
                  { scale: scaleAnim },
                ],
              }}
            >
              <Image
                source={{ uri: imageUri }}
                style={{ width: displayW, height: displayH }}
                contentFit="fill"
              />
            </Animated.View>
          )}

          {cropAreaH > 0 && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View
                style={[
                  styles.overlayRect,
                  { top: 0, left: 0, right: 0, height: circleTop },
                ]}
              />
              <View
                style={[
                  styles.overlayRect,
                  {
                    top: circleTop + CROP_SIZE,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  },
                ]}
              />
              <View
                style={[
                  styles.overlayRect,
                  {
                    top: circleTop,
                    left: 0,
                    width: circleSideGap,
                    height: CROP_SIZE,
                  },
                ]}
              />
              <View
                style={[
                  styles.overlayRect,
                  {
                    top: circleTop,
                    right: 0,
                    width: circleSideGap,
                    height: CROP_SIZE,
                  },
                ]}
              />

              <View
                style={[
                  styles.circleBorder,
                  {
                    top: circleTop,
                    left: circleSideGap,
                  },
                ]}
              />

              <View
                style={[
                  styles.cornerTL,
                  { top: circleTop - 1, left: circleSideGap - 1 },
                ]}
              />
              <View
                style={[
                  styles.cornerTR,
                  { top: circleTop - 1, right: circleSideGap - 1 },
                ]}
              />
              <View
                style={[
                  styles.cornerBL,
                  { bottom: cropAreaH - circleTop - CROP_SIZE - 1, left: circleSideGap - 1 },
                ]}
              />
              <View
                style={[
                  styles.cornerBR,
                  { bottom: cropAreaH - circleTop - CROP_SIZE - 1, right: circleSideGap - 1 },
                ]}
              />
            </View>
          )}
        </View>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <Text style={styles.hint}>Pinch to zoom  ·  Drag to reposition</Text>

          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              pressed && styles.confirmBtnPressed,
              processing && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={processing}
            testID="cropper-confirm-btn"
          >
            {processing ? (
              <ActivityIndicator color={themeColors.primaryForeground} />
            ) : (
              <>
                <Check size={20} color={themeColors.primaryForeground} strokeWidth={2.5} />
                <Text style={styles.confirmText}>Use This Photo</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "#0a0a0a",
  },
  cancelBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    width: 100,
  },
  cancelText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  headerTitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 100,
  },
  cropArea: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
    backgroundColor: "#0a0a0a",
  },
  overlayRect: {
    position: "absolute" as const,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  circleBorder: {
    position: "absolute" as const,
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.7)",
  },
  cornerTL: {
    position: "absolute" as const,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#fff",
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    position: "absolute" as const,
    width: 20,
    height: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#fff",
    borderTopRightRadius: 4,
  },
  cornerBL: {
    position: "absolute" as const,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#fff",
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    position: "absolute" as const,
    width: 20,
    height: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#fff",
    borderBottomRightRadius: 4,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 18,
    gap: 14,
    backgroundColor: "#0a0a0a",
    alignItems: "center" as const,
  },
  hint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  confirmBtn: {
    backgroundColor: '#E86F24',
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 18,
    borderRadius: 18,
    gap: 10,
    width: "100%",
    shadowColor: '#E86F24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  confirmBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
});
