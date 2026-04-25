import React, { useState, useCallback, useRef, useEffect } from "react";
import ImageAttachment from "@/components/ImageAttachment";
import ImageViewer from "@/components/ImageViewer";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  X,
  Globe,
  ChevronDown,
  Users,
  Check,
  Ghost,
  Zap,
  Tag,
} from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { currentUser } from "@/mocks/data";
import { PRAYER_TAGS, AUDIENCE_OPTIONS, type AudienceOption } from "@/constants/prayerContent";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_CHARS = 280;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (text: string, tags: string[], isTimeSensitive: boolean, isAnonymous: boolean, imageUri?: string | null) => void;
}

export default function StatusUpdateModal({ visible, onClose, onSubmit }: Props) {
  const colors = useThemeColors();
  const [text, setText] = useState<string>("");
  const [statusImageUri, setStatusImageUri] = useState<string | null>(null);
  const [viewingStatusImage, setViewingStatusImage] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagsExpanded, setTagsExpanded] = useState<boolean>(false);
  const [audienceOpen, setAudienceOpen] = useState<boolean>(false);
  const [selectedAudience, setSelectedAudience] = useState<AudienceOption>(AUDIENCE_OPTIONS[0]);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [isTimeSensitive, setIsTimeSensitive] = useState<boolean>(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tagRotate = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setText("");
      setSelectedTags([]);
      setTagsExpanded(false);
      setAudienceOpen(false);
      setSelectedAudience(AUDIENCE_OPTIONS[0]);
      setIsAnonymous(false);
      setIsTimeSensitive(false);
      setStatusImageUri(null);
      Animated.timing(tagRotate, { toValue: 0, duration: 0, useNativeDriver: true }).start();
    }, 300);
  }, [onClose, tagRotate]);

  const handleSubmit = useCallback(() => {
    if (!text.trim() && selectedTags.length === 0 && !statusImageUri) return;
    console.log("Status update submitted:", { text, tags: selectedTags, audience: selectedAudience.key, isAnonymous, isTimeSensitive, hasImage: !!statusImageUri });
    onSubmit?.(text, selectedTags, isTimeSensitive, isAnonymous, statusImageUri);
    handleClose();
  }, [text, selectedTags, onSubmit, handleClose, selectedAudience, isAnonymous, isTimeSensitive]);

  const handleTagPress = useCallback((id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  const handleTagsToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTagsExpanded((prev) => {
      Animated.timing(tagRotate, {
        toValue: prev ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return !prev;
    });
  }, [tagRotate]);

  const handleAudienceSelect = useCallback((option: AudienceOption) => {
    setSelectedAudience(option);
    setAudienceOpen(false);
  }, []);

  const remaining = MAX_CHARS - text.length;
  const isOverLimit = remaining < 0;
  const canSubmit = (text.trim().length > 0 || selectedTags.length > 0 || !!statusImageUri) && !isOverLimit;

  const chevronRotation = tagRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 24 }]}
          >
            <View style={styles.dragHandle} />

            <View style={styles.header}>
              <Pressable style={styles.closeBtn} onPress={handleClose}>
                <X size={18} color={Colors.secondaryForeground} />
              </Pressable>
              <Text style={styles.title}>Update Status</Text>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.userRow}>
                <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {isAnonymous ? "Anonymous" : currentUser.name}
                  </Text>
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
                          <Text
                            style={[
                              styles.audienceOptionLabel,
                              isSelected && styles.audienceOptionLabelSelected,
                            ]}
                          >
                            {option.label}
                          </Text>
                          {option.sublabel && (
                            <Text style={styles.audienceOptionSub}>{option.sublabel}</Text>
                          )}
                        </View>
                        {isSelected && (
                          <Check size={16} color={Colors.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {selectedTags.length > 0 && (
                <View style={styles.selectedTagsRow}>
                  {selectedTags.map((tagId) => {
                    const tag = PRAYER_TAGS.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <Pressable
                        key={tag.id}
                        style={styles.selectedTagPill}
                        onPress={() => handleTagPress(tag.id)}
                      >
                        <Text style={styles.selectedTagEmoji}>{tag.emoji}</Text>
                        <Text style={styles.selectedTagText}>{tag.label}</Text>
                        <X size={10} color={Colors.primary} strokeWidth={3} />
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="What's your prayer focus right now?"
                  placeholderTextColor={Colors.mutedForeground + "88"}
                  multiline
                  maxLength={MAX_CHARS + 10}
                  value={text}
                  onChangeText={setText}
                  textAlignVertical="top"
                />
                {statusImageUri && (
                  <View style={styles.statusImagePreview}>
                    <ImageAttachment
                      imageUri={statusImageUri}
                      onImageSelected={setStatusImageUri}
                      onRemove={() => setStatusImageUri(null)}
                    />
                    <Pressable
                      onPress={() => setViewingStatusImage(statusImageUri)}
                      style={StyleSheet.absoluteFill}
                    />
                  </View>
                )}
                <Text
                  style={[styles.charCount, isOverLimit && styles.charCountOver]}
                >
                  {text.length} / {MAX_CHARS}
                </Text>
              </View>

              <View style={styles.optionsRow}>
                <ImageAttachment
                  imageUri={null}
                  onImageSelected={(uri) => setStatusImageUri(uri)}
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

              <View style={styles.tagsSection}>
                <Pressable style={styles.tagsToggleRow} onPress={handleTagsToggle}>
                  <View style={styles.tagsToggleLeft}>
                    <View style={styles.tagsToggleIcon}>
                      <Tag size={14} color={Colors.primary} />
                    </View>
                    <Text style={styles.tagsToggleLabel}>
                      Add a tag{selectedTags.length > 0 ? ` · ${selectedTags.length} selected` : ""}
                    </Text>
                  </View>
                  <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                    <ChevronDown size={16} color={Colors.mutedForeground} />
                  </Animated.View>
                </Pressable>

                {tagsExpanded && (
                  <View style={styles.tagsWrap}>
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
                )}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={styles.submitText}>Update Status</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
      <ImageViewer
        uri={viewingStatusImage}
        visible={!!viewingStatusImage}
        onClose={() => setViewingStatusImage(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#FAF8F5",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
    maxHeight: "92%",
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  headerSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.primary + "30",
  },
  userName: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: Colors.foreground,
    textTransform: "uppercase",
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
    textTransform: "uppercase",
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
    textTransform: "uppercase",
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
  selectedTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.primary + "18",
    borderWidth: 1.5,
    borderColor: Colors.primary + "50",
  },
  selectedTagEmoji: {
    fontSize: 12,
  },
  selectedTagText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  inputWrap: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 18,
    minHeight: 130,
    position: "relative" as const,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 12,
  },
  statusImagePreview: {
    position: "relative" as const,
  },
  input: {
    fontSize: 15,
    color: Colors.foreground,
    fontWeight: "500" as const,
    minHeight: 90,
    paddingBottom: 24,
  },
  charCount: {
    position: "absolute",
    bottom: 12,
    right: 16,
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.mutedForeground + "88",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  charCountOver: {
    color: Colors.destructive,
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
  tagsSection: {
    backgroundColor: Colors.secondary + "60",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border + "60",
    overflow: "hidden",
  },
  tagsToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tagsToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tagsToggleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  tagsToggleLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.foreground,
  },
  tagsWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.secondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tagChipSelected: {
    backgroundColor: Colors.primary + "18",
    borderColor: Colors.primary + "60",
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
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  submitBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: Colors.primaryForeground,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
});
