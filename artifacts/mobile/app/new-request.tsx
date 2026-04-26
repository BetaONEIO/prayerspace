import React, { useState, useCallback, useRef, useEffect } from "react";
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
import { LightColors as Colors } from "@/constants/colors";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { currentUser } from "@/mocks/data";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { PRAYER_TAGS, AUDIENCE_OPTIONS, type AudienceOption } from "@/constants/prayerContent";
import { formatPrayerDate } from "@/lib/prayerDateUtils";

export default function NewRequestScreen() {
  const router = useRouter();
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

  useUnsavedChangesWarning(content.trim().length > 0);

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
            <X size={18} color={Colors.secondaryForeground} />
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
            <Image source={{ uri: currentUser.avatar }} style={styles.userAvatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{isAnonymous ? "Anonymous" : currentUser.name}</Text>
              <Pressable
                style={styles.audienceBtn}
                onPress={() => setAudienceOpen((v) => !v)}
              >
                {selectedAudience.type === "everyone" ? (
                  <Globe size={10} color={Colors.primary} />
                ) : (
                  <Users size={10} color={Colors.primary} />
                )}
                <Text style={styles.audienceText}>{selectedAudience.label}</Text>
                <ChevronDown size={10} color={Colors.mutedForeground} />
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
                        <Globe size={14} color={isSelected ? Colors.primaryForeground : Colors.mutedForeground} />
                      ) : (
                        <Users size={14} color={isSelected ? Colors.primaryForeground : Colors.mutedForeground} />
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
                    {isSelected && <Check size={16} color={Colors.primary} />}
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textArea}
              placeholder="What can your community pray for you about?"
              placeholderTextColor={Colors.mutedForeground + "60"}
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
                />
                <Pressable onPress={() => setViewingRequestImage(requestImageUri)} style={styles.requestImageTap} />
              </View>
            )}
          </View>

          <View style={styles.optionsRow}>
            <ImageAttachment
              imageUri={null}
              onImageSelected={(uri) => setRequestImageUri(uri)}
              onRemove={() => {}}
            />
            <Pressable
              style={[styles.optionChip, isTimeSensitive && styles.optionChipTimeSensitive]}
              onPress={() => setIsTimeSensitive((v) => !v)}
            >
              <Zap size={14} color={isTimeSensitive ? "#B87A00" : Colors.mutedForeground} />
              <Text style={[styles.optionChipText, isTimeSensitive && styles.optionChipTextTimeSensitive]}>
                Time Sensitive
              </Text>
            </Pressable>

            <Pressable
              style={[styles.optionChip, isAnonymous && styles.optionChipAnonymous]}
              onPress={() => setIsAnonymous((v) => !v)}
            >
              <Ghost size={14} color={isAnonymous ? Colors.primary : Colors.mutedForeground} />
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
                color={eventDate ? Colors.primary : Colors.mutedForeground}
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
                <ChevronUp size={14} color={Colors.mutedForeground} style={{ marginLeft: "auto" }} />
              ) : (
                <ChevronDown size={14} color={Colors.mutedForeground} style={{ marginLeft: "auto" }} />
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
                  <ChevronUp size={14} color={Colors.mutedForeground} />
                ) : (
                  <ChevronDown size={14} color={Colors.mutedForeground} />
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
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
    borderBottomColor: Colors.border + "40",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: 0.3,
  },
  postBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: Colors.primary,
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
    color: Colors.primaryForeground,
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
    borderColor: Colors.primary + "30",
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  audienceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent + "80",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary + "18",
    alignSelf: "flex-start",
  },
  audienceText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: Colors.accentForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
  },
  audienceDropdown: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.mutedForeground,
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
    borderTopColor: Colors.border + "60",
  },
  audienceOptionSelected: {
    backgroundColor: Colors.accent + "40",
  },
  audienceOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  audienceOptionIconSelected: {
    backgroundColor: Colors.primary,
  },
  audienceOptionText: {
    flex: 1,
  },
  audienceOptionLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  audienceOptionLabelSelected: {
    color: Colors.primary,
  },
  audienceOptionSub: {
    fontSize: 11,
    color: Colors.mutedForeground,
    marginTop: 1,
  },
  inputWrap: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 20,
    minHeight: 160,
    borderWidth: 1,
    borderColor: Colors.border + "60",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  requestImagePreview: {
    position: "relative" as const,
  },
  requestImageTap: {
    ...StyleSheet.absoluteFillObject,
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    color: Colors.foreground,
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
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionChipTimeSensitive: {
    backgroundColor: "#FFF8E7",
    borderColor: "#F0C040",
  },
  optionChipAnonymous: {
    backgroundColor: Colors.primary + "12",
    borderColor: Colors.primary + "40",
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
  },
  optionChipTextTimeSensitive: {
    color: "#B87A00",
    fontWeight: "700" as const,
  },
  optionChipTextAnonymous: {
    color: Colors.primary,
    fontWeight: "700" as const,
  },
  dateSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.secondaryForeground,
  },
  dateSectionLabelActive: {
    color: Colors.primary,
  },
  datePill: {
    backgroundColor: Colors.primary + "14",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  dateExpandWrap: {},
  tagsSection: {
    gap: 10,
  },
  tagsToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tagsLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.secondaryForeground,
  },
  tagsToggleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagsSelectedPill: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagsSelectedText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.primary,
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
    backgroundColor: Colors.secondary,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tagChipSelected: {
    borderColor: Colors.primary + "60",
    backgroundColor: Colors.primary + "18",
  },
  tagEmoji: {
    fontSize: 13,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.secondaryForeground,
  },
  tagLabelSelected: {
    color: Colors.primary,
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
    backgroundColor: Colors.primary + "12",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  selectedTagEmoji: {
    fontSize: 12,
  },
  selectedTagText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
});
