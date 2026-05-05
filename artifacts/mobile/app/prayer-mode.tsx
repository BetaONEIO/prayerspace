import React, { useState, useRef, useEffect, useCallback, useMemo} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  TextInput,
  ScrollView,
  Platform,
  LayoutAnimation,
  UIManager,
  KeyboardAvoidingView,
  StatusBar,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { AutoScrollView } from '@/components/AutoScrollView';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Mic,
  AlignLeft,
  Check,
  ArrowLeft,
  PenLine,
  Edit2,
  ArrowRight,
  Send,
  X,
  Rss,
  Tag,
  ChevronDown,
  CalendarDays,
  Square,
  Pause,
  Play,
  Zap,
  Ghost,
  ImagePlus,
  X as XIcon,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useRouter, Stack, useLocalSearchParams } from "expo-router";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import ThemedSwitch from "@/components/ThemedSwitch";
import PrayerDatePicker from "@/components/PrayerDatePicker";
import { formatPrayerDate } from "@/lib/prayerDateUtils";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useSelectedRecipients } from "@/providers/SelectedRecipientsProvider";
import { useAudioRecording } from "@/hooks/useAudioRecording";

type PrayTab = "text" | "voice";

const PRAYER_TAGS = [
  { id: "prayer_request", label: "Prayer Request", emoji: "🙏" },
  { id: "urgent", label: "Urgent Prayer Request", emoji: "⚡" },
  { id: "praise", label: "Praise Report", emoji: "🎉" },
  { id: "testimony", label: "Testimony", emoji: "✨" },
  { id: "update", label: "Update", emoji: "📣" },
  { id: "gratitude", label: "Gratitude", emoji: "💛" },
  { id: "healing", label: "Healing", emoji: "💚" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { id: "work", label: "Work", emoji: "💼" },
  { id: "church", label: "Church", emoji: "⛪" },
  { id: "guidance", label: "Guidance", emoji: "🧭" },
  { id: "provision", label: "Provision", emoji: "🌾" },
];

export default function PrayerModeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ transcript?: string }>();
  const incomingTranscript = params.transcript ?? "";

  const [activeTab, setActiveTab] = useState<PrayTab>(incomingTranscript ? "voice" : "text");
  const [textPrayer, setTextPrayer] = useState("");
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sendToFeed, setSendToFeed] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [isTimeSensitive, setIsTimeSensitive] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [dateExpanded, setDateExpanded] = useState(false);
  const [isPhotoPickerVisible, setIsPhotoPickerVisible] = useState(false);
  const tagRotate = useRef(new Animated.Value(0)).current;
  const dateAnim = useRef(new Animated.Value(0)).current;

  const { selectedRecipients, selectedIds, toggleRecipient, setDraftPrayerText, setFeedPostMeta } = useSelectedRecipients();
  const { isRecording, duration, startRecording: startAudioRecording, stopRecording: stopAudioRecording } = useAudioRecording();

  const insets = useSafeAreaInsets();
  const [isPaused, setIsPaused] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(!!incomingTranscript);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeTranscription, setIncludeTranscription] = useState(!!incomingTranscript);

  const hasUnsavedWork = textPrayer.trim().length > 0 || attachedPhotos.length > 0 || hasRecorded || isRecording || !!incomingTranscript;
  const { DiscardModal } = useUnsavedChangesWarning(hasUnsavedWork);
  const [voiceTranscript, setVoiceTranscript] = useState<string>(incomingTranscript);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [draftTranscript, setDraftTranscript] = useState<string>("");
  const editInputRef = useRef<TextInput>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(rippleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(rippleAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseLoop.current?.stop();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isRecording, isPaused, pulseAnim, rippleAnim]);

  useEffect(() => {
    Animated.timing(dateAnim, {
      toValue: dateExpanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [dateExpanded, dateAnim]);

  const handleStartRecording = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsPaused(false);
    setHasRecorded(false);
    setVoiceTranscript("");
    setIncludeAudio(true);
    setIncludeTranscription(false);
    await startAudioRecording();
  }, [startAudioRecording]);

  const handlePauseRecording = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused((p) => !p);
  }, []);


  const handleStopRecording = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const uri = await stopAudioRecording();
    setIsPaused(false);
    setHasRecorded(true);
    console.log("[PrayerMode] Recorded audio URI:", uri);
    router.push({ pathname: "/voice-transcript-review" as never, params: { duration: String(duration), audioUri: uri ?? "" } });
  }, [router, stopAudioRecording, duration]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const toggleTab = useCallback((tab: PrayTab) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setActiveTab(tab);
  }, []);

  const handleTagsToggle = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTagsExpanded((prev) => !prev);
    Animated.timing(tagRotate, {
      toValue: tagsExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [tagsExpanded, tagRotate]);

  const handleTagToggle = useCallback((tagId: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }, []);

  const handleAttachPhoto = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setIsPhotoPickerVisible(true);
  }, []);

  const handlePickFromCamera = useCallback(async () => {
    setIsPhotoPickerVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setAttachedPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }, []);

  const handlePickFromLibrary = useCallback(async () => {
    setIsPhotoPickerVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setAttachedPhotos((prev) => [...prev, ...uris].slice(0, 4));
    }
  }, []);

  const handleRemovePhoto = useCallback((uri: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setAttachedPhotos((prev) => prev.filter((p) => p !== uri));
  }, []);

  const handleConfirm = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const transcriptText = activeTab === "voice" && includeTranscription ? voiceTranscript : "";
    const text = activeTab === "voice" ? transcriptText : textPrayer;
    setDraftPrayerText(text);
    setFeedPostMeta({
      isAnonymous,
      tags: selectedTags,
      eventDate: eventDate ?? null,
      photoUrls: attachedPhotos,
    });
    router.push({
      pathname: "/delivery-explanation" as never,
      params: {
        contacts: JSON.stringify(selectedIds),
        tags: JSON.stringify(selectedTags),
        sendToFeed: String(sendToFeed),
        isTimeSensitive: String(isTimeSensitive),
        isAnonymous: String(isAnonymous),
        eventDate: String(eventDate ?? ""),
        photoUrls: JSON.stringify(attachedPhotos),
        includeAudio: String(activeTab === "voice" ? includeAudio : false),
        includeTranscription: String(activeTab === "voice" ? includeTranscription : false),
      },
    });
  }, [textPrayer, voiceTranscript, activeTab, selectedIds, selectedTags, sendToFeed, isTimeSensitive, isAnonymous, eventDate, includeAudio, includeTranscription, router, setDraftPrayerText, setFeedPostMeta]);

  const handleRemoveRecipient = useCallback((id: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    toggleRecipient(id);
  }, [toggleRecipient]);

  const handleOpenEditModal = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setDraftTranscript(voiceTranscript);
    setIsEditModalVisible(true);
  }, [voiceTranscript]);

  const handleSaveEditModal = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setVoiceTranscript(draftTranscript);
    setIsEditModalVisible(false);
  }, [draftTranscript]);

  const handleCancelEditModal = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setIsEditModalVisible(false);
  }, []);

  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.1, 0] });

  const hasSelected = selectedIds.length > 0;
  const voiceSelectionValid = activeTab !== "voice" || !hasRecorded || includeAudio || includeTranscription;
  const canConfirm = (hasSelected || sendToFeed) && voiceSelectionValid;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <Text style={styles.headerTitle}>Pray</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabTrack}>
          <Pressable
            style={[styles.tabButton, activeTab === "text" && styles.tabButtonActive]}
            onPress={() => toggleTab("text")}
          >
            <PenLine size={18} color={activeTab === "text" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, activeTab === "text" && styles.tabLabelActive]}>Text</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "voice" && styles.tabButtonActive]}
            onPress={() => toggleTab("voice")}
          >
            <Mic size={18} color={activeTab === "voice" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabLabel, activeTab === "voice" && styles.tabLabelActive]}>Voice</Text>
          </Pressable>
        </View>
        <Text style={styles.tabSubtitle}>
          Share a prayer request, a praise report, or simply give thanks — whatever's on your heart, you can share it here.
        </Text>
      </View>

      <AutoScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {selectedTags.length > 0 && (
          <View style={styles.selectedTagsRow}>
            {selectedTags.map((tagId) => {
              const tag = PRAYER_TAGS.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <Pressable
                  key={tag.id}
                  style={styles.selectedTagPill}
                  onPress={() => handleTagToggle(tag.id)}
                >
                  <Text style={styles.selectedTagEmoji}>{tag.emoji}</Text>
                  <Text style={styles.selectedTagText}>{tag.label}</Text>
                  <X size={10} color={colors.primary} strokeWidth={3} />
                </Pressable>
              );
            })}
          </View>
        )}

        {attachedPhotos.length > 0 && (
          <View style={styles.photosRow}>
            {attachedPhotos.map((uri) => (
              <View key={uri} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoThumbImg} contentFit="cover" />
                <Pressable style={styles.photoRemoveBtn} onPress={() => handleRemovePhoto(uri)}>
                  <XIcon size={10} color="#fff" strokeWidth={3} />
                </Pressable>
              </View>
            ))}
            {attachedPhotos.length < 4 && (
              <Pressable style={styles.photoAddMore} onPress={handleAttachPhoto}>
                <ImagePlus size={18} color={colors.primary} />
              </Pressable>
            )}
          </View>
        )}

        {activeTab === "voice" ? (
          <View>
          <View style={styles.voiceCenter}>
            {hasRecorded && voiceTranscript ? (
              <>
                <View style={styles.transcriptCard}>
                  <View style={styles.transcriptMicCorner}>
                    <Mic size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.transcriptLabel}>TRANSCRIPTION</Text>
                  <Text style={styles.transcriptBody}>{voiceTranscript}</Text>
                </View>
                <View style={styles.recordedBanner}>
                  <View style={styles.recordedDot} />
                  <Text style={styles.recordedText}>Recording complete</Text>
                  <Pressable
                    style={styles.editBtn}
                    onPress={handleOpenEditModal}
                  >
                    <Edit2 size={12} color={colors.primary} />
                    <Text style={styles.reRecordText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={handleStartRecording}>
                    <Text style={styles.reRecordText}>Re-record</Text>
                  </Pressable>
                </View>

                <View style={styles.includeOptionsSection}>
                  <Text style={styles.includeOptionsLabel}>INCLUDE IN POST</Text>
                  <Pressable
                    style={styles.includeOptionRow}
                    onPress={() => setIncludeAudio((v) => !v)}
                  >
                    <View style={[styles.includeToggleBox, includeAudio && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      {includeAudio && <Check size={11} color="#fff" strokeWidth={3} />}
                    </View>
                    <Mic size={15} color={includeAudio ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.includeOptionText, includeAudio && styles.includeOptionTextActive]}>
                      Audio recording
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.includeOptionRow}
                    onPress={() => setIncludeTranscription((v) => !v)}
                  >
                    <View style={[styles.includeToggleBox, includeTranscription && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      {includeTranscription && <Check size={11} color="#fff" strokeWidth={3} />}
                    </View>
                    <AlignLeft size={15} color={includeTranscription ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.includeOptionText, includeTranscription && styles.includeOptionTextActive]}>
                      Transcription
                    </Text>
                  </Pressable>
                  {!includeAudio && !includeTranscription && (
                    <Text style={styles.includeValidationHint}>Select at least one option</Text>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={styles.timerWrap}>
                  <Text style={styles.timerText}>{formatTime(duration)}</Text>
                  <Text style={styles.timerLabel}>
                    {isRecording && !isPaused
                      ? "RECORDING"
                      : isPaused
                      ? "PAUSED"
                      : hasRecorded
                      ? "COMPLETED"
                      : "READY"}
                  </Text>
                </View>

                <View style={styles.micOuter}>
                  {isRecording && !isPaused && (
                    <Animated.View
                      style={[
                        styles.ripple,
                        { transform: [{ scale: rippleScale }], opacity: rippleOpacity },
                      ]}
                    />
                  )}
                  <Animated.View
                    style={[styles.micBtn, { transform: [{ scale: pulseAnim }] }]}
                  >
                    {!isRecording && !hasRecorded ? (
                      <Pressable style={styles.micBtnInner} onPress={handleStartRecording}>
                        <Mic size={40} color={colors.primaryForeground} />
                      </Pressable>
                    ) : isRecording ? (
                      <View style={styles.micBtnInner}>
                        <Mic size={40} color={colors.primaryForeground} />
                      </View>
                    ) : (
                      <Pressable style={[styles.micBtnInner, styles.micBtnDone]} onPress={handleStartRecording}>
                        <Mic size={40} color={colors.primary} />
                      </Pressable>
                    )}
                  </Animated.View>
                </View>

                {!isRecording && !hasRecorded && (
                  <Text style={styles.tapToRecord}>Tap to start recording</Text>
                )}

                {isRecording && (
                  <View style={styles.recordingControls}>
                    <Pressable style={styles.ctrlBtn} onPress={handlePauseRecording}>
                      {isPaused ? (
                        <Play size={22} color={colors.secondaryForeground} />
                      ) : (
                        <Pause size={22} color={colors.secondaryForeground} />
                      )}
                    </Pressable>
                    <Pressable style={styles.stopBtn} onPress={handleStopRecording}>
                      <Square size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
                      <Text style={styles.stopBtnText}>Stop & Save</Text>
                    </Pressable>
                  </View>
                )}

                {hasRecorded && (
                  <>
                    <View style={styles.recordedBanner}>
                      <View style={styles.recordedDot} />
                      <Text style={styles.recordedText}>
                        Recording complete · {formatTime(duration)}
                      </Text>
                      <Pressable onPress={handleStartRecording}>
                        <Text style={styles.reRecordText}>Re-record</Text>
                      </Pressable>
                    </View>
                    <View style={styles.includeOptionsSection}>
                      <Text style={styles.includeOptionsLabel}>INCLUDE IN POST</Text>
                      <Pressable
                        style={styles.includeOptionRow}
                        onPress={() => setIncludeAudio((v) => !v)}
                      >
                        <View style={[styles.includeToggleBox, includeAudio && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                          {includeAudio && <Check size={11} color="#fff" strokeWidth={3} />}
                        </View>
                        <Mic size={15} color={includeAudio ? colors.primary : colors.mutedForeground} />
                        <Text style={[styles.includeOptionText, includeAudio && styles.includeOptionTextActive]}>
                          Audio recording
                        </Text>
                      </Pressable>
                      {!includeAudio && (
                        <Text style={styles.includeValidationHint}>Select at least one option</Text>
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
          </View>
        ) : (
          <View style={styles.textArea}>
            <TextInput
              style={styles.textInput}
              placeholder="Pour your heart out here..."
              placeholderTextColor={colors.mutedForeground + "50"}
              value={textPrayer}
              onChangeText={setTextPrayer}
              multiline
              textAlignVertical="top"
              autoFocus={false}
            />
          </View>
        )}

        <View style={styles.optionsRow}>
          {attachedPhotos.length < 4 && (
            <Pressable style={styles.attachPhotoBtn} onPress={handleAttachPhoto}>
              <ImagePlus size={16} color={colors.primary} />
            </Pressable>
          )}

          <Pressable
            style={[styles.optionChip, isTimeSensitive && styles.optionChipTimeSensitive]}
            onPress={() => {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              setIsTimeSensitive((v) => !v);
            }}
          >
            <Zap size={14} color={isTimeSensitive ? "#B87A00" : colors.mutedForeground} />
            <Text style={[styles.optionChipText, isTimeSensitive && styles.optionChipTextTimeSensitive]}>
              Time Sensitive
            </Text>
          </Pressable>

          <Pressable
            style={[styles.optionChip, isAnonymous && styles.optionChipAnonymous]}
            onPress={() => {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              setIsAnonymous((v) => !v);
            }}
          >
            <Ghost size={14} color={isAnonymous ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.optionChipText, isAnonymous && styles.optionChipTextAnonymous]}>
              Anonymous
            </Text>
          </Pressable>
        </View>

        <View style={styles.tagsSection}>
          <Pressable style={styles.tagsToggleRow} onPress={handleTagsToggle}>
            <View style={styles.tagsToggleLeft}>
              <View style={styles.tagsToggleIcon}>
                <Tag size={14} color={colors.primary} />
              </View>
              <Text style={styles.tagsToggleLabel}>
                Prayer focus{selectedTags.length > 0 ? ` · ${selectedTags.length} selected` : ""}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ rotate: tagRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </Animated.View>
          </Pressable>
          {tagsExpanded && (
            <View style={styles.tagsWrap}>
              {PRAYER_TAGS.map((tag) => {
                const isActive = selectedTags.includes(tag.id);
                return (
                  <Pressable
                    key={tag.id}
                    style={[styles.tagChip, isActive && styles.tagChipActive]}
                    onPress={() => handleTagToggle(tag.id)}
                  >
                    <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                    <Text style={[styles.tagLabel, isActive && styles.tagLabelActive]}>{tag.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.dateSection}>
          <Pressable style={styles.dateSectionToggle} onPress={() => setDateExpanded((v) => !v)}>
            <View style={styles.dateSectionIcon}>
              <CalendarDays size={14} color={eventDate ? colors.primary : colors.mutedForeground} />
            </View>
            <Text style={[styles.dateSectionLabel, eventDate ? styles.dateSectionLabelActive : null]}>
              {eventDate ? `Prayer date · ${formatPrayerDate(eventDate)}` : "Add prayer date"}
            </Text>
            <ChevronDown size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
          </Pressable>
          <Animated.View
            style={{
              maxHeight: dateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 380],
              }),
              opacity: dateAnim,
              overflow: "hidden",
            }}
          >
            <View style={{ paddingTop: 12 }}>
              <PrayerDatePicker value={eventDate} onChange={setEventDate} />
            </View>
          </Animated.View>
        </View>

        <View style={styles.bottomSection}>
          {selectedRecipients.length > 0 && (
            <View style={styles.selectedPeopleWrap}>
              <Text style={styles.selectedPeopleLabel}>Sending to</Text>
              <View style={styles.selectedPeopleRow}>
                {selectedRecipients.map((r) => (
                  <View key={r.id} style={styles.selectedChip}>
                    {r.avatar ? (
                      <Image source={{ uri: r.avatar }} style={styles.chipAvatar} />
                    ) : (
                      <View style={styles.chipInitials}>
                        <Text style={styles.chipInitialsText}>{r.initials}</Text>
                      </View>
                    )}
                    <Text style={styles.chipName} numberOfLines={1}>{r.name.split(" ")[0]}</Text>
                    <Pressable style={styles.chipRemove} onPress={() => handleRemoveRecipient(r.id)}>
                      <X size={10} color={colors.mutedForeground} strokeWidth={3} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Pressable
            style={styles.addPeopleBtn}
            onPress={() => router.push("/select-recipients" as never)}
          >
            <Send size={18} color={colors.primary} />
            <Text style={styles.addPeopleBtnText}>
              {hasSelected ? "Add More" : "Send to"}
            </Text>
            <ArrowRight size={16} color={colors.primary} />
          </Pressable>

          <View style={styles.feedToggleRow}>
            <View style={styles.feedToggleLeft}>
              <View style={styles.feedToggleIcon}>
                <Rss size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedToggleLabel}>Send to feed</Text>
                <Text style={styles.feedToggleSub}>Share with your community</Text>
              </View>
            </View>
            <ThemedSwitch
              value={sendToFeed}
              onValueChange={(val) => {
                if (Platform.OS !== "web") void Haptics.selectionAsync();
                setSendToFeed(val);
              }}
            />
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
              onPress={canConfirm ? handleConfirm : undefined}
            >
              <Check size={18} color={colors.primaryForeground} />
              <Text style={styles.confirmBtnText}>Confirm</Text>
              <ArrowRight size={14} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>
      </AutoScrollView>
      {isPhotoPickerVisible && (
        <Pressable style={styles.photoPickerOverlay} onPress={() => setIsPhotoPickerVisible(false)}>
          <Pressable
            style={[styles.photoPickerSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.photoPickerHandle} />
            <Text style={styles.photoPickerTitle}>Add Photo</Text>
            <Pressable style={styles.photoPickerOption} onPress={handlePickFromCamera}>
              <Text style={styles.photoPickerOptionText}>Camera</Text>
            </Pressable>
            <View style={styles.photoPickerDivider} />
            <Pressable style={styles.photoPickerOption} onPress={handlePickFromLibrary}>
              <Text style={styles.photoPickerOptionText}>Photo Library</Text>
            </Pressable>
            <Pressable
              style={[styles.photoPickerOption, styles.photoPickerCancel]}
              onPress={() => setIsPhotoPickerVisible(false)}
            >
              <Text style={styles.photoPickerCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      )}

      {isEditModalVisible && (
        <View style={styles.fullScreenOverlay}>
          <StatusBar barStyle="dark-content" />
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <KeyboardAvoidingView
              style={styles.modalKeyboard}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.modalFullHeader}>
                <Pressable style={styles.modalCloseBtn} onPress={handleCancelEditModal}>
                  <X size={18} color={colors.mutedForeground} />
                </Pressable>
                <Text style={styles.modalTitle}>Edit Transcription</Text>
                <Pressable style={styles.modalSaveTopBtn} onPress={handleSaveEditModal}>
                  <Text style={styles.modalSaveTopText}>Save</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <TextInput
                  ref={editInputRef}
                  style={styles.modalInput}
                  value={draftTranscript}
                  onChangeText={setDraftTranscript}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                  placeholder="Your transcription..."
                  placeholderTextColor={colors.mutedForeground + "60"}
                  scrollEnabled
                />

                <Pressable style={styles.saveBtn} onPress={handleSaveEditModal}>
                  <Check size={18} color={colors.primaryForeground} />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      )}
      {DiscardModal}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  tabContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  tabTrack: {
    backgroundColor: colors.secondary + "80",
    borderRadius: 16,
    flexDirection: "row",
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 19,
    textAlign: "center" as const,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center" as const,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  voiceCenter: {
    alignItems: "center" as const,
    paddingVertical: 24,
    gap: 20,
  },
  timerWrap: {
    alignItems: "center" as const,
    gap: 4,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "200" as const,
    color: colors.foreground,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"] as const,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.primary,
    letterSpacing: 3,
  },
  micOuter: {
    width: 130,
    height: 130,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ripple: {
    position: "absolute" as const,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
  },
  micBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  micBtnInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  micBtnDone: {
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.primary + "40",
    shadowColor: "transparent",
    elevation: 0,
  },
  tapToRecord: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
    letterSpacing: 0.2,
  },
  recordingControls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 16,
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: colors.foreground,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  stopBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  recordedBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "#D4782F12",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D4782F30",
  },
  recordedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4782F",
  },
  recordedText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#D4782F",
    flex: 1,
  },
  reRecordText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  editBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
  },
  includeOptionsSection: {
    width: "100%" as const,
    backgroundColor: colors.secondary + "60",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border + "80",
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  includeOptionsLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  includeOptionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  includeToggleBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  includeOptionText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  includeOptionTextActive: {
    color: colors.foreground,
    fontWeight: "600" as const,
  },
  includeValidationHint: {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 2,
  },
  fullScreenOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 999,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalKeyboard: {
    flex: 1,
  },
  modalFullHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "30",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalSaveTopBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary + "15",
  },
  modalSaveTopText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 16,
  },
  modalInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    fontSize: 16,
    lineHeight: 26,
    color: colors.foreground,
    fontWeight: "500" as const,
    borderWidth: 1.5,
    borderColor: colors.primary + "40",
    textAlignVertical: "top" as const,
  },
  saveBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  transcriptCard: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    position: "relative" as const,
  },
  transcriptMicCorner: {
    position: "absolute" as const,
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  transcriptLabel: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: colors.primary + "99",
    letterSpacing: 2.5,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  transcriptBody: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.secondaryForeground,
    fontStyle: "italic" as const,
    fontWeight: "500" as const,
    paddingRight: 24,
  },
  textArea: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.border + "40",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    position: "relative" as const,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: colors.foreground,
    lineHeight: 26,
    minHeight: 140,
  },
  textInputActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
    marginTop: 10,
  },
  attachPhotoBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  aiParsingBadge: {},
  aiParsingText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: colors.primary + "80",
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  photosRow: {
    width: "100%",
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    marginBottom: 12,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  photoThumbImg: {
    width: 80,
    height: 80,
  },
  photoRemoveBtn: {
    position: "absolute" as const,
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  photoAddMore: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: colors.primary + "10",
    borderWidth: 1.5,
    borderColor: colors.primary + "30",
    borderStyle: "dashed" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  photoPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end" as const,
    zIndex: 100,
  },
  photoPickerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  photoPickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.mutedForeground + "50",
    alignSelf: "center" as const,
    marginBottom: 20,
  },
  photoPickerTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  photoPickerOption: {
    paddingVertical: 16,
    alignItems: "center" as const,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    marginBottom: 10,
  },
  photoPickerOptionText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.foreground,
  },
  photoPickerDivider: {
    height: 0,
    marginBottom: 0,
  },
  photoPickerCancel: {
    backgroundColor: "transparent",
    marginTop: 4,
  },
  photoPickerCancelText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  selectedTagsRow: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  selectedTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.primary + "18",
    borderWidth: 1.5,
    borderColor: colors.primary + "50",
  },
  selectedTagEmoji: {
    fontSize: 12,
  },
  selectedTagText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  optionsRow: {
    width: "100%",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginTop: 16,
  },
  optionChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionChipTimeSensitive: {
    backgroundColor: "#FFF8E7",
    borderColor: "#F0C040",
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
    width: "100%",
    marginTop: 20,
    backgroundColor: colors.secondary + "60",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border + "60",
    overflow: "hidden" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateSectionToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  dateSectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dateSectionLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.foreground,
    flex: 1,
  },
  dateSectionLabelActive: {
    color: colors.primary,
  },
  tagsSection: {
    width: "100%",
    marginTop: 20,
    marginBottom: 4,
    backgroundColor: colors.secondary + "60",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border + "60",
    overflow: "hidden" as const,
  },
  tagsToggleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tagsToggleLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  tagsToggleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tagsToggleLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.foreground,
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
    backgroundColor: colors.secondary,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tagChipActive: {
    backgroundColor: colors.primary + "18",
    borderColor: colors.primary + "60",
  },
  tagEmoji: {
    fontSize: 13,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.secondaryForeground,
  },
  tagLabelActive: {
    color: colors.primary,
    fontWeight: "700" as const,
  },
  bottomSection: {
    width: "100%",
    marginTop: 20,
    backgroundColor: colors.secondary + "60",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border + "60",
  },
  selectedPeopleWrap: { marginBottom: 16 },
  selectedPeopleLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  selectedPeopleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  chipAvatar: { width: 26, height: 26, borderRadius: 13 },
  chipInitials: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  chipInitialsText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: colors.secondaryForeground,
  },
  chipName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.foreground,
    maxWidth: 80,
  },
  chipRemove: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  addPeopleBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  addPeopleBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  feedToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border + "60",
  },
  feedToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  feedToggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  feedToggleLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  feedToggleSub: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: colors.primaryForeground,
  },
});
