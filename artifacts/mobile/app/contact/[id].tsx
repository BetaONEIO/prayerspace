import React, { useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { ArrowLeft, MoreHorizontal, MessageCircle, BookOpen, Heart, Church } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { allContacts } from "@/mocks/data";

const GREEN = "#34C759";

export default function ContactDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isFavourited, setIsFavourited] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipOpacity = useRef(new RNAnimated.Value(0)).current;

  const handleFavourite = () => {
    const newVal = !isFavourited;
    setIsFavourited(newVal);
    if (newVal) {
      setShowTooltip(true);
      RNAnimated.sequence([
        RNAnimated.timing(tooltipOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.delay(1500),
        RNAnimated.timing(tooltipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowTooltip(false));
    }
  };

  const contact = allContacts.find((c) => c.id === id) ?? { id: "c1", name: "Michael Scott", avatar: "https://randomuser.me/api/portraits/men/32.jpg", email: "michael@dundermifflin.com", status: "online" as const };

  return (
    <AutoScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBg}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable style={styles.glassBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.foreground} /></Pressable>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: contact.avatar }} style={styles.avatar} />
              {contact.status === "online" && <View style={styles.onlineDot} />}
            </View>
            <Pressable style={styles.glassBtn}><MoreHorizontal size={20} color={colors.foreground} /></Pressable>
          </View>
          <View style={styles.nameSection}>
            <Text style={styles.name}>{contact.name}</Text>
            <Text style={styles.handle}>@{contact.name.toLowerCase().replace(" ", "_")}</Text>
            {(contact as any).bibleVerse && (
              <View style={styles.verseWrap}>
                <BookOpen size={13} color={colors.primary} />
                <Text style={styles.verseText}>{(contact as any).bibleVerse}</Text>
                {(contact as any).bibleVerseRef && <Text style={styles.verseRef}>— {(contact as any).bibleVerseRef}</Text>}
              </View>
            )}
            {(contact as any).community && (
              <Pressable style={styles.communityBadgeWrap}>
                <LinearGradient colors={(contact as any).community.gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.communityBadge}>
                  <Church size={13} color="#fff" />
                  <Text style={styles.communityBadgeText}>{(contact as any).community.name}</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.body}>
        <View style={styles.actionRow}>
          <Pressable style={styles.prayBtn} onPress={() => router.push(`/chat/${contact.id}`)}>
            <MessageCircle size={20} color={colors.primaryForeground} />
            <Text style={styles.prayBtnText}>Message</Text>
          </Pressable>
          <View style={styles.favWrap}>
            <Pressable style={styles.chatBtn} onPress={handleFavourite}>
              <Heart size={22} color={isFavourited ? colors.primary : colors.secondaryForeground} fill={isFavourited ? colors.primary : "none"} />
            </Pressable>
            {showTooltip && (
              <RNAnimated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
                <View style={styles.tooltipArrow} />
                <Text style={styles.tooltipText}>Added to Favourites</Text>
              </RNAnimated.View>
            )}
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 40 }]}>
          <Text style={styles.sectionLabel}>Activity with {contact.name.split(" ")[0]}</Text>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}><Heart size={18} color={colors.primary} fill={colors.primary} /></View>
            <View>
              <Text style={styles.activityTitle}>You prayed for {contact.name.split(" ")[0]}</Text>
              <Text style={styles.activitySub}>"Strength for the journey" • 2 days ago</Text>
            </View>
          </View>
        </View>
      </View>
    </AutoScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 24 },
    headerBg: { backgroundColor: colors.primary + "18", paddingBottom: 20 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 12 },
    glassBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card + "80", alignItems: "center", justifyContent: "center" },
    nameSection: { alignItems: "center", paddingTop: 10 },
    avatarWrap: { position: "relative" },
    avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.card },
    onlineDot: { position: "absolute", bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: GREEN, borderWidth: 4, borderColor: colors.card },
    name: { fontSize: 22, fontWeight: "800" as const, color: colors.foreground, marginTop: 12 },
    handle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
    verseWrap: { alignItems: "center", marginTop: 12, paddingHorizontal: 32, gap: 5 },
    verseText: { fontSize: 13, color: colors.mutedForeground, fontStyle: "italic", textAlign: "center", lineHeight: 20, marginTop: 2 },
    verseRef: { fontSize: 11, fontWeight: "700" as const, color: colors.primary, letterSpacing: 0.3 },
    body: { paddingHorizontal: 24, paddingTop: 16 },
    actionRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
    prayBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    prayBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
    favWrap: { position: "relative" },
    chatBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    tooltip: { position: "absolute", bottom: 64, right: -10, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 140, alignItems: "center" },
    tooltipArrow: { position: "absolute", bottom: -6, right: 24, width: 12, height: 12, backgroundColor: colors.primary, transform: [{ rotate: "45deg" }] },
    tooltipText: { color: colors.primaryForeground, fontSize: 13, fontWeight: "700" as const },
    communityBadgeWrap: { marginTop: 10 },
    communityBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
    communityBadgeText: { fontSize: 12, fontWeight: "700" as const, color: "#fff", letterSpacing: 0.2 },
    section: { marginBottom: 24 },
    sectionLabel: { fontSize: 11, fontWeight: "800" as const, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 },
    activityItem: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    activityIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    activityTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    activitySub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  });
}
