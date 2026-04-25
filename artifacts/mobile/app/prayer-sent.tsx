import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Flame, Crown } from "lucide-react-native";
import { useSelectedRecipients } from "@/providers/SelectedRecipientsProvider";
import ReviewModal from "@/components/ReviewModal";
import { useReviewPrompt, incrementPrayersSent } from "@/hooks/useReviewPrompt";

export default function PrayerSentScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(1)).current;
  const { selectedRecipients } = useSelectedRecipients();
  const { showReview, checkAndShowPrompt, closeReview, handleReviewed } = useReviewPrompt();

  const recipientNames = useMemo(() => {
    if (selectedRecipients.length === 0) return "your loved ones";
    if (selectedRecipients.length === 1) return selectedRecipients[0].name;
    if (selectedRecipients.length === 2) return `${selectedRecipients[0].name} and ${selectedRecipients[1].name}`;
    return `${selectedRecipients[0].name}, ${selectedRecipients[1].name} and ${selectedRecipients.length - 2} other${selectedRecipients.length - 2 > 1 ? "s" : ""}`;
  }, [selectedRecipients]);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, [pulse]);

  useEffect(() => {
    const run = async () => {
      await incrementPrayersSent();
      setTimeout(() => checkAndShowPrompt(), 2000);
    };
    run();
  }, [checkAndShowPrompt]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <View style={styles.imageWrap}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
          <View style={styles.pingRing} />
          <Image
            source={{ uri: "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/Dsd9kebVr6M/components/Tv1wvpLTeNp.png" }}
            style={styles.image}
            contentFit="contain"
          />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.amen}>Amen.</Text>
          <Text style={styles.sent}>Your prayer has been sent.</Text>
          <Text style={styles.desc}>
            {recipientNames} {selectedRecipients.length === 1 ? "has" : "have"} been notified that you lifted them up today.
          </Text>
        </View>
      </View>

      <View style={styles.streakCard}>
        <View style={styles.streakItem}>
          <View style={styles.streakIcon}><Flame size={22} color={colors.primary} /></View>
          <Text style={styles.streakLabel}>5 Day Streak</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.streakItem}>
          <View style={styles.streakIcon}><Crown size={22} color={colors.primary} /></View>
          <Text style={styles.streakLabel}>Lvl 3 Warrior</Text>
        </View>
      </View>

      <Pressable style={styles.homeBtn} onPress={() => router.push("/(tabs)/(home)")}>
        <Text style={styles.homeBtnText}>Back to Home</Text>
      </Pressable>

      <ReviewModal visible={showReview} onClose={closeReview} onReviewed={handleReviewed} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 28 },
    content: { alignItems: "center", gap: 24 },
    imageWrap: { width: 256, height: 256, alignItems: "center", justifyContent: "center", position: "relative" },
    pulseRing: { position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 128, backgroundColor: colors.primary + "08" },
    pingRing: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primary + "12" },
    image: { width: "100%", height: "100%", zIndex: 2 },
    textBlock: { alignItems: "center", gap: 10 },
    amen: { fontSize: 36, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -1 },
    sent: { fontSize: 18, fontWeight: "700" as const, color: colors.primary },
    desc: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", lineHeight: 22, paddingHorizontal: 16 },
    streakCard: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, backgroundColor: colors.card, paddingHorizontal: 32, paddingVertical: 20, borderRadius: 28, borderWidth: 1, borderColor: colors.primary + "20", width: "100%" },
    streakItem: { alignItems: "center", gap: 8 },
    streakIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + "14", alignItems: "center", justifyContent: "center" },
    streakLabel: { fontSize: 10, fontWeight: "700" as const, color: colors.primary, textTransform: "uppercase", letterSpacing: 1 },
    divider: { width: 1, height: 40, backgroundColor: colors.border + "60" },
    homeBtn: { width: "100%", backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    homeBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
