import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, Platform, Animated, Share } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import AvatarImage from "@/components/AvatarImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Search, UserPlus, Users, X, BookUser, UserCheck, Clock, ChevronRight, Share2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Contacts from "expo-contacts";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface FoundUser { id: string; full_name: string | null; avatar_url: string | null; bio: string | null; }
interface FriendRequest { id: string; sender_id: string; receiver_id: string; status: "pending" | "accepted" | "declined"; }

function deriveUsername(name: string | null): string {
  if (!name) return "@user";
  return "@" + name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "");
}

export default function FindFriendScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [contactsPermission, setContactsPermission] = useState<"granted" | "denied" | "undetermined" | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") { setContactsPermission("denied"); return; }
    Contacts.getPermissionsAsync().then((r) => setContactsPermission(r.status as any)).catch(() => setContactsPermission("denied"));
  }, []);

  useEffect(() => {
    if (contactsPermission !== null && contactsPermission !== "granted") {
      Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 10 }).start();
    }
  }, [contactsPermission]);

  const { data: myRequests = [] } = useQuery<FriendRequest[]>({
    queryKey: ["friend_requests_sent", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("friend_requests").select("id, sender_id, receiver_id, status").eq("sender_id", user.id);
      if (error) return [];
      return (data as FriendRequest[]) ?? [];
    },
    enabled: !!user?.id,
  });

  const { data: incomingCount = 0 } = useQuery<number>({
    queryKey: ["friend_requests_incoming_count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase.from("friend_requests").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("status", "pending");
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });

  const getRequestStatus = useCallback((userId: string): "none" | "pending" | "accepted" | "declined" => {
    const req = myRequests.find((r) => r.receiver_id === userId);
    return req ? req.status : "none";
  }, [myRequests]);

  const handleRequestContactsPermission = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setRequestingPermission(true);
    try {
      const result = await Contacts.requestPermissionsAsync();
      setContactsPermission(result.status as any);
      if (result.status === "granted") Animated.spring(bannerAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }).start();
    } catch { } finally { setRequestingPermission(false); }
  }, [bannerAnim]);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const trimmed = searchQuery.trim().toLowerCase();
      if (!trimmed) return [];
      const { data, error } = await supabase.from("profiles").select("id, full_name, avatar_url, bio").ilike("full_name", `%${trimmed}%`).neq("id", user?.id ?? "").limit(20);
      if (error) throw error;
      return (data as FoundUser[]) ?? [];
    },
    onSuccess: (data) => { setResults(data); setHasSearched(true); setShowDropdown(data.length > 0); },
    onError: () => { Alert.alert("Search Error", "Could not search. Please try again."); },
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: receiverId, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["friend_requests_sent", user?.id] }); if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: () => { Alert.alert("Error", "Could not send friend request. Please try again."); },
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); setHasSearched(false); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(() => searchMutation.mutate(trimmed), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleInvite = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    try {
      await Share.share({
        message: "Join me on Prayer Space — a community for praying together. Download the app: https://prayerspace.app",
        title: "Invite to Prayer Space",
      });
    } catch { }
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.secondaryForeground} /></Pressable>
          <Text style={styles.headerTitle}>Find Friends</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.inviteBtn} onPress={() => { void handleInvite(); }}>
              <Share2 size={18} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.requestsBtn} onPress={() => router.push("/friend-requests" as never)}>
              <Users size={18} color={colors.primary} />
              {incomingCount > 0 && <View style={styles.requestsBadge}><Text style={styles.requestsBadgeText}>{incomingCount}</Text></View>}
            </Pressable>
          </View>
        </View>

        {incomingCount > 0 && (
          <Pressable style={styles.incomingBanner} onPress={() => router.push("/friend-requests" as never)}>
            <View style={styles.incomingBannerLeft}>
              <View style={styles.incomingBannerDot} />
              <Text style={styles.incomingBannerText}>{incomingCount} pending friend {incomingCount === 1 ? "request" : "requests"}</Text>
            </View>
            <ChevronRight size={16} color={colors.primary} />
          </Pressable>
        )}

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color={colors.mutedForeground} />
            <TextInput style={styles.searchInput} placeholder="Search by name or username..." placeholderTextColor={colors.mutedForeground + "80"} value={query} onChangeText={setQuery} onSubmitEditing={() => { if (query.trim()) searchMutation.mutate(query); }} returnKeyType="search" autoCapitalize="none" autoCorrect={false} />
            {query.length > 0 && <Pressable onPress={() => { setQuery(""); setResults([]); setHasSearched(false); setShowDropdown(false); }} hitSlop={8}><X size={18} color={colors.mutedForeground} /></Pressable>}
            {searchMutation.isPending && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
        </View>

        {showDropdown && results.length > 0 && (
          <View style={styles.dropdownContainer}>
            <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {results.map((found, index) => {
                const status = getRequestStatus(found.id);
                return (
                  <Pressable key={found.id} style={[styles.dropdownItem, index < results.length - 1 && styles.dropdownItemBorder]} onPress={() => { if (status === "none") sendRequestMutation.mutate(found.id); }}>
                    <AvatarImage avatarPath={found.avatar_url} fallbackSeed={found.full_name ?? "U"} style={styles.dropdownAvatar} />
                    <View style={styles.dropdownInfo}>
                      <Text style={styles.dropdownName} numberOfLines={1}>{found.full_name ?? "User"}</Text>
                      <Text style={styles.dropdownUsername} numberOfLines={1}>{deriveUsername(found.full_name)}</Text>
                    </View>
                    {status === "accepted" ? (
                      <View style={[styles.statusBadge, styles.statusBadgeFriends]}><UserCheck size={12} color={colors.primary} /><Text style={styles.statusBadgeTextPrimary}>Friends</Text></View>
                    ) : status === "pending" ? (
                      <View style={[styles.statusBadge, styles.statusBadgePending]}><Clock size={12} color={colors.mutedForeground} /><Text style={styles.statusBadgeTextMuted}>Requested</Text></View>
                    ) : (
                      <View style={styles.addBtnSmall}><UserPlus size={14} color={colors.primaryForeground} /></View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {hasSearched && results.length === 0 && !searchMutation.isPending && query.trim().length > 0 && (
          <View style={styles.noResultsDropdown}>
            <Text style={styles.noResultsText}>User not found</Text>
            <Pressable style={({ pressed }) => [styles.noResultsInviteBtn, pressed && { opacity: 0.75 }]} onPress={() => { void handleInvite(); }}>
              <Share2 size={14} color={colors.primary} />
              <Text style={styles.noResultsInviteText}>Invite them to Prayer Space</Text>
            </Pressable>
          </View>
        )}

        {contactsPermission !== null && contactsPermission !== "granted" && Platform.OS !== "web" && (
          <Animated.View style={[styles.contactsBanner, { opacity: bannerAnim, transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}>
            <View style={styles.contactsBannerIcon}><BookUser size={22} color={colors.primary} /></View>
            <View style={styles.contactsBannerText}>
              <Text style={styles.contactsBannerTitle}>Connect your address book</Text>
              <Text style={styles.contactsBannerDesc}>See which of your contacts are already on Prayer Space.</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.contactsBannerBtn, pressed && { opacity: 0.8 }, requestingPermission && { opacity: 0.6 }]} onPress={handleRequestContactsPermission} disabled={requestingPermission}>
              {requestingPermission ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text style={styles.contactsBannerBtnText}>Connect</Text>}
            </Pressable>
          </Animated.View>
        )}

        <AutoScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!hasSearched && !searchMutation.isPending && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}><Users size={40} color={colors.primary + "40"} /></View>
              <Text style={styles.emptyTitle}>Find people on Prayer Space</Text>
              <Text style={styles.emptyDesc}>Search by name or username to connect with friends and start praying together.</Text>
              <Pressable style={({ pressed }) => [styles.emptyInviteBtn, pressed && { opacity: 0.75 }]} onPress={() => { void handleInvite(); }}>
                <Share2 size={15} color={colors.primary} />
                <Text style={styles.emptyInviteText}>Invite friends</Text>
              </Pressable>
            </View>
          )}
          <View style={{ height: 40 }} />
        </AutoScrollView>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    headerTitle: { fontSize: 20, fontWeight: "700" as const, color: colors.foreground },
    headerRight: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    inviteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "14", alignItems: "center" as const, justifyContent: "center" as const },
    requestsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "14", alignItems: "center" as const, justifyContent: "center" as const },
    requestsBadge: { position: "absolute" as const, top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.background },
    requestsBadgeText: { fontSize: 9, fontWeight: "800" as const, color: colors.primaryForeground },
    incomingBanner: { marginHorizontal: 24, marginBottom: 12, backgroundColor: colors.primary + "10", borderRadius: 16, borderWidth: 1, borderColor: colors.primary + "25", paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    incomingBannerLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
    incomingBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    incomingBannerText: { fontSize: 13, fontWeight: "600" as const, color: colors.primary },
    searchSection: { paddingHorizontal: 24, marginBottom: 0, zIndex: 10 },
    searchBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border + "80" },
    searchInput: { flex: 1, fontSize: 15, color: colors.foreground, fontWeight: "500" as const, padding: 0 },
    dropdownContainer: { marginHorizontal: 24, marginTop: 4, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, maxHeight: 320, zIndex: 20, overflow: "hidden" },
    dropdownScroll: { maxHeight: 320 },
    dropdownItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
    dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border + "60" },
    dropdownAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary + "18" },
    dropdownInfo: { flex: 1, gap: 2 },
    dropdownName: { fontSize: 15, fontWeight: "600" as const, color: colors.foreground },
    dropdownUsername: { fontSize: 13, fontWeight: "500" as const, color: colors.mutedForeground },
    addBtnSmall: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center" as const, justifyContent: "center" as const },
    statusBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    statusBadgeFriends: { backgroundColor: colors.primary + "14" },
    statusBadgePending: { backgroundColor: colors.secondary },
    statusBadgeTextPrimary: { fontSize: 12, fontWeight: "600" as const, color: colors.primary },
    statusBadgeTextMuted: { fontSize: 12, fontWeight: "600" as const, color: colors.mutedForeground },
    noResultsDropdown: { marginHorizontal: 24, marginTop: 4, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20, paddingVertical: 18, gap: 12 },
    noResultsText: { fontSize: 14, fontWeight: "500" as const, color: colors.mutedForeground, textAlign: "center" as const },
    noResultsInviteBtn: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 7, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary + "40", backgroundColor: colors.primary + "0A" },
    noResultsInviteText: { fontSize: 14, fontWeight: "600" as const, color: colors.primary },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
    emptyState: { alignItems: "center" as const, paddingTop: 60, paddingHorizontal: 32 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 28, backgroundColor: colors.primary + "0D", alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 20 },
    emptyTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground, marginBottom: 8, textAlign: "center" as const },
    emptyDesc: { fontSize: 14, color: colors.mutedForeground, fontWeight: "500" as const, textAlign: "center" as const, lineHeight: 21, marginBottom: 24 },
    emptyInviteBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 22, borderWidth: 1.5, borderColor: colors.primary + "50", backgroundColor: colors.primary + "0A" },
    emptyInviteText: { fontSize: 15, fontWeight: "700" as const, color: colors.primary },
    contactsBanner: { marginHorizontal: 24, marginTop: 12, backgroundColor: colors.accent, borderRadius: 20, borderWidth: 1, borderColor: colors.primary + "30", padding: 14, flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
    contactsBannerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.card, alignItems: "center" as const, justifyContent: "center" as const, flexShrink: 0, borderWidth: 1, borderColor: colors.primary + "20" },
    contactsBannerText: { flex: 1, gap: 2 },
    contactsBannerTitle: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground },
    contactsBannerDesc: { fontSize: 12, color: colors.mutedForeground, lineHeight: 17 },
    contactsBannerBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const, minWidth: 74 },
    contactsBannerBtnText: { fontSize: 13, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
