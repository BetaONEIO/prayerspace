import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, FileText } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

interface Section { number: string; title: string; content: string; }
const SECTIONS: Section[] = [
  { number: "1", title: "About Prayer Space", content: "Prayer Space is a platform designed to help individuals and communities share prayer requests, spend intentional time in prayer, and connect meaningfully with others." },
  { number: "2", title: "Eligibility", content: "You must be at least 13 years old to use Prayer Space. By using the Service, you confirm that you meet the age requirements." },
  { number: "3", title: "User Accounts", content: "To use certain features, you may need to create an account. You agree to provide accurate information and keep your login details secure." },
  { number: "4", title: "User Content", content: "You may post prayer requests, updates, and community interactions. You retain ownership of your content. By posting, you grant Prayer Space a limited licence to store and display your content within the Service." },
  { number: "5", title: "Content Guidelines", content: "You agree not to post content that is abusive, harmful, or threatening; promotes hate or violence; violates privacy; or contains illegal material." },
  { number: "6", title: "Privacy & Data Protection", content: "Prayer Space is designed in line with GDPR principles. We only collect necessary data, handle your data securely, and allow you to request access or deletion." },
  { number: "7", title: "Sharing & Visibility", content: "You control who sees your content. You may keep content private, share with selected users, or share with a community." },
  { number: "8", title: "Payments & Subscriptions", content: "Prayer Space may offer paid features for churches or organisations. Individual use is generally free. Subscriptions renew automatically unless cancelled." },
  { number: "9", title: "Intellectual Property", content: "All content and materials within Prayer Space (excluding user content) are owned by Prayer Space or its licensors." },
  { number: "10", title: "Service Availability", content: "We aim to provide a reliable service but do not guarantee continuous availability. We may update or discontinue features at any time." },
  { number: "11", title: "Limitation of Liability", content: "Prayer Space is provided \"as is\". To the fullest extent permitted by law, we are not liable for indirect or consequential damages." },
  { number: "12", title: "Governing Law", content: "These Terms are governed by the laws of the United Kingdom, unless otherwise required by applicable law." },
];

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.heroBanner}>
            <View style={styles.heroIconWrap}>
              <FileText size={26} color={colors.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.heroTitle}>Prayer Space</Text>
            <Text style={styles.heroSubtitle}>Terms of Service</Text>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>Last updated: April 2025</Text>
            </View>
          </View>

          <View style={styles.introCard}>
            <Text style={styles.introText}>
              Welcome to Prayer Space. These Terms of Service govern your use of the Prayer Space mobile application. By using Prayer Space, you agree to these Terms.
            </Text>
          </View>

          {SECTIONS.map((section) => (
            <View key={section.number} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionNumberBadge}>
                  <Text style={styles.sectionNumber}>{section.number}</Text>
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.sectionContent}>{section.content}</Text>
            </View>
          ))}

          <View style={styles.closingCard}>
            <Text style={styles.closingText}>
              Thank you for using Prayer Space. We're grateful to be part of your prayer journey.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    scrollContent: { paddingHorizontal: 24 },
    heroBanner: { backgroundColor: colors.accent, borderRadius: 24, borderWidth: 1, borderColor: colors.primary + "25", alignItems: "center" as const, paddingVertical: 28, paddingHorizontal: 20, marginBottom: 16 },
    heroIconWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary + "15", alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 14 },
    heroTitle: { fontSize: 20, fontWeight: "800" as const, color: colors.foreground, letterSpacing: 0.3 },
    heroSubtitle: { fontSize: 13, fontWeight: "500" as const, color: colors.mutedForeground, marginTop: 3 },
    dateBadge: { marginTop: 14, backgroundColor: colors.primary + "15", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    dateText: { fontSize: 11, fontWeight: "600" as const, color: colors.primary, letterSpacing: 0.3 },
    introCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border + "50", padding: 18, marginBottom: 12 },
    introText: { fontSize: 14, color: colors.mutedForeground, lineHeight: 22 },
    sectionCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border + "50", padding: 18, marginBottom: 10 },
    sectionHeader: { flexDirection: "row", alignItems: "center" as const, gap: 12, marginBottom: 12 },
    sectionNumberBadge: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.primary + "15", alignItems: "center" as const, justifyContent: "center" as const, flexShrink: 0 },
    sectionNumber: { fontSize: 12, fontWeight: "800" as const, color: colors.primary },
    sectionTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground, flex: 1 },
    sectionContent: { fontSize: 13, color: colors.mutedForeground, lineHeight: 21 },
    closingCard: { backgroundColor: colors.accent, borderRadius: 20, borderWidth: 1, borderColor: colors.primary + "20", padding: 20, marginTop: 4, marginBottom: 16, alignItems: "center" as const },
    closingText: { fontSize: 14, color: colors.accentForeground, lineHeight: 22, fontWeight: "500" as const, textAlign: "center" as const },
  });
}
