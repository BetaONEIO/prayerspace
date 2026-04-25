import React, { useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle, BookOpen, Heart, ArrowLeft } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function JournalAddedSuccessScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { senderName } = useLocalSearchParams<{ senderName: string }>();
  const name = senderName || "Someone";

  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const buttonsFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.timing(buttonsFade, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={styles.container} testID="journal-added-success-screen">
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.content}>
          <View style={styles.iconArea}>
            <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }] }]} />
            <Animated.View style={[styles.checkWrap, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}>
              <CheckCircle size={100} color={colors.primary} strokeWidth={1.5} />
            </Animated.View>
          </View>

          <Animated.View style={[styles.textArea, { opacity: contentFade, transform: [{ translateY: contentSlide }] }]}>
            <Text style={styles.title}>Added to Journal</Text>
            <Text style={styles.highlight}>Your heart is recorded.</Text>
            <Text style={styles.description}>
              You're now lifting up{" "}
              <Text style={styles.nameHighlight}>{name}</Text> in prayer.
              Their request has been saved to your journal under{" "}
              <Text style={styles.tagHighlight}>'Praying For'</Text>.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.infoCard, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}><Heart size={22} color={colors.primary} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Praying For</Text>
                <Text style={styles.infoValue}>{name}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}><BookOpen size={22} color={colors.primary} /></View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Saved To</Text>
                <Text style={styles.infoValue}>Prayer Journal</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.buttons, { opacity: buttonsFade }]}>
          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={() => router.replace("/(tabs)/journal")} testID="view-journal-btn">
            <BookOpen size={20} color={colors.primaryForeground} />
            <Text style={styles.primaryBtnText}>View My Journal</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]} onPress={() => router.replace("/(tabs)/(home)")} testID="return-home-btn">
            <ArrowLeft size={18} color={colors.secondaryForeground} />
            <Text style={styles.secondaryBtnText}>Return Home</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    safeArea: { flex: 1, justifyContent: "space-between" },
    content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
    iconArea: { width: 140, height: 140, alignItems: "center", justifyContent: "center", marginBottom: 36 },
    glowRing: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: colors.accent, opacity: 0.7 },
    checkWrap: { alignItems: "center", justifyContent: "center" },
    textArea: { alignItems: "center", gap: 10 },
    title: { fontSize: 32, fontWeight: "900" as const, color: colors.foreground, letterSpacing: -0.5 },
    highlight: { fontSize: 17, fontWeight: "700" as const, color: colors.primary },
    description: { fontSize: 15, color: colors.mutedForeground, textAlign: "center" as const, lineHeight: 24, marginTop: 4, paddingHorizontal: 8 },
    nameHighlight: { fontWeight: "800" as const, color: colors.foreground },
    tagHighlight: { fontWeight: "700" as const, color: colors.accentForeground, fontStyle: "italic" as const },
    infoCard: { marginTop: 32, width: "100%", backgroundColor: colors.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: colors.border },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 6 },
    infoIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    infoTextWrap: { flex: 1, gap: 2 },
    infoLabel: { fontSize: 10, fontWeight: "800" as const, color: colors.mutedForeground, textTransform: "uppercase" as const, letterSpacing: 1.2 },
    infoValue: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 10, marginHorizontal: 4 },
    buttons: { paddingHorizontal: 24, paddingBottom: 12, gap: 12 },
    primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
    primaryBtnText: { fontSize: 13, fontWeight: "900" as const, color: colors.primaryForeground, textTransform: "uppercase" as const, letterSpacing: 1.5 },
    secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.secondary, paddingVertical: 18, borderRadius: 24 },
    secondaryBtnText: { fontSize: 13, fontWeight: "900" as const, color: colors.secondaryForeground, textTransform: "uppercase" as const, letterSpacing: 1.5 },
    pressed: { opacity: 0.88 },
  });
}
