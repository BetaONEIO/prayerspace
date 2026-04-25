import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  ChevronLeft, ChevronDown, Search, HelpCircle, Shield, CreditCard,
  HeartHandshake, Mail, MessageCircle, X, ArrowRight,
} from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

interface FAQItem { question: string; answer: string; }
interface HelpSection {
  id: string; title: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  color: string; faqs: FAQItem[];
}

const HELP_SECTIONS: HelpSection[] = [
  { id: "faq", title: "FAQs", icon: HelpCircle, color: "#C4662A", faqs: [
    { question: "Who can see my prayer requests?", answer: "You're in full control. When posting a prayer request, you can choose to share it with your community, with selected contacts only, or keep it private." },
    { question: "Can I delete a prayer request?", answer: "Yes. You can archive any prayer request you created at any time. Archived requests are removed from the active feed but kept safely in your prayer history." },
    { question: "How do I join a group?", answer: "Tap the 'My Groups' tab and look for the 'Join Group' option. You'll be asked to enter a group password provided by the group admin." },
    { question: "How does Prayer Space work?", answer: "Prayer Space is your dedicated space for quiet, focused prayer. Open it from the pray tab, set your intention, and use the guided or free-form prayer experience." },
    { question: "Can I follow up on a prayer request?", answer: "Yes! As the original author, you can tap 'Repost with Update' to share what's happened since you first posted." },
    { question: "How do I encourage someone?", answer: "On any prayer card in your feed, tap the 'Encourage' button to send a word of support." },
  ]},
  { id: "privacy", title: "Privacy & Security", icon: Shield, color: "#5B8FD4", faqs: [
    { question: "Is Prayer Pal GDPR compliant?", answer: "Yes. Prayer Pal is fully GDPR compliant. You have the right to access, correct, or delete your personal data at any time." },
    { question: "How are my contacts used?", answer: "If you grant contact access, we use it solely to help you find friends already on Prayer Pal and to send invitations on your behalf." },
    { question: "How is my data kept secure?", answer: "All data is encrypted in transit and at rest. We use industry-standard security practices." },
    { question: "Can I delete my account?", answer: "Yes. You can request full account deletion from the Privacy settings screen." },
  ]},
  { id: "payments", title: "Payments & Subscriptions", icon: CreditCard, color: "#4CAF7D", faqs: [
    { question: "Is Prayer Pal free to use?", answer: "Prayer Pal is free for individuals. Premium plans are available for churches and organisations." },
    { question: "How do I cancel my subscription?", answer: "You can cancel your subscription at any time from your device's App Store or Google Play settings." },
  ]},
  { id: "prayer-space", title: "Using Prayer Space", icon: HeartHandshake, color: "#C07BC5", faqs: [
    { question: "What is Prayer Space?", answer: "Prayer Space is a quiet, focused environment within the app for personal prayer time." },
    { question: "Can I use Prayer Space offline?", answer: "Yes. Prayer Space works fully offline." },
  ]},
];

function AccordionItem({ question, answer, accentColor, searchQuery, colors, styles }: {
  question: string; answer: string; accentColor: string; searchQuery: string;
  colors: ThemeColors; styles: ReturnType<typeof createStyles>;
}) {
  const [open, setOpen] = useState(false);
  const animRotate = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    Animated.timing(animRotate, { toValue: open ? 0 : 1, duration: 200, useNativeDriver: true }).start();
    setOpen(!open);
  }, [open, animRotate]);

  const rotate = animRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View style={styles.accordionItem}>
      <Pressable style={styles.accordionHeader} onPress={toggle}>
        <View style={styles.accordionQuestionRow}>
          <Text style={styles.questionText}>{question}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={18} color={colors.mutedForeground} strokeWidth={2} />
        </Animated.View>
      </Pressable>
      {open && (
        <View style={styles.accordionBody}>
          <View style={[styles.accordionAccent, { backgroundColor: accentColor }]} />
          <Text style={styles.answerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

function SectionCard({ section, searchQuery, colors, styles }: {
  section: HelpSection; searchQuery: string;
  colors: ThemeColors; styles: ReturnType<typeof createStyles>;
}) {
  const Icon = section.icon;
  const filtered = searchQuery.trim()
    ? section.faqs.filter(f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    : section.faqs;
  if (filtered.length === 0) return null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: section.color + "15" }]}>
          <Icon size={18} color={section.color} strokeWidth={2} />
        </View>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <View style={styles.accordionList}>
        {filtered.map((faq, index) => (
          <React.Fragment key={index}>
            {index > 0 && <View style={styles.accordionDivider} />}
            <AccordionItem question={faq.question} answer={faq.answer} accentColor={section.color} searchQuery={searchQuery} colors={colors} styles={styles} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export default function HelpCentreScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const hasResults = HELP_SECTIONS.some((section) => {
    if (!searchQuery.trim()) return true;
    return section.faqs.some(f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={colors.secondaryForeground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Help Centre</Text>
            <Text style={styles.headerSubtitle}>How can we help you?</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.mutedForeground} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search help articles…"
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <X size={15} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!hasResults && (
            <View style={styles.emptyState}>
              <MessageCircle size={40} color={colors.mutedForeground} strokeWidth={1.2} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>Try a different search term or contact our support team below.</Text>
            </View>
          )}

          {HELP_SECTIONS.map((section) => (
            <SectionCard key={section.id} section={section} searchQuery={searchQuery} colors={colors} styles={styles} />
          ))}

          <View style={styles.contactCard}>
            <View style={styles.contactTop}>
              <View style={styles.contactIconWrap}>
                <Mail size={22} color={colors.primary} strokeWidth={1.8} />
              </View>
              <View style={styles.contactText}>
                <Text style={styles.contactTitle}>Still need help?</Text>
                <Text style={styles.contactSubtitle}>Our team usually responds within 24 hours.</Text>
              </View>
            </View>
            <Pressable style={styles.contactBtn} onPress={() => router.push("/contact-support")}>
              <Text style={styles.contactBtnText}>Contact Support</Text>
              <ArrowRight size={17} color={colors.primaryForeground} strokeWidth={2.5} />
            </Pressable>
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
    headerCenter: { alignItems: "center" as const },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground, textAlign: "center" as const },
    headerSubtitle: { fontSize: 12, fontWeight: "500" as const, color: colors.mutedForeground, marginTop: 2, textAlign: "center" as const },
    searchContainer: { paddingHorizontal: 24, paddingBottom: 16 },
    searchBar: { flexDirection: "row", alignItems: "center" as const, backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13, gap: 10, borderWidth: 1, borderColor: colors.border + "70" },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, fontWeight: "500" as const, padding: 0 },
    scrollContent: { paddingHorizontal: 24 },
    sectionCard: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border + "50", marginBottom: 16, overflow: "hidden" as const },
    sectionHeader: { flexDirection: "row", alignItems: "center" as const, gap: 12, padding: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border + "40" },
    sectionIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const },
    sectionTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
    accordionList: { paddingVertical: 4 },
    accordionDivider: { height: 1, backgroundColor: colors.border + "40", marginHorizontal: 18 },
    accordionItem: { paddingHorizontal: 18 },
    accordionHeader: { flexDirection: "row", alignItems: "center" as const, justifyContent: "space-between", paddingVertical: 15, gap: 12 },
    accordionQuestionRow: { flex: 1 },
    questionText: { fontSize: 14, fontWeight: "600" as const, color: colors.foreground, lineHeight: 20 },
    accordionBody: { flexDirection: "row", gap: 12, paddingBottom: 16 },
    accordionAccent: { width: 3, borderRadius: 2, minHeight: 20, flexShrink: 0 },
    answerText: { flex: 1, fontSize: 13, color: colors.mutedForeground, lineHeight: 20, fontWeight: "400" as const },
    contactCard: { backgroundColor: colors.accent, borderRadius: 24, borderWidth: 1, borderColor: colors.primary + "20", padding: 20, marginBottom: 16 },
    contactTop: { flexDirection: "row", alignItems: "flex-start" as const, gap: 14, marginBottom: 18 },
    contactIconWrap: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primary + "15", alignItems: "center" as const, justifyContent: "center" as const },
    contactText: { flex: 1, paddingTop: 2 },
    contactTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground, marginBottom: 4 },
    contactSubtitle: { fontSize: 13, color: colors.mutedForeground, fontWeight: "400" as const, lineHeight: 18 },
    contactBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
    contactBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
    emptyState: { alignItems: "center" as const, paddingVertical: 48, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground, marginTop: 8 },
    emptySubtitle: { fontSize: 13, color: colors.mutedForeground, textAlign: "center" as const, lineHeight: 19, maxWidth: 260 },
  });
}
