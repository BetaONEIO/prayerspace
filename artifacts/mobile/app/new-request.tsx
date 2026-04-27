import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import ImageAttachment from "@/components/ImageAttachment";
import ImageViewer from "@/components/ImageViewer";
import PrayerDatePicker from "@/components/PrayerDatePicker";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  X,
  Globe,
  Users,
  Ghost,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  CalendarDays,
} from "lucide-react-native";
import { Image } from "expo-image";
const ANON_AVATAR = require("../assets/images/anon_user.png");
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { currentUser } from "@/mocks/data";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { PRAYER_TAGS, AUDIENCE_OPTIONS, type AudienceOption } from "@/constants/prayerContent";
import { formatPrayerDate } from "@/lib/prayerDateUtils";
import { scheduleOwnPrayerReminders } from "@/lib/prayerReminders";

export default function NewRequestScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { addNotification } = useNotifications();
  const [content, setContent] = useState("");
  const [requestImageUri, setRequestImageUri] = useState<string | null>(null);
  const [viewingRequestImage, setViewingRequestImage] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isTimeSensitive, setIsTimeSensitive] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<AudienceOption>(AUDIENCE_OPTIONS[0]);
  const [dateExpanded, setDateExpanded] = useState(false);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const tagsHeightAnim = useRef(new Animated.Value(0)).current;
  const dateHeightAnim = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { DiscardModal } = useUnsavedChangesWarning(content.trim().length > 0);

  useEffect(() => {
    Animated.timing(tagsHeightAnim, {
      toValue: tagsExpanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [tagsExpanded, tagsHeightAnim]);

  useEffect(() => {
    Animated.timing(dateHeightAnim, {
      toValue: dateExpanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [dateExpanded, dateHeightAnim]);

  const handlePost = useCallback(() => {
    if (!content.trim()) {
      Alert.alert("Empty Request", "Please describe your prayer request.");
      return;
    }
    console.log("Post request:", { content, isAnonymous, isTimeSensitive, selectedTags, audience: selectedAudience.key, hasImage: !!requestImageUri, eventDate });
    const senderName = isAnonymous ? "Someone" : currentUser.name;
    const requestId = `request-${Date.now()}`;
    if (eventDate) {
      void scheduleOwnPrayerReminders({
        prayerRequestId: requestId,
        snippet: content.trim(),
        eventDate,
      });
    }
    addNotification({
      type: "request",
      title: `${senderName} posted a prayer request`,
      body: `"${content.trim()}"`,
      time: "Just now",
      avatar: isAnonymous ? undefined : currentUser.avatar,
      unread: true,
    });
    Alert.alert("Posted!", "Your prayer request has been shared.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }, [content, isAnonymous, isTimeSensitive, selectedTags, selectedAudience, eventDate, router, addNotification]);

  const handleTagPress = useCallback((id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  const handleAudienceSelect = useCallback((option: AudienceOption) => {
    setSelectedAudience(option);
    setAudienceOpen(false);
  }, []);

  const canPost = content.trim().length > 0 || !!requestImageUri;

  const tagsSectionMaxHeight = tagsHeightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 240],
  });

  const tagsSectionOpacity = tagsHeightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <X size={18} color={colors.secondaryForeground} />
          </Pressable>

          <Pressable
            style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!canPost}
          >
            <Text style={styles.postBtnText}>Post</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.userRow}>
            <Image source={isAnonymous ? ANON_AVATAR : { uri: currentUser.avatar }} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{isAnonymous ? "Anonymous" : currentUser.name}</Text>
              <Pressable
                style={styles.audienceBtn}
                onPress={() => setAudienceOpen((v) => !v)}
              >
                {selectedAudience.type === "everyone" ? (
                  <Globe size={10} color={colors.primary} />
                ) : (
                  <Users size={10} color={colors.primary} />
                )}
                <Text style={styles.audienceText}>{selectedAudience.label}</Text>
                <ChevronDown size={10} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {audienceOpen && (
            <View style={styles.audienceDropdown}>
              <Text style={styles.audienceDropdownLabel}>Share with</Text>
              {AUDIENCE_OPTIONS.map((option) => {
                const isSelected = selectedAudience.key === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.audienceOption,
                      isSelected && styles.audienceOptionSelected,
                    ]}
                    onPress={() => handleAudienceSelect(option)}
                  >
                    <View
                      style={[
                        styles.audienceOptionIcon,
                        isSelected && styles.audienceOptionIconSelected,
                      ]}
                    >
                      {option.type === "everyone" ? (
                        <Globe size={14} color={isSelected ? colors.primaryForeground : colors.mutedForeground} />
                      ) : (
                        <Users size={14} color={isSelected ? colors.primaryForeground : colors.mutedForeground} />
                      )}
                    </View>
                    <View style={styles.audienceOptionText}>
                      <Text style={[styles.audienceOptionLabel, isSelected && styles.audienceOptionLabelSelected]}>
                        {option.label}
                      </Text>
                      {option.sublabel && (
                        <Text style={styles.audienceOptionSub}>{option.sublabel}</Text>
                      )}
                    </View>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textArea}
              placeholder="What can your community pray for you about?"
              placeholderTextColor={colors.mutedForeground + "60"}
              multiline
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
              testID="request-content"
            />
            {requestImageUri && (
              <View style={styles.requestImagePreview}>
                <ImageAttachment
                  imageUri={requestImageUri}
                  onImageSelected={setRequestImageUri}
                  onRemove={() => setRequestImageUri(null)}
                  onPress={() => setViewingRequestImage(requestImageUri)}
                />
              </View>
            )}
          </View>

          <View style={styles.optionsRow}>
            <ImageAttachment
              imageUri={null}
              onImageSelected={(uri) => setRequestImageUri(uri)}
              onRemove={() => {}}
              chipMode
            />
            <Pressable
              style={[styles.optionChip, isTimeSensitive && styles.optionChipTimeSensitive]}
              onPress={() => setIsTimeSensitive((v) => !v)}
            >
              <Zap size={14} color={isTimeSensitive ? "#B87A00" : colors.mutedForeground} />
              <Text style={[styles.optionChipText, isTimeSensitive && styles.optionChipTextTimeSensitive]}>
                Time Sensitive
              </Text>
            </Pressable>

            <Pressable
              style={[styles.optionChip, isAnonymous && styles.optionChipAnonymous]}
              onPress={() => setIsAnonymous((v) => !v)}
            >
              <Ghost size={14} color={isAnonymous ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.optionChipText, isAnonymous && styles.optionChipTextAnonymous]}>
                Anonymous
              </Text>
            </Pressable>
          </View>

          <View style={styles.dateSection}>
            <Pressable
              style={styles.dateSectionToggle}
              onPress={() => setDateExpanded((v) => !v)}
            >
              <CalendarDays
                size={15}
                color={eventDate ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.dateSectionLabel,
                  eventDate && styles.dateSectionLabelActive,
                ]}
              >
                Prayer date
              </Text>
              {eventDate ? (
                <View style={styles.datePill}>
                  <Text style={styles.datePillText}>
                    {formatPrayerDate(eventDate)}
                  </Text>
                </View>
              ) : null}
              {dateExpanded ? (
                <ChevronUp size={14} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
              ) : (
                <ChevronDown size={14} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
              )}
            </Pressable>

            <Animated.View
              style={[
                styles.dateExpandWrap,
                {
                  maxHeight: dateHeightAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 380],
                  }),
                  opacity: dateHeightAnim,
                  overflow: "hidden",
                },
              ]}
            >
              <View style={{ paddingTop: 10 }}>
                <PrayerDatePicker value={eventDate} onChange={setEventDate} />
              </View>
            </Animated.View>
          </View>

          <View style={styles.tagsSection}>
            <Pressable
              style={styles.tagsToggleRow}
              onPress={() => setTagsExpanded((v) => !v)}
            >
              <Text style={styles.tagsLabel}>Add tags</Text>
              <View style={styles.tagsToggleRight}>
                {selectedTags.length > 0 && (
                  <View style={styles.tagsSelectedPill}>
                    <Text style={styles.tagsSelectedText}>{selectedTags.length} selected</Text>
                  </View>
                )}
                {tagsExpanded ? (
                  <ChevronUp size={14} color={colors.mutedForeground} />
                ) : (
                  <ChevronDown size={14} color={colors.mutedForeground} />
                )}
              </View>
            </Pressable>

            <Animated.View
              style={[
                styles.tagsExpandWrap,
                {
                  maxHeight: tagsSectionMaxHeight,
                  opacity: tagsSectionOpacity,
                  overflow: "hidden",
                },
              ]}
            >
              <View style={styles.tagsList}>
                {PRAYER_TAGS.map((tag) => {
                  const selected = selectedTags.includes(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      style={[styles.tagChip, selected && styles.tagChipSelected]}
                      onPress={() => handleTagPress(tag.id)}
                    >
                      <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                      <Text style={[styles.tagLabel, selected && styles.tagLabelSelected]}>
                        {tag.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </View>

          {selectedTags.length > 0 && (
            <View style={styles.selectedTagsPreview}>
              {selectedTags.map((id) => {
                const tag = PRAYER_TAGS.find((t) => t.id === id);
                if (!tag) return null;
                return (
                  <View key={id} style={styles.selectedTagPill}>
                    <Text style={styles.selectedTagEmoji}>{tag.emoji}</Text>
                    <Text style={styles.selectedTagText}>{tag.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <ImageViewer
        uri={viewingRequestImage}
        visible={!!viewingRequestImage}
        onClose={() => setViewingRequestImage(null)}
      />
    </SafeAreaView>
    {DiscardModal}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "40",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: 0.3,
  },
  postBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  postBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primary + "30",
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  audienceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent + "80",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary + "18",
    alignSelf: "flex-start",
  },
  audienceText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: colors.accentForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
  },
  audienceDropdown: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  audienceDropdownLabel: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  audienceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border + "60",
  },
  audienceOptionSelected: {
    backgroundColor: colors.accent + "40",
  },
  audienceOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  audienceOptionIconSelected: {
    backgroundColor: colors.primary,
  },
  audienceOptionText: {
    flex: 1,
  },
  audienceOptionLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  audienceOptionLabelSelected: {
    color: colors.primary,
  },
  audienceOptionSub: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  inputWrap: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border + "60",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  requestImagePreview: {},
  textArea: {
    flex: 1,
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 26,
    minHeight: 120,
    padding: 0,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionChipTimeSensitive: {
    backgroundColor: colors.accent,
    borderColor: colors.primary + "50",
  },
  optionChipAnonymous: {
    backgroundColor: colors.primary + "12",
    borderColor: colors.primary + "40",
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  optionChipTextTimeSensitive: {
    color: "#B87A00",
    fontWeight: "700" as const,
  },
  optionChipTextAnonymous: {
    color: colors.primary,
    fontWeight: "700" as const,
  },
  dateSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    overflow: "hidden",
  },
  dateSectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateSectionLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.secondaryForeground,
  },
  dateSectionLabelActive: {
    color: colors.primary,
  },
  datePill: {
    backgroundColor: colors.primary + "14",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  dateExpandWrap: {},
  tagsSection: {
    gap: 10,
  },
  tagsToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tagsLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.secondaryForeground,
  },
  tagsToggleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagsSelectedPill: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagsSelectedText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  tagsExpandWrap: {
    overflow: "hidden",
  },
  tagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tagChipSelected: {
    borderColor: colors.primary + "60",
    backgroundColor: colors.primary + "18",
  },
  tagEmoji: {
    fontSize: 13,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.secondaryForeground,
  },
  tagLabelSelected: {
    color: colors.primary,
    fontWeight: "700" as const,
  },
  selectedTagsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary + "12",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  selectedTagEmoji: {
    fontSize: 12,
  },
  selectedTagText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.primary,
  },
});
