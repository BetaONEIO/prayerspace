import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
  Modal,
  Animated,
  Alert,
  Share,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  Camera,
  Pen,
  Crown,
  Shield,
  Users,
  MoreHorizontal,
  Lock,
  Globe,
  ShieldCheck,
  UserPlus,
  Trash2,
  CheckCircle,
  UserMinus,
  X,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import PhotoUploadModal from "@/components/PhotoUploadModal";
import { groupStore, GroupMember, FocusCategory, PrivacyType } from "@/lib/groupStore";
import { useChurchEntitlements } from "@/hooks/useChurchEntitlements";

const FOCUS_OPTIONS: { id: FocusCategory; emoji: string; label: string }[] = [
  { id: "Prayer", emoji: "🙏", label: "Prayer" },
  { id: "Bible Study", emoji: "📖", label: "Bible Study" },
  { id: "Support", emoji: "🤝", label: "Support" },
  { id: "Testimony", emoji: "✨", label: "Testimony" },
];

const CURRENT_USER_ID = "me";
const IS_CURRENT_USER_ADMIN = true;

export default function ManageGroupScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isPremiumCommunity, isOwner, tierLabel } = useChurchEntitlements();
  const params = useLocalSearchParams<{ id?: string }>();
  const groupId = params.id || "group-1";
  const initialState = groupStore.get(groupId);

  const [groupName, setGroupName] = useState(initialState.name);
  const [description, setDescription] = useState(initialState.description);
  const [selectedFocus, setSelectedFocus] = useState<FocusCategory>(initialState.focus);
  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyType>(initialState.privacy);
  const [safeSpace, setSafeSpace] = useState(initialState.safeSpace);
  const [groupPhotoUri, setGroupPhotoUri] = useState<string | null>(initialState.photoUri);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>(() => initialState.members.map((m) => ({ ...m })));
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);
  const [showMemberSheet, setShowMemberSheet] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const memberSheetAnim = useRef(new Animated.Value(300)).current;
  const memberSheetBackdrop = useRef(new Animated.Value(0)).current;
  const savedModalScale = useRef(new Animated.Value(0.85)).current;
  const savedModalFade = useRef(new Animated.Value(0)).current;

  const markChanged = useCallback(() => setHasChanges(true), []);

  const openMemberSheet = useCallback((member: GroupMember) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMember(member);
    setShowMemberSheet(true);
    Animated.parallel([
      Animated.timing(memberSheetBackdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(memberSheetAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, [memberSheetAnim, memberSheetBackdrop]);

  const closeMemberSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(memberSheetBackdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(memberSheetAnim, { toValue: 300, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setShowMemberSheet(false);
      setSelectedMember(null);
    });
  }, [memberSheetAnim, memberSheetBackdrop]);

  const handleRemoveMember = useCallback((member: GroupMember) => {
    closeMemberSheet();
    setTimeout(() => {
      Alert.alert(
        "Remove Member",
        `Remove ${member.name} from the group?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              setMembers((prev) => prev.filter((m) => m.id !== member.id));
              markChanged();
            },
          },
        ]
      );
    }, 300);
  }, [closeMemberSheet, markChanged]);

  const handleMakeAdmin = useCallback((member: GroupMember) => {
    closeMemberSheet();
    const isAlreadyAdmin = member.role === "Admin";
    setTimeout(() => {
      Alert.alert(
        isAlreadyAdmin ? "Remove Admin Role" : "Make Admin",
        isAlreadyAdmin
          ? `Remove ${member.name}'s admin privileges?`
          : `Make ${member.name} an admin? They'll be able to manage the group.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: isAlreadyAdmin ? "Remove Admin" : "Make Admin",
            style: isAlreadyAdmin ? "destructive" : "default",
            onPress: () => {
              setMembers((prev) =>
                prev.map((m) =>
                  m.id === member.id
                    ? { ...m, role: isAlreadyAdmin ? "Member" : "Admin" }
                    : m
                )
              );
              markChanged();
            },
          },
        ]
      );
    }, 300);
  }, [closeMemberSheet, markChanged]);

  const handleViewProfile = useCallback(() => {
    closeMemberSheet();
    if (selectedMember) {
      setTimeout(() => router.push("/profile" as never), 300);
    }
  }, [closeMemberSheet, selectedMember, router]);

  const handleSave = useCallback(() => {
    if (!groupName.trim()) {
      Alert.alert("Group Name Required", "Please enter a group name.");
      return;
    }
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    groupStore.update(groupId, {
      name: groupName.trim(),
      description: description.trim(),
      photoUri: groupPhotoUri,
      privacy: selectedPrivacy,
      safeSpace,
      focus: selectedFocus,
      members,
    });
    setHasChanges(false);
    Animated.parallel([
      Animated.timing(savedModalFade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(savedModalScale, { toValue: 1, tension: 180, friction: 12, useNativeDriver: true }),
    ]).start();
    setShowSavedModal(true);
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(savedModalFade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(savedModalScale, { toValue: 0.85, duration: 180, useNativeDriver: true }),
      ]).start(() => setShowSavedModal(false));
    }, 1800);
  }, [groupId, groupName, description, selectedFocus, selectedPrivacy, safeSpace, groupPhotoUri, members, savedModalFade, savedModalScale]);

  const handleDeleteGroup = useCallback(() => {
    Alert.alert(
      "Delete Group",
      `This will permanently delete "${groupName}" and all its messages. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Group",
          style: "destructive",
          onPress: () => {
            console.log("[ManageGroup] Group deleted");
            router.replace("/(tabs)/community" as never);
          },
        },
      ]
    );
  }, [router, groupName]);

  const admins = members.filter((m) => m.role === "Admin");
  const leaders = members.filter((m) => m.role === "Leader");
  const regularMembers = members.filter((m) => m.role === "Member");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable style={styles.headerBack} onPress={() => router.back()}>
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Manage Group</Text>
          <Pressable
            style={[styles.saveBtn, hasChanges && { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={[styles.saveBtnText, hasChanges && { color: colors.primaryForeground }]}>
              Save
            </Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <AutoScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Pressable style={styles.photoPicker} onPress={() => setShowPhotoModal(true)}>
              {groupPhotoUri ? (
                <Image source={{ uri: groupPhotoUri }} style={styles.photoPickerImage} contentFit="cover" />
              ) : (
                <Image
                  source={{ uri: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80" }}
                  style={styles.photoPickerImage}
                  contentFit="cover"
                />
              )}
              <View style={styles.photoEditBadge}>
                <Pen size={13} color="#fff" />
              </View>
              <View style={styles.photoEditOverlay}>
                <Camera size={20} color="#fff" />
                <Text style={styles.photoEditLabel}>Change Photo</Text>
              </View>
            </Pressable>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>GROUP DETAILS</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Name</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.foreground }]}
                    value={groupName}
                    onChangeText={(v) => { setGroupName(v); markChanged(); }}
                    placeholder="Group name"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View style={[styles.fieldDivider, { backgroundColor: colors.border }]} />
                <View style={styles.fieldRowMulti}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Description</Text>
                  <TextInput
                    style={[styles.fieldInputMulti, { color: colors.foreground }]}
                    value={description}
                    onChangeText={(v) => { setDescription(v); markChanged(); }}
                    placeholder="Describe your group"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>FOCUS CATEGORY</Text>
              <View style={styles.focusGrid}>
                {FOCUS_OPTIONS.map((opt) => {
                  const sel = selectedFocus === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[
                        styles.focusOption,
                        { backgroundColor: colors.card, borderColor: sel ? colors.primary : colors.border },
                        sel && { borderColor: colors.primary },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== "web") void Haptics.selectionAsync();
                        setSelectedFocus(opt.id);
                        markChanged();
                      }}
                    >
                      <Text style={styles.focusEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.focusLabel, { color: sel ? colors.primary : colors.foreground }]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PRIVACY</Text>
              <View style={styles.privacyCards}>
                {([
                  { type: "Private" as PrivacyType, icon: Lock, label: "Private", desc: "Invite only — members only join with your approval." },
                  { type: "Public" as PrivacyType, icon: Globe, label: "Public", desc: "Visible to everyone. Anyone can find and join." },
                ] as const).map(({ type, icon: Icon, label, desc }) => {
                  const sel = selectedPrivacy === type;
                  return (
                    <Pressable
                      key={type}
                      style={[
                        styles.privacyCard,
                        { backgroundColor: colors.card, borderColor: sel ? colors.primary : colors.border },
                      ]}
                      onPress={() => {
                        if (Platform.OS !== "web") void Haptics.selectionAsync();
                        setSelectedPrivacy(type);
                        markChanged();
                      }}
                    >
                      <View style={[styles.privacyIcon, { backgroundColor: sel ? colors.primary + "18" : colors.secondary }]}>
                        <Icon size={17} color={sel ? colors.primary : colors.mutedForeground} />
                      </View>
                      <View style={styles.privacyBody}>
                        <Text style={[styles.privacyTitle, { color: colors.foreground }]}>{label}</Text>
                        <Text style={[styles.privacyDesc, { color: colors.mutedForeground }]}>{desc}</Text>
                      </View>
                      <View style={[styles.radio, { borderColor: sel ? colors.primary : colors.border }]}>
                        {sel && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.toggleLeft}>
                  <ShieldCheck size={17} color={colors.primary} />
                  <View>
                    <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Safe Space Policy</Text>
                    <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>Enable group moderation</Text>
                  </View>
                </View>
                <Switch
                  value={safeSpace}
                  onValueChange={(v) => { setSafeSpace(v); markChanged(); if (Platform.OS !== "web") void Haptics.selectionAsync(); }}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.card}
                />
              </View>
            </View>

            {(isPremiumCommunity || isOwner) && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SUBSCRIPTION</Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: isPremiumCommunity ? colors.primary + "40" : colors.border }]}>
                  {isPremiumCommunity ? (
                    <>
                      {/* Badge row — badge left, active indicator right */}
                      <View style={styles.subscriptionTopRow}>
                        <View style={[styles.premiumBadge, { backgroundColor: colors.primary }]}>
                          <Crown size={13} color={colors.primaryForeground} />
                          <Text style={[styles.premiumBadgeText, { color: colors.primaryForeground }]}>Premium Community</Text>
                        </View>
                        <View style={styles.activeIndicatorWrap}>
                          <View style={styles.activeDot} />
                          <Text style={[styles.activeLabel, { color: colors.mutedForeground }]}>Active</Text>
                        </View>
                      </View>

                      {/* Plan name on its own full-width line */}
                      <Text style={[styles.tierLabel, { color: colors.foreground }]}>{tierLabel}</Text>

                      {isOwner && (
                        <View style={[styles.ownerRow, { borderTopColor: colors.border }]}>
                          <ShieldCheck size={15} color={colors.primary} />
                          <Text style={[styles.ownerText, { color: colors.foreground }]}>You are the billing owner</Text>
                        </View>
                      )}
                      <Text style={[styles.subscriptionNote, { color: colors.mutedForeground }]}>
                        {isOwner
                          ? "You have full admin access and personal Pro features while your subscription is active."
                          : "Members access community features while the subscription is active."}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.subscriptionTopRow}>
                        <Text style={[styles.inactiveLabel, { color: colors.foreground }]}>Subscription inactive</Text>
                        <View style={styles.activeIndicatorWrap}>
                          <View style={[styles.activeDot, { backgroundColor: colors.mutedForeground }]} />
                          <Text style={[styles.activeLabel, { color: colors.mutedForeground }]}>Inactive</Text>
                        </View>
                      </View>
                      <Text style={[styles.subscriptionNote, { color: colors.mutedForeground }]}>
                        Renew your plan to restore premium features for all members.
                      </Text>
                    </>
                  )}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  MEMBERS ({members.length})
                </Text>
                <Pressable
                  style={[styles.inviteBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
                  onPress={() => {
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                    void Share.share({
                      message: `Join ${groupName} on Prayer Space — a private space to pray and stay connected.\n\nhttps://prayerspace.app/join`,
                    });
                  }}
                >
                  <UserPlus size={13} color={colors.primary} />
                  <Text style={[styles.inviteBtnText, { color: colors.primary }]}>Invite</Text>
                </Pressable>
              </View>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {admins.length > 0 && (
                  <>
                    <View style={styles.memberSectionLabel}>
                      <Crown size={12} color={colors.primary} />
                      <Text style={[styles.memberSectionText, { color: colors.primary }]}>Admins</Text>
                    </View>
                    {admins.map((m, i) => (
                      <ManageMemberRow
                        key={m.id}
                        member={m}
                        isLast={i === admins.length - 1 && leaders.length === 0 && regularMembers.length === 0}
                        isCurrentUserAdmin={IS_CURRENT_USER_ADMIN}
                        onActionPress={() => openMemberSheet(m)}
                        colors={colors}
                      />
                    ))}
                  </>
                )}

                {leaders.length > 0 && (
                  <>
                    {admins.length > 0 && <View style={[styles.memberDivider, { backgroundColor: colors.border }]} />}
                    <View style={styles.memberSectionLabel}>
                      <Shield size={12} color={colors.accentForeground} />
                      <Text style={[styles.memberSectionText, { color: colors.accentForeground }]}>Leaders</Text>
                    </View>
                    {leaders.map((m, i) => (
                      <ManageMemberRow
                        key={m.id}
                        member={m}
                        isLast={i === leaders.length - 1 && regularMembers.length === 0}
                        isCurrentUserAdmin={IS_CURRENT_USER_ADMIN}
                        onActionPress={() => openMemberSheet(m)}
                        colors={colors}
                      />
                    ))}
                  </>
                )}

                {regularMembers.length > 0 && (
                  <>
                    {(admins.length > 0 || leaders.length > 0) && <View style={[styles.memberDivider, { backgroundColor: colors.border }]} />}
                    <View style={styles.memberSectionLabel}>
                      <Users size={12} color={colors.mutedForeground} />
                      <Text style={[styles.memberSectionText, { color: colors.mutedForeground }]}>Members</Text>
                    </View>
                    {regularMembers.map((m, i) => (
                      <ManageMemberRow
                        key={m.id}
                        member={m}
                        isLast={i === regularMembers.length - 1}
                        isCurrentUserAdmin={IS_CURRENT_USER_ADMIN}
                        onActionPress={() => openMemberSheet(m)}
                        colors={colors}
                      />
                    ))}
                  </>
                )}
              </View>
            </View>

            {IS_CURRENT_USER_ADMIN && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DANGER ZONE</Text>
                <Pressable
                  style={[styles.deleteBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
                  onPress={handleDeleteGroup}
                >
                  <Trash2 size={17} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>Delete Group</Text>
                  <ChevronRight size={16} color="#DC2626" style={{ marginLeft: "auto" }} />
                </Pressable>
              </View>
            )}

            <View style={{ height: 40 }} />
          </AutoScrollView>
        </KeyboardAvoidingView>

        {showMemberSheet && selectedMember && (
          <Modal visible transparent animationType="none" onRequestClose={closeMemberSheet} statusBarTranslucent>
            <View style={styles.sheetRoot}>
              <Animated.View style={[styles.sheetBackdrop, { opacity: memberSheetBackdrop }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={closeMemberSheet} />
              </Animated.View>

              <Animated.View style={[styles.sheet, { backgroundColor: colors.card, transform: [{ translateY: memberSheetAnim }] }]}>
                <View style={styles.sheetHandle} />

                <View style={styles.sheetMemberInfo}>
                  <Image source={{ uri: selectedMember.avatar }} style={styles.sheetMemberAvatar} contentFit="cover" />
                  <View>
                    <Text style={[styles.sheetMemberName, { color: colors.foreground }]}>{selectedMember.name}</Text>
                    <Text style={[styles.sheetMemberRole, { color: colors.mutedForeground }]}>{selectedMember.role}</Text>
                  </View>
                </View>

                <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

                <Pressable style={styles.sheetAction} onPress={handleViewProfile}>
                  <Users size={18} color={colors.foreground} />
                  <Text style={[styles.sheetActionText, { color: colors.foreground }]}>View Profile</Text>
                </Pressable>

                {IS_CURRENT_USER_ADMIN && selectedMember.id !== CURRENT_USER_ID && (
                  <>
                    <Pressable style={styles.sheetAction} onPress={() => handleMakeAdmin(selectedMember)}>
                      <Crown size={18} color={selectedMember.role === "Admin" ? colors.mutedForeground : colors.primary} />
                      <Text style={[styles.sheetActionText, { color: selectedMember.role === "Admin" ? colors.mutedForeground : colors.primary }]}>
                        {selectedMember.role === "Admin" ? "Remove Admin Role" : "Make Admin"}
                      </Text>
                    </Pressable>

                    <Pressable style={styles.sheetAction} onPress={() => handleRemoveMember(selectedMember)}>
                      <UserMinus size={18} color="#DC2626" />
                      <Text style={[styles.sheetActionText, { color: "#DC2626" }]}>Remove from Group</Text>
                    </Pressable>
                  </>
                )}

                <Pressable style={[styles.sheetCancelBtn, { backgroundColor: colors.secondary }]} onPress={closeMemberSheet}>
                  <X size={16} color={colors.mutedForeground} />
                  <Text style={[styles.sheetCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </Pressable>
              </Animated.View>
            </View>
          </Modal>
        )}

        {showSavedModal && (
          <Modal visible transparent animationType="none" statusBarTranslucent>
            <View style={styles.savedOverlay}>
              <Animated.View style={[styles.savedCard, { backgroundColor: colors.card, transform: [{ scale: savedModalScale }], opacity: savedModalFade }]}>
                <CheckCircle size={36} color={colors.primary} />
                <Text style={[styles.savedTitle, { color: colors.foreground }]}>Changes Saved</Text>
              </Animated.View>
            </View>
          </Modal>
        )}

        <PhotoUploadModal
          visible={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          onImageSelected={(uri) => {
            setGroupPhotoUri(uri);
            setShowPhotoModal(false);
            markChanged();
          }}
          onRemovePhoto={groupPhotoUri ? () => { setGroupPhotoUri(null); setShowPhotoModal(false); markChanged(); } : undefined}
          hasExistingPhoto={!!groupPhotoUri}
        />
      </SafeAreaView>
    </>
  );
}

function ManageMemberRow({
  member,
  isLast,
  isCurrentUserAdmin,
  onActionPress,
  colors,
}: {
  member: GroupMember;
  isLast: boolean;
  isCurrentUserAdmin: boolean;
  onActionPress: () => void;
  colors: ThemeColors;
}) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isAdmin = member.role === "Admin";
  const isLeader = member.role === "Leader";
  const roleBg = isAdmin ? colors.primary + "15" : isLeader ? colors.accentForeground + "15" : colors.secondary;
  const roleColor = isAdmin ? colors.primary : isLeader ? colors.accentForeground : colors.mutedForeground;

  return (
    <View style={[styles.memberRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={styles.memberAvatarWrap}>
        <Image source={{ uri: member.avatar }} style={styles.memberAvatar} contentFit="cover" />
        {member.isOnline && <View style={[styles.onlineDot, { backgroundColor: "#22C55E", borderColor: colors.card }]} />}
      </View>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1}>{member.name}</Text>
        {member.joinedDate && (
          <Text style={[styles.memberJoined, { color: colors.mutedForeground }]}>{member.joinedDate}</Text>
        )}
      </View>
      <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
        {isAdmin && <Crown size={10} color={roleColor} />}
        {isLeader && <Shield size={10} color={roleColor} />}
        <Text style={[styles.roleText, { color: roleColor }]}>{member.role}</Text>
      </View>
      {isCurrentUserAdmin && (
        <Pressable style={styles.memberMoreBtn} onPress={onActionPress} hitSlop={8}>
          <MoreHorizontal size={18} color={colors.mutedForeground} />
        </Pressable>
      )}
    </View>
  );
}

const { absoluteFill } = StyleSheet;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    headerBack: {
      width: 36,
      height: 36,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: "700" as const,
      textAlign: "center" as const,
      letterSpacing: -0.2,
    },
    saveBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.secondary,
    },
    saveBtnText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
    },
    scroll: {
      paddingTop: 0,
      paddingBottom: 20,
    },
    photoPicker: {
      height: 180,
      position: "relative" as const,
      overflow: "hidden" as const,
    },
    photoPickerImage: {
      width: "100%",
      height: "100%",
    },
    photoEditBadge: {
      position: "absolute" as const,
      bottom: 12,
      right: 12,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    photoEditOverlay: {
      ...absoluteFill,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
    },
    photoEditLabel: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600" as const,
    },
    section: {
      paddingHorizontal: 16,
      paddingTop: 20,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "700" as const,
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    sectionHeaderRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 10,
    },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: "hidden" as const,
    },
    fieldRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    fieldRowMulti: {
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 8,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      width: 90,
      flexShrink: 0,
    },
    fieldInput: {
      flex: 1,
      fontSize: 14,
      textAlign: "right" as const,
    },
    fieldInputMulti: {
      fontSize: 14,
      lineHeight: 21,
      textAlignVertical: "top" as const,
      minHeight: 56,
    },
    fieldDivider: {
      height: 1,
      marginLeft: 14,
    },
    focusGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 10,
    },
    focusOption: {
      borderRadius: 12,
      borderWidth: 1.5,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center" as const,
      gap: 4,
      minWidth: 80,
    },
    focusEmoji: {
      fontSize: 22,
    },
    focusLabel: {
      fontSize: 12,
      fontWeight: "600" as const,
    },
    privacyCards: {
      gap: 10,
      marginBottom: 12,
    },
    privacyCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      borderRadius: 14,
      borderWidth: 1.5,
      padding: 14,
      gap: 12,
    },
    privacyIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    privacyBody: {
      flex: 1,
    },
    privacyTitle: {
      fontSize: 14,
      fontWeight: "700" as const,
      marginBottom: 2,
    },
    privacyDesc: {
      fontSize: 12,
      lineHeight: 17,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    toggleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      gap: 12,
    },
    toggleLeft: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
    },
    toggleTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
    toggleDesc: {
      fontSize: 12,
    },
    memberSectionLabel: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    memberSectionText: {
      fontSize: 11,
      fontWeight: "700" as const,
      letterSpacing: 0.4,
      textTransform: "uppercase" as const,
    },
    memberDivider: {
      height: 1,
      marginHorizontal: 14,
    },
    memberRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
    },
    memberAvatarWrap: {
      position: "relative" as const,
    },
    memberAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    onlineDot: {
      position: "absolute" as const,
      bottom: 1,
      right: 1,
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
    memberJoined: {
      fontSize: 11,
      marginTop: 1,
    },
    roleBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
    },
    roleText: {
      fontSize: 11,
      fontWeight: "700" as const,
    },
    memberMoreBtn: {
      padding: 4,
    },
    inviteBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    inviteBtnText: {
      fontSize: 12,
      fontWeight: "700" as const,
    },
    subscriptionTopRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, marginBottom: 10 },
    premiumBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
    premiumBadgeText: { fontSize: 13, fontWeight: "700" as const },
    activeIndicatorWrap: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5 },
    activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22C55E" },
    activeLabel: { fontSize: 12, fontWeight: "600" as const },
    tierLabel: { fontSize: 16, fontWeight: "700" as const, marginBottom: 2 },
    ownerRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12 },
    ownerText: { fontSize: 14, fontWeight: "600" as const },
    subscriptionNote: { fontSize: 12, lineHeight: 18, marginTop: 4 },
    inactiveLabel: { fontSize: 15, fontWeight: "700" as const },
    deleteBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
    },
    deleteBtnText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: "#DC2626",
      flex: 1,
    },
    sheetRoot: {
      flex: 1,
      justifyContent: "flex-end" as const,
    },
    sheetBackdrop: {
      ...absoluteFill,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      paddingHorizontal: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 20,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center" as const,
      marginTop: 12,
      marginBottom: 16,
    },
    sheetMemberInfo: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingBottom: 14,
    },
    sheetMemberAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    sheetMemberName: {
      fontSize: 16,
      fontWeight: "700" as const,
    },
    sheetMemberRole: {
      fontSize: 13,
      marginTop: 2,
    },
    sheetDivider: {
      height: 1,
      marginBottom: 8,
    },
    sheetAction: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingVertical: 14,
    },
    sheetActionText: {
      fontSize: 15,
      fontWeight: "600" as const,
    },
    sheetCancelBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 8,
    },
    sheetCancelText: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
    savedOverlay: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    savedCard: {
      borderRadius: 20,
      padding: 28,
      alignItems: "center" as const,
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
    savedTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
    },
  });
}
