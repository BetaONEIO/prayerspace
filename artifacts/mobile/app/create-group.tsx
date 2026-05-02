import React, { useState, useCallback, useRef, useMemo} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
  Modal,
  Animated,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Pen,
  ShieldCheck,
  Lock,
  Globe,
  CheckCircle,
  Users,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import PhotoUploadModal from "@/components/PhotoUploadModal";

type Step = 1 | 2;
type FocusCategory = "Prayer" | "Bible Study" | "Support" | "Testimony";
type PrivacyType = "Private" | "Public";

interface FocusOption {
  id: FocusCategory;
  emoji: string;
  label: string;
}

const FOCUS_OPTIONS: FocusOption[] = [
  { id: "Prayer", emoji: "🙏", label: "Prayer" },
  { id: "Bible Study", emoji: "📖", label: "Bible Study" },
  { id: "Support", emoji: "🤝", label: "Support" },
  { id: "Testimony", emoji: "✨", label: "Testimony" },
];

export default function CreateGroupScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<Step>(1);
  const [groupName, setGroupName] = useState<string>("");
  const [selectedFocus, setSelectedFocus] = useState<FocusCategory | null>(null);
  const [safeSpaceEnabled, setSafeSpaceEnabled] = useState<boolean>(true);
  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyType>("Private");
  const [groupPhotoUri, setGroupPhotoUri] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState<boolean>(false);
  const [showCreatedModal, setShowCreatedModal] = useState<boolean>(false);
  const [showNameAlert, setShowNameAlert] = useState<boolean>(false);
  const nameAlertFade = useRef(new Animated.Value(0)).current;
  const nameAlertScale = useRef(new Animated.Value(0.92)).current;
  const createdModalFade = useRef(new Animated.Value(0)).current;
  const createdModalScale = useRef(new Animated.Value(0.85)).current;

  const openNameAlert = useCallback(() => {
    setShowNameAlert(true);
    Animated.parallel([
      Animated.timing(nameAlertFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(nameAlertScale, {
        toValue: 1,
        damping: 20,
        stiffness: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [nameAlertFade, nameAlertScale]);

  const closeNameAlert = useCallback(() => {
    Animated.parallel([
      Animated.timing(nameAlertFade, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(nameAlertScale, {
        toValue: 0.92,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setShowNameAlert(false));
  }, [nameAlertFade, nameAlertScale]);

  const openCreatedModal = useCallback(() => {
    setShowCreatedModal(true);
    Animated.parallel([
      Animated.timing(createdModalFade, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(createdModalScale, {
        toValue: 1,
        damping: 18,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [createdModalFade, createdModalScale]);

  const handleGoToGroup = useCallback(() => {
    setShowCreatedModal(false);
    router.replace({ pathname: "/(tabs)/community", params: { tab: "Groups" } });
  }, [router]);

  const handleNext = useCallback(() => {
    if (step === 1) {
      if (!groupName.trim()) {
        openNameAlert();
        return;
      }
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(2);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
    } else {
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log("Creating group:", { groupName, selectedFocus, safeSpaceEnabled, selectedPrivacy, groupPhotoUri });
      openCreatedModal();
    }
  }, [step, groupName, selectedFocus, safeSpaceEnabled, selectedPrivacy, groupPhotoUri, openCreatedModal]);

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
    } else {
      router.back();
    }
  }, [step, router]);

  const handleFocusSelect = useCallback((focus: FocusCategory) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedFocus((prev) => (prev === focus ? null : focus));
  }, []);

  const handlePrivacySelect = useCallback((privacy: PrivacyType) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedPrivacy(privacy);
  }, []);

  const handleGroupPhotoSelected = useCallback((uri: string) => {
    console.log("[CreateGroup] Photo selected:", uri);
    setGroupPhotoUri(uri);
    setShowPhotoModal(false);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={handleBack}>
            <ChevronLeft size={20} color={colors.secondaryForeground} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Group Setup</Text>
            <View style={styles.stepDots}>
              {([1, 2] as Step[]).map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    s === step && styles.stepDotActive,
                    s < step && styles.stepDotDone,
                  ]}
                />
              ))}
            </View>
          </View>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <AutoScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <>
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>Build your Group</Text>
                <Text style={styles.heroSubtitle}>
                  Every great prayer group starts with a clear vision. Let's set yours up.
                </Text>
              </View>

              <Pressable style={styles.imagePickerWrap} onPress={() => setShowPhotoModal(true)} testID="group-photo-btn">
                {groupPhotoUri ? (
                  <Image source={{ uri: groupPhotoUri }} style={styles.imagePickerPhoto} />
                ) : (
                  <View style={styles.imagePicker}>
                    <Camera size={44} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.imageEditBadge}>
                  <Pen size={14} color={colors.primaryForeground} />
                </View>
              </Pressable>

              <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>GROUP NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Sunday Morning Grace Circle"
                  placeholderTextColor={colors.mutedForeground + "70"}
                  value={groupName}
                  onChangeText={setGroupName}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>FOCUS CATEGORY</Text>
                <View style={styles.focusGrid}>
                  {FOCUS_OPTIONS.map((option) => {
                    const isSelected = selectedFocus === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        style={[styles.focusOption, isSelected && styles.focusOptionSelected]}
                        onPress={() => handleFocusSelect(option.id)}
                      >
                        <Text style={styles.focusEmoji}>{option.emoji}</Text>
                        <Text style={[styles.focusLabel, isSelected && styles.focusLabelSelected]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.safeSpaceCard}>
                <View style={styles.safeSpaceIconWrap}>
                  <ShieldCheck size={20} color={colors.primary} />
                </View>
                <View style={styles.safeSpaceText}>
                  <Text style={styles.safeSpaceTitle}>Safe Space Policy</Text>
                  <Text style={styles.safeSpaceDesc}>
                    Enable group moderation to keep prayers respectful and private.
                  </Text>
                </View>
                <Switch
                  value={safeSpaceEnabled}
                  onValueChange={(val) => {
                    if (Platform.OS !== "web") void Haptics.selectionAsync();
                    setSafeSpaceEnabled(val);
                  }}
                  trackColor={{ false: colors.muted, true: colors.primary }}
                  thumbColor={colors.card}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>Privacy & Rules</Text>
                <Text style={styles.heroSubtitle}>
                  Control who can see and join your circle of prayer.
                </Text>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>PRIVACY LEVEL</Text>
                <View style={styles.privacyCards}>
                  <Pressable
                    style={[
                      styles.privacyCard,
                      selectedPrivacy === "Private" && styles.privacyCardSelected,
                    ]}
                    onPress={() => handlePrivacySelect("Private")}
                  >
                    <View
                      style={[
                        styles.privacyCardIcon,
                        selectedPrivacy === "Private"
                          ? styles.privacyCardIconSelected
                          : styles.privacyCardIconDefault,
                      ]}
                    >
                      <Lock
                        size={18}
                        color={selectedPrivacy === "Private" ? colors.primary : colors.mutedForeground}
                      />
                    </View>
                    <View style={styles.privacyCardBody}>
                      <Text style={styles.privacyCardTitle}>Private Group</Text>
                      <Text style={styles.privacyCardDesc}>
                        Invitation only. Perfect for family, close friends, or small church groups.
                      </Text>
                    </View>
                    <View style={[styles.radio, selectedPrivacy === "Private" && styles.radioActive]}>
                      {selectedPrivacy === "Private" && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.privacyCard,
                      selectedPrivacy === "Public" && styles.privacyCardSelected,
                    ]}
                    onPress={() => handlePrivacySelect("Public")}
                  >
                    <View
                      style={[
                        styles.privacyCardIcon,
                        selectedPrivacy === "Public"
                          ? styles.privacyCardIconSelected
                          : styles.privacyCardIconDefault,
                      ]}
                    >
                      <Globe
                        size={18}
                        color={selectedPrivacy === "Public" ? colors.primary : colors.mutedForeground}
                      />
                    </View>
                    <View
                      style={[
                        styles.privacyCardBody,
                        selectedPrivacy !== "Public" && styles.privacyCardBodyDim,
                      ]}
                    >
                      <Text style={styles.privacyCardTitle}>Public Group</Text>
                      <Text style={styles.privacyCardDesc}>
                        Visible to everyone. Great for global causes or open study.
                      </Text>
                    </View>
                    <View style={[styles.radio, selectedPrivacy === "Public" && styles.radioActive]}>
                      {selectedPrivacy === "Public" && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                </View>
              </View>


            </>
          )}
        </AutoScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {step === 1 ? "Next: Privacy" : "Create Group"}
            </Text>
            <ChevronRight size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showNameAlert}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <Animated.View style={[styles.alertOverlay, { opacity: nameAlertFade }]}>
          <Animated.View style={[styles.alertCard, { transform: [{ scale: nameAlertScale }] }]}>
            <View style={styles.alertIconWrap}>
              <Text style={styles.alertIcon}>✏️</Text>
            </View>
            <Text style={styles.alertTitle}>Group Name Required</Text>
            <Text style={styles.alertMessage}>Please give your group a name to continue.</Text>
            <Pressable style={styles.alertBtn} onPress={closeNameAlert}>
              <Text style={styles.alertBtnText}>Got it</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>

      <PhotoUploadModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onImageSelected={handleGroupPhotoSelected}
        onRemovePhoto={groupPhotoUri ? () => { setGroupPhotoUri(null); setShowPhotoModal(false); } : undefined}
        hasExistingPhoto={!!groupPhotoUri}
      />

      <Modal
        visible={showCreatedModal}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        <Animated.View style={[styles.createdOverlay, { opacity: createdModalFade }]}>
          <Animated.View style={[styles.createdCard, { transform: [{ scale: createdModalScale }] }]}>
            <View style={styles.createdCheckWrap}>
              <CheckCircle size={48} color={colors.primary} />
            </View>

            <Text style={styles.createdTitle}>Group Created!</Text>

            {groupPhotoUri ? (
              <Image source={{ uri: groupPhotoUri }} style={styles.createdGroupPhoto} />
            ) : (
              <View style={styles.createdGroupPhotoPlaceholder}>
                <Users size={32} color={colors.primary} />
              </View>
            )}

            <Text style={styles.createdGroupName}>{groupName}</Text>
            <Text style={styles.createdSubtext}>Your prayer group is ready. Invite others to join!</Text>

            <Pressable style={styles.createdGoBtn} onPress={handleGoToGroup}>
              <Text style={styles.createdGoBtnText}>Go to Group</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerCenter: {
    alignItems: "center" as const,
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  stepDots: {
    flexDirection: "row" as const,
    gap: 5,
    alignItems: "center" as const,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  stepDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: colors.primary + "60",
  },
  skipText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 28,
  },
  heroText: {
    gap: 8,
    paddingTop: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.6,
    textAlign: "center" as const,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  imagePickerWrap: {
    alignSelf: "center" as const,
    position: "relative" as const,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderStyle: "dashed" as const,
    borderColor: colors.primary + "50",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  imagePickerPhoto: {
    width: 120,
    height: 120,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: colors.primary + "30",
  },
  imageEditBadge: {
    position: "absolute" as const,
    bottom: -6,
    right: -6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 3,
    borderColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  formSection: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1.5,
    paddingHorizontal: 2,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    color: colors.foreground,
    fontWeight: "500" as const,
  },
  focusGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 12,
  },
  focusOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    flex: 1,
    minWidth: "45%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  focusOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  focusEmoji: {
    fontSize: 20,
  },
  focusLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
  },
  focusLabelSelected: {
    color: colors.foreground,
  },
  safeSpaceCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: colors.primary + "08",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.primary + "18",
  },
  safeSpaceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  safeSpaceText: {
    flex: 1,
    gap: 3,
  },
  safeSpaceTitle: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: colors.foreground,
  },
  safeSpaceDesc: {
    fontSize: 11,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
  privacyCards: {
    gap: 12,
  },
  privacyCard: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  privacyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "06",
  },
  privacyCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  privacyCardIconSelected: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  privacyCardIconDefault: {
    backgroundColor: colors.secondary,
  },
  privacyCardBody: {
    flex: 1,
    gap: 4,
  },
  privacyCardBodyDim: {
    opacity: 0.55,
  },
  privacyCardTitle: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: colors.foreground,
  },
  privacyCardDesc: {
    fontSize: 11,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
    marginTop: 2,
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  nextBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.primaryForeground,
    letterSpacing: 0.2,
  },
  createdOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 32,
  },
  createdCard: {
    backgroundColor: colors.background,
    borderRadius: 32,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: "center" as const,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  createdCheckWrap: {
    marginBottom: 16,
  },
  createdTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  createdGroupPhoto: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: colors.primary + "25",
    marginBottom: 14,
  },
  createdGroupPhotoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colors.primary + "20",
  },
  createdGroupName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.foreground,
    textAlign: "center" as const,
    marginBottom: 6,
  },
  createdSubtext: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 19,
    marginBottom: 28,
  },
  createdGoBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
    width: "100%",
    alignItems: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  createdGoBtnText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.primaryForeground,
    letterSpacing: 0.2,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(58,47,41,0.45)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 40,
  },
  alertCard: {
    backgroundColor: colors.background,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: "center" as const,
    width: "100%",
    maxWidth: 320,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  alertIcon: {
    fontSize: 26,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: "center" as const,
  },
  alertMessage: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 19,
    marginBottom: 24,
  },
  alertBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 999,
    width: "100%",
    alignItems: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  alertBtnText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: colors.primaryForeground,
    letterSpacing: 0.2,
  },
});
