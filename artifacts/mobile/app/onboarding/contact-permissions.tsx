import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ShieldCheck, Bell } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function ContactPermissions() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.heroArea}>
          <Image source={{ uri: "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/Dsd9kebVr6M/components/7DfVskopaPH.png" }} style={styles.heroImage} resizeMode="contain" />
        </View>
        <View style={styles.textArea}>
          <Text style={styles.title}>Connect with your Community</Text>
          <Text style={styles.subtitle}>Prayer is more powerful when shared. Allow access to your contacts to see who's already on PrayerPal and who you can lift up today.</Text>
        </View>
        <View style={styles.infoCard}>
          {[
            { icon: ShieldCheck, title: "Safe & Private", desc: "We never store your contacts on our servers without your explicit action." },
            { icon: Bell, title: "Spread the Light", desc: "Send \"I prayed for you\" messages via SMS or WhatsApp to those without the app." },
          ].map(({ icon: Icon, title, desc }) => (
            <View key={title} style={styles.infoRow}>
              <View style={styles.infoIcon}><Icon size={20} color={colors.primary} /></View>
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>{title}</Text>
                <Text style={styles.infoDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Pressable style={({ pressed }) => [styles.allowBtn, pressed && styles.btnPressed]} onPress={() => router.push("/onboarding/import-loading" as never)} testID="contact-allow">
            <Text style={styles.allowBtnText}>Allow Access</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]} onPress={() => router.replace("/(tabs)/(home)" as never)}>
            <Text style={styles.skipBtnText}>Not now, maybe later</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 32, paddingBottom: 32, alignItems: "center" },
    heroArea: { flex: 1, alignItems: "center", justifyContent: "center", maxHeight: 260, width: "100%" },
    heroImage: { width: 240, height: 240 },
    textArea: { alignItems: "center", gap: 14, marginBottom: 24 },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.foreground, textAlign: "center", lineHeight: 34 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", lineHeight: 23 },
    infoCard: { width: "100%", backgroundColor: colors.accent, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 20, gap: 16, marginBottom: 28 },
    infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    infoText: { flex: 1, gap: 3 },
    infoTitle: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground },
    infoDesc: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
    actions: { width: "100%", gap: 10 },
    allowBtn: { height: 58, backgroundColor: colors.primary, borderRadius: 100, alignItems: "center", justifyContent: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6 },
    btnPressed: { opacity: 0.9 },
    allowBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
    skipBtn: { paddingVertical: 12, alignItems: "center" },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
