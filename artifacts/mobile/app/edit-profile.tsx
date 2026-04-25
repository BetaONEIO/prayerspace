import React, { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Camera } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { uploadAvatar } from "@/lib/storage";
import PhotoUploadModal from "@/components/PhotoUploadModal";
import AvatarImage from "@/components/AvatarImage";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";

export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, profile, updateProfile, isUpdatingProfile } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [verse, setVerse] = useState("");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const hasChanges = (profile ? name !== (profile.full_name ?? "") || bio !== (profile.bio ?? "") || verse !== (profile.favorite_verse ?? "") : false) || localAvatarUri !== null;
  useUnsavedChangesWarning(hasChanges);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setBio(profile.bio ?? "");
      setVerse(profile.favorite_verse ?? "");
    } else if (user?.user_metadata?.full_name) {
      setName(user.user_metadata.full_name as string);
    }
  }, [profile, user]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { Alert.alert("Name Required", "Please enter your display name."); return; }
    try {
      await updateProfile({ full_name: name.trim(), bio: bio.trim() || null, favorite_verse: verse.trim() || null });
      Alert.alert("Saved", "Your profile has been updated.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (error: unknown) {
      Alert.alert("Save Failed", error instanceof Error ? error.message : "Please try again.");
    }
  }, [name, bio, verse, updateProfile, router]);

  const imageToBase64 = useCallback(async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  const uploadImageToSupabase = useCallback(async (uri: string): Promise<string | null> => {
    if (!user?.id) return null;
    try {
      return await uploadAvatar(user.id, uri);
    } catch {
      return await imageToBase64(uri);
    }
  }, [user?.id, imageToBase64]);

  const handleImageSelected = useCallback(async (uri: string) => {
    setShowPhotoModal(false);
    setLocalAvatarUri(uri);
    setIsUploadingPhoto(true);
    try {
      const publicUrl = await uploadImageToSupabase(uri);
      if (publicUrl) await updateProfile({ avatar_url: publicUrl });
    } catch (err) {
      Alert.alert("Upload Failed", err instanceof Error ? err.message : "Upload failed.");
      setLocalAvatarUri(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [uploadImageToSupabase, updateProfile]);

  const handleRemovePhoto = useCallback(async () => {
    try {
      await updateProfile({ avatar_url: null });
      setLocalAvatarUri(null);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Please try again.");
    }
  }, [updateProfile]);

  const hasExistingPhoto = !!(localAvatarUri ?? profile?.avatar_url);
  const displayEmail = user?.email ?? "";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} disabled={isUpdatingProfile}>
              <ChevronLeft size={20} color={colors.secondaryForeground} />
            </Pressable>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Pressable style={styles.doneBtn} onPress={handleSave} disabled={isUpdatingProfile || isUploadingPhoto}>
              {isUpdatingProfile ? <ActivityIndicator size="small" color={colors.primaryForeground} /> : <Text style={styles.doneBtnText}>SAVE</Text>}
            </Pressable>
          </View>

          <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.avatarSection}>
              <Pressable style={styles.avatarWrap} onPress={() => setShowPhotoModal(true)} testID="change-photo-btn">
                <AvatarImage avatarPath={localAvatarUri ?? profile?.avatar_url} fallbackSeed={name || "U"} style={styles.avatar} />
                {isUploadingPhoto ? (
                  <View style={[styles.cameraBtn, styles.cameraBtnLoading]}><ActivityIndicator size="small" color={colors.primaryForeground} /></View>
                ) : (
                  <View style={styles.cameraBtn}><Camera size={14} color={colors.primaryForeground} /></View>
                )}
              </Pressable>
              <Pressable onPress={() => setShowPhotoModal(true)}>
                <Text style={styles.changeText}>{isUploadingPhoto ? "UPLOADING…" : "CHANGE PHOTO"}</Text>
              </Pressable>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.mutedForeground + "80"} editable={!isUpdatingProfile} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput style={[styles.input, styles.inputReadOnly]} value={displayEmail} editable={false} placeholder="Your email" placeholderTextColor={colors.mutedForeground + "80"} />
                <Text style={styles.fieldHint}>Email cannot be changed here</Text>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>BIO</Text>
                <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} placeholder="A short bio about yourself..." placeholderTextColor={colors.mutedForeground + "80"} multiline textAlignVertical="top" maxLength={200} editable={!isUpdatingProfile} />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>FAVORITE VERSE</Text>
                <TextInput style={styles.input} value={verse} onChangeText={setVerse} placeholder="e.g. Philippians 4:13" placeholderTextColor={colors.mutedForeground + "80"} editable={!isUpdatingProfile} />
              </View>
            </View>
          </AutoScrollView>
        </KeyboardAvoidingView>

        <PhotoUploadModal visible={showPhotoModal} onClose={() => setShowPhotoModal(false)} onImageSelected={handleImageSelected} onRemovePhoto={handleRemovePhoto} hasExistingPhoto={hasExistingPhoto} isUploading={isUploadingPhoto} />
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
    doneBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, minWidth: 64, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    doneBtnText: { fontSize: 11, fontWeight: "800" as const, color: colors.primaryForeground, letterSpacing: 0.5 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    avatarSection: { alignItems: "center" as const, paddingVertical: 24, gap: 12 },
    avatarWrap: { position: "relative" as const },
    avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: colors.card },
    cameraBtn: { position: "absolute" as const, bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
    cameraBtnLoading: { backgroundColor: colors.mutedForeground },
    changeText: { fontSize: 10, fontWeight: "700" as const, color: colors.primary, letterSpacing: 1.5 },
    form: { gap: 22 },
    field: { gap: 8 },
    label: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.5, paddingHorizontal: 4 },
    fieldHint: { fontSize: 11, color: colors.mutedForeground, paddingHorizontal: 4, marginTop: 2 },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border + "90", borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16, fontSize: 15, color: colors.foreground },
    inputReadOnly: { opacity: 0.6 },
    textArea: { minHeight: 100, textAlignVertical: "top" as const },
  });
}
