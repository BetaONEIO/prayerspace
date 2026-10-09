import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Compass,
  HandHeart,
  Heart,
  PauseCircle,
  Sparkles,
  Users,
} from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import type { TourPresentationProps } from "./types";
import { dismissKeyboard } from "@/lib/keyboard";
import { TOUR_STEP_COUNT } from "@/lib/tourSteps";

const TOTAL = TOUR_STEP_COUNT;
const PAD = 6;
const GAP = 12;
const MARGIN = 12;
const SHADE = "rgba(28, 25, 20, 0.66)";

function TourButton({
  label,
  onPress,
  colors,
  variant = "primary",
  testID,
}: {
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  variant?: "primary" | "secondary" | "ghost";
  testID?: string;
}) {
  const bg =
    variant === "primary" ? colors.primary : variant === "secondary" ? colors.secondary : "transparent";
  const fg =
    variant === "primary" ? colors.primaryForeground : variant === "secondary" ? colors.secondaryForeground : colors.mutedForeground;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        {
          minHeight: 48,
          minWidth: 44,
          paddingHorizontal: 14,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text maxFontSizeMultiplier={1.5} style={{ color: fg, fontSize: 16, fontWeight: "700", textAlign: "center" }}>{label}</Text>
    </Pressable>
  );
}

export default function TourPresentation(props: TourPresentationProps) {
  const {
    mode, step, title, description, target, viewport, insets, keyboardHeight, formActionLabel,
    reducedMotion, syncNotice, onStart, onNext, onBack, onSkip, onPause, onFinish, onOpenForm,
  } = props;
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fade = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const key = `${mode}-${step}`;

  useEffect(() => {
    if (reducedMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [key, reducedMotion, fade]);

  const notice = syncNotice ? (
    <View
      style={[styles.notice, { top: insets.top + 8 }]}
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={syncNotice}
      pointerEvents="none"
    >
      <Text style={styles.noticeText}>{syncNotice}</Text>
    </View>
  ) : null;

  if (mode !== "step") {
    const isResume = mode === "resume";
    const benefits = [
      { Icon: HandHeart, text: "Share prayer requests" },
      { Icon: Heart, text: "Pray for others" },
      { Icon: Users, text: "Connect with friends and prayer communities" },
    ];
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: SHADE }]} />
        <View
          style={[
            styles.center,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom, keyboardHeight) + 16,
              paddingLeft: insets.left + 16,
              paddingRight: insets.right + 16,
            },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.welcomeCard, { opacity: fade, maxHeight: "100%" }]}>
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.welcomeContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.badge}>
                {isResume ? (
                  <Compass size={34} color={colors.primary} />
                ) : (
                  <Sparkles size={34} color={colors.primary} />
                )}
              </View>
              <Text style={styles.welcomeTitle} accessibilityRole="header">
                {isResume ? "Welcome back" : "Welcome to Prayer Space"}
              </Text>
              <Text style={styles.welcomeSub}>
                {isResume
                  ? "Your progress is saved. Pick up your tour right where you left off."
                  : "A place to connect, share what's on your heart and grow together through prayer."}
              </Text>
              {!isResume && (
                <View style={styles.benefits}>
                  {benefits.map(({ Icon, text }) => (
                    <View key={text} style={styles.benefitRow}>
                      <View style={styles.benefitIcon}>
                        <Icon size={20} color={colors.accentForeground} />
                      </View>
                      <Text style={styles.benefitText}>{text}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.actions}>
                <TourButton
                  testID="tour-start"
                  label={isResume ? "Continue Tutorial" : "Let's Get Started"}
                  onPress={onStart}
                  colors={colors}
                />
                <TourButton testID="tour-skip" label="Skip Tutorial" onPress={onSkip} colors={colors} variant="ghost" />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
        {notice}
      </View>
    );
  }

  // ---- Step mode ----
  const { width: W, height: H } = viewport;
  const isLast = step >= TOTAL - 1;
  const stepNo = Math.min(step + 1, TOTAL);
  const topLimit = insets.top + MARGIN;
  const bottomLimit = H - Math.max(insets.bottom, keyboardHeight) - MARGIN;

  let hole: { x: number; y: number; w: number; h: number } | null = null;
  if (target && target.width > 0 && target.height > 0) {
    const x = Math.max(0, target.x - PAD);
    const y = Math.max(0, target.y - PAD);
    const r = Math.min(W, target.x + target.width + PAD);
    const b = Math.min(H, target.y + target.height + PAD);
    hole = { x, y, w: Math.max(0, r - x), h: Math.max(0, b - y) };
  }

  const spaceAbove = hole ? hole.y - topLimit - GAP : 0;
  const spaceBelow = hole ? bottomLimit - (hole.y + hole.h) - GAP : 0;
  const fullH = Math.max(0, bottomLimit - topLimit);
  const MIN_CARD = 150;
  let placeBelow = true;
  let maxH = fullH;
  let tipTop = topLimit;
  let tooSmall = false;
  if (hole) {
    placeBelow = spaceBelow >= spaceAbove;
    maxH = Math.max(0, placeBelow ? spaceBelow : spaceAbove);
    tipTop = placeBelow ? hole.y + hole.h + GAP : hole.y - GAP - maxH;
    tooSmall = maxH < MIN_CARD;
  } else {
    maxH = fullH;
    tooSmall = maxH < MIN_CARD;
  }
  const compact = maxH < 260;
  const tipLeft = insets.left + MARGIN;
  const tipWidth = Math.max(200, W - insets.left - insets.right - MARGIN * 2);
  const aboveAnchor = !!hole && !placeBelow;
  const tipStyle = hole
    ? { top: Math.max(topLimit, tipTop), height: maxH }
    : { top: topLimit, height: maxH };
  const showHint = !hole && !isLast;
  // Fallback when no safe room: only a dismiss-keyboard / hide-card control.
  const dismissTop = hole
    ? spaceAbove >= 56
      ? Math.max(topLimit, hole.y - GAP - 48)
      : spaceBelow >= 56
        ? hole.y + hole.h + GAP
        : topLimit
    : topLimit;

  const shade = (s: object, k: string) => (
    <View key={k} style={[styles.shade, s]} accessibilityElementsHidden importantForAccessibility="no" />
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hole ? (
        <>
          {shade({ left: 0, top: 0, right: 0, height: hole.y }, "t")}
          {shade({ left: 0, top: hole.y + hole.h, right: 0, bottom: 0 }, "b")}
          {shade({ left: 0, top: hole.y, width: hole.x, height: hole.h }, "l")}
          {shade({ left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h }, "r")}
          <View
            pointerEvents="none"
            style={[
              styles.outline,
              { left: hole.x, top: hole.y, width: hole.w, height: hole.h },
            ]}
          />
        </>
      ) : (
        shade({ left: 0, top: 0, right: 0, bottom: 0 }, "all")
      )}

      {tooSmall ? (
        <View
          pointerEvents="box-none"
          style={[styles.tipWrap, { left: tipLeft, width: tipWidth, top: dismissTop }]}
        >
          <View style={styles.miniBar}>
            {keyboardHeight > 0 ? (
              <Pressable
                testID="tour-dismiss-keyboard"
                onPress={dismissKeyboard}
                accessibilityRole="button"
                accessibilityLabel="Hide keyboard to continue the tour"
                style={styles.miniBtn}
              >
                <Text style={styles.pauseText} maxFontSizeMultiplier={1.4}>Hide keyboard</Text>
              </Pressable>
            ) : (
              <Text style={styles.progress} maxFontSizeMultiplier={1.4}>Step {stepNo} of {TOTAL}</Text>
            )}
            <Pressable testID="tour-pause" onPress={onPause} accessibilityRole="button" accessibilityLabel="Pause Tour" style={styles.miniBtn}>
              <Text style={styles.pauseText} maxFontSizeMultiplier={1.4}>Pause</Text>
            </Pressable>
            <Pressable testID="tour-skip" onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip Tutorial" style={styles.miniBtn}>
              <Text style={styles.pauseText} maxFontSizeMultiplier={1.4}>Skip</Text>
            </Pressable>
          </View>
        </View>
      ) : (
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.tipWrap,
          { left: tipLeft, width: tipWidth, opacity: fade },
          tipStyle,
          aboveAnchor ? { justifyContent: "flex-end" } : null,
        ]}
      >
        <View style={[styles.tip, { maxHeight: maxH }]}>
          <View style={[styles.headRow, compact && { paddingTop: 4 }]}>
            <Text style={styles.progress} maxFontSizeMultiplier={1.5} accessibilityLabel={`Step ${stepNo} of ${TOTAL}`}>
              Step {stepNo} of {TOTAL}
            </Text>
            <Pressable testID="tour-pause" onPress={onPause} accessibilityRole="button" accessibilityLabel="Pause Tour" style={styles.pause}>
              <PauseCircle size={18} color={colors.mutedForeground} />
              <Text style={styles.pauseText} maxFontSizeMultiplier={1.5}>Pause</Text>
            </Pressable>
          </View>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator
            style={styles.tipScroll}
            contentContainerStyle={[styles.tipContent, compact && { paddingTop: 0 }]}
          >
            <Text style={styles.tipTitle} accessibilityRole="header">{title}</Text>
            <Text style={styles.tipBody}>{description}</Text>
            {showHint && (
              <Text style={styles.tipHint}>
                Nothing to highlight here yet. That is fine, you can keep going.
              </Text>
            )}
            {step === 1 && onOpenForm && (
              <View style={styles.formBtn}>
              <TourButton testID="tour-open-form" label={formActionLabel ?? "Open Prayer Form"} onPress={onOpenForm} colors={colors} variant="secondary" />
              </View>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <View style={styles.navRow}>
              <TourButton testID="tour-back" label="Back" onPress={onBack} colors={colors} variant="secondary" />
              <View style={{ flex: 1 }}>
                <TourButton
                  testID={isLast ? "tour-finish" : "tour-next"}
                  label={isLast ? "Explore Prayer Space" : "Next"}
                  onPress={isLast ? onFinish : onNext}
                  colors={colors}
                />
              </View>
              <Pressable testID="tour-skip" onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip Tutorial" style={styles.pause}>
                <Text style={[styles.pauseText, { textAlign: "center" }]} maxFontSizeMultiplier={1.5}>Skip</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>
      )}
      {notice}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    shade: { position: "absolute", backgroundColor: SHADE },
    outline: {
      position: "absolute",
      borderWidth: 3,
      borderColor: c.primary,
      borderRadius: 14,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    welcomeCard: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: c.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    welcomeContent: { padding: 24, alignItems: "center" },
    badge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    welcomeTitle: { fontSize: 26, fontWeight: "800", color: c.foreground, textAlign: "center" },
    welcomeSub: { fontSize: 16, lineHeight: 24, color: c.mutedForeground, textAlign: "center", marginTop: 10 },
    benefits: { alignSelf: "stretch", marginTop: 20, gap: 10 },
    benefitRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.background,
      borderRadius: 14,
      padding: 12,
    },
    benefitIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    benefitText: { flex: 1, fontSize: 16, fontWeight: "600", color: c.foreground },
    actions: { alignSelf: "stretch", marginTop: 22, gap: 6 },
    tipWrap: { position: "absolute" },
    tip: {
      backgroundColor: c.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    tipScroll: { flexGrow: 0, flexShrink: 1 },
    tipContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
    progress: { fontSize: 13, fontWeight: "700", color: c.primary, letterSpacing: 0.3 },
    tipTitle: { fontSize: 20, fontWeight: "800", color: c.foreground, marginTop: 4 },
    tipBody: { fontSize: 16, lineHeight: 23, color: c.secondaryForeground, marginTop: 6 },
    tipHint: { fontSize: 14, lineHeight: 20, color: c.mutedForeground, marginTop: 8, fontStyle: "italic" },
    formBtn: { marginTop: 10, alignSelf: "flex-start" },
    headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 6, paddingTop: 6 },
    miniBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.card, borderRadius: 14, borderWidth: 1, borderColor: c.border, paddingHorizontal: 8 },
    miniBtn: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
    footer: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 },
    navRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "space-between" },
    pause: {
      minHeight: 44,
      minWidth: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 8,
    },
    pauseText: { fontSize: 14, fontWeight: "600", color: c.mutedForeground },
    notice: {
      position: "absolute",
      left: 16,
      right: 16,
      backgroundColor: c.accent,
      borderColor: c.primary,
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
    },
    noticeText: { fontSize: 14, color: c.accentForeground, fontWeight: "600", textAlign: "center" },
  });
}
