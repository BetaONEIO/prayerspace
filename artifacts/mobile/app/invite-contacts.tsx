import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SectionList,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Gift, MessageCircle, MessageSquare, Phone } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LightColors as Colors } from "@/constants/colors";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";

interface AppContact {
  id: string;
  initials: string;
  name: string;
  phone: string;
  onApp: true;
  userId: string;
}

interface OffAppContact {
  id: string;
  initials: string;
  name: string;
  phone: string;
  onApp: false;
  rawPhone: string;
}

type ContactItem = AppContact | OffAppContact;

const ON_APP: AppContact[] = [
  { id: "a1", initials: "SR", name: "Sarah Reynolds", phone: "+1 (555) 2291", onApp: true, userId: "u1" },
  { id: "a2", initials: "MP", name: "Marcus Powell", phone: "+1 (555) 4410", onApp: true, userId: "u2" },
  { id: "a3", initials: "AK", name: "Aisha Kamara", phone: "+1 (555) 8823", onApp: true, userId: "u3" },
];

const OFF_APP: OffAppContact[] = [
  { id: "b1", initials: "JD", name: "John Doe", phone: "+1 (555) 0912", onApp: false, rawPhone: "15550912" },
  { id: "b2", initials: "MM", name: "Maria Mendez", phone: "+1 (555) 7744", onApp: false, rawPhone: "15557744" },
  { id: "b3", initials: "TR", name: "Tom Richards", phone: "+1 (555) 3311", onApp: false, rawPhone: "15553311" },
  { id: "b4", initials: "LC", name: "Lisa Chen", phone: "+1 (555) 8876", onApp: false, rawPhone: "15558876" },
];

const INVITE_MESSAGE = "Hey! I've been using Prayer Space to share prayer requests and stay connected. Join me! 🙏";

export default function InviteContactsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [messaged, setMessaged] = useState<string[]>([]);

  const handleOpenApp = (contact: AppContact) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/chat/${contact.userId}` as never);
  };

  const handleWhatsApp = async (contact: OffAppContact) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `whatsapp://send?phone=${contact.rawPhone}&text=${encodeURIComponent(INVITE_MESSAGE)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      setMessaged((prev) => [...prev, contact.id]);
    } else {
      handleSMS(contact);
    }
  };

  const handleSMS = (contact: OffAppContact) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url =
      Platform.OS === "ios"
        ? `sms:${contact.rawPhone}&body=${encodeURIComponent(INVITE_MESSAGE)}`
        : `sms:${contact.rawPhone}?body=${encodeURIComponent(INVITE_MESSAGE)}`;
    Linking.openURL(url).then(() => {
      setMessaged((prev) => [...prev, contact.id]);
    }).catch(() => {
      Alert.alert("Unavailable", "Could not open messaging app.");
    });
  };

  const handleWhatsAppOrSMS = (contact: OffAppContact) => {
    if (Platform.OS === "web") {
      Alert.alert("Not available", "WhatsApp and SMS are only available on mobile.");
      return;
    }
    Alert.alert(
      `Invite ${contact.name}`,
      "How would you like to reach them?",
      [
        {
          text: "WhatsApp",
          onPress: () => void handleWhatsApp(contact),
        },
        {
          text: "SMS / Text",
          onPress: () => handleSMS(contact),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const sections = [
    { title: "ON PRAYER SPACE", data: ON_APP as ContactItem[] },
    { title: "NOT ON THE APP YET", data: OFF_APP as ContactItem[] },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Your Contacts</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={Colors.secondaryForeground} />
          </Pressable>
        </View>
        <View style={styles.bannerCard}>
          <View style={styles.giftCircle}>
            <Gift size={26} color={Colors.primaryForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Share the Light</Text>
            <Text style={styles.bannerSub}>
              Invite friends and unlock the "Prayer Warrior" badge.
            </Text>
          </View>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderWrap}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            {section.title === "ON PRAYER SPACE" && (
              <View style={styles.onAppPill}>
                <View style={styles.onAppDot} />
                <Text style={styles.onAppPillText}>{ON_APP.length} connected</Text>
              </View>
            )}
          </View>
        )}
        renderItem={({ item, section }) => {
          if (item.onApp) {
            const c = item as AppContact;
            return (
              <View style={styles.contactCard}>
                <View style={styles.contactLeft}>
                  <View style={[styles.initials, styles.initialsApp]}>
                    <Text style={styles.initialsText}>{c.initials}</Text>
                  </View>
                  <View>
                    <View style={styles.nameRow}>
                      <Text style={styles.contactName}>{c.name}</Text>
                    </View>
                    <Text style={styles.contactPhone}>{c.phone}</Text>
                  </View>
                </View>
                <Pressable
                  style={styles.messageBtn}
                  onPress={() => handleOpenApp(c)}
                  testID={`message-${c.id}`}
                >
                  <MessageCircle size={14} color={Colors.primaryForeground} />
                  <Text style={styles.messageBtnText}>Message</Text>
                </Pressable>
              </View>
            );
          }

          const c = item as OffAppContact;
          const done = messaged.includes(c.id);
          return (
            <View style={styles.contactCard}>
              <View style={styles.contactLeft}>
                <View style={[styles.initials, styles.initialsOff]}>
                  <Text style={[styles.initialsText, styles.initialsTextOff]}>{c.initials}</Text>
                </View>
                <View>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactPhone}>{c.phone}</Text>
                </View>
              </View>
              {done ? (
                <View style={styles.sentPill}>
                  <Text style={styles.sentPillText}>Invited ✓</Text>
                </View>
              ) : (
                <View style={styles.offAppActions}>
                  <Pressable
                    style={styles.whatsappBtn}
                    onPress={() => handleWhatsApp(c)}
                    testID={`whatsapp-${c.id}`}
                  >
                    <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                  </Pressable>
                  <Pressable
                    style={styles.smsBtn}
                    onPress={() => handleSMS(c)}
                    testID={`sms-${c.id}`}
                  >
                    <MessageSquare size={14} color={Colors.secondaryForeground} />
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.5,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.primary + "12",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  giftCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.foreground,
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  sectionGap: {
    height: 8,
  },
  sectionHeaderWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.mutedForeground,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  onAppPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.green + "18",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  onAppDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
  onAppPillText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.green,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border + "50",
  },
  contactLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  initials: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initialsApp: {
    backgroundColor: Colors.primary + "18",
  },
  initialsOff: {
    backgroundColor: Colors.secondary,
  },
  initialsText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  initialsTextOff: {
    color: Colors.secondaryForeground,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  contactPhone: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primaryForeground,
  },
  offAppActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  whatsappBtn: {
    backgroundColor: "#25D366",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  whatsappBtnText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  smsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  sentPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.secondary,
  },
  sentPillText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
  },
});
