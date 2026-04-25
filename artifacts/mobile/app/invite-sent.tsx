import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function InviteSentScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/Dsd9kebVr6M/components/Tv1wvpLTeNp.png" }}
            style={styles.image}
            contentFit="contain"
          />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Invitation Sent!</Text>
          <Text style={styles.subtitle}>
            Your message of light has been sent to Chris. We'll notify you as soon as they join your prayer circle.
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.primaryBtn} onPress={() => router.push("/(tabs)/(home)")}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.push("/invite-contacts")}>
          <Text style={styles.secondaryBtnText}>Invite more friends</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
    content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
    imageWrap: { width: 256, height: 256, marginBottom: 8 },
    image: { width: "100%", height: "100%" },
    textBlock: { alignItems: "center", gap: 12 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", lineHeight: 22 },
    footer: { width: "100%", gap: 12, paddingBottom: 8 },
    primaryBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    primaryBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    secondaryBtn: { paddingVertical: 10, alignItems: "center" },
    secondaryBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.primary },
  });
}
