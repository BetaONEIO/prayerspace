import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, ChevronDown, Send, CheckCircle } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const QUERY_OPTIONS = ["General Question","Account & Profile","Privacy & Data","Prayer Requests","Groups & Communities","Payments & Subscriptions","Technical Issue","Report a Bug","Other"];

export default function ContactSupportScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [queryType, setQueryType] = useState("");
  const [message, setMessage] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; queryType?: string; message?: string }>({});

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Please enter your name";
    if (!email.trim()) newErrors.email = "Please enter your email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = "Please enter a valid email address";
    if (!queryType) newErrors.queryType = "Please select a query type";
    if (!message.trim()) newErrors.message = "Please enter your message";
    else if (message.trim().length < 10) newErrors.message = "Message must be at least 10 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, queryType, message]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setLoading(false);
    setSubmitted(true);
  }, [validate]);

  if (submitted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.secondaryForeground} /></Pressable>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}><CheckCircle size={52} color={colors.primary} strokeWidth={1.5} /></View>
          <Text style={styles.successTitle}>Message sent</Text>
          <Text style={styles.successSubtitle}>Thanks for reaching out. Our team will get back to you within 24 hours.</Text>
          <Pressable style={styles.successBtn} onPress={() => router.back()}>
            <Text style={styles.successBtnText}>Back to Help Centre</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.secondaryForeground} /></Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Contact Support</Text>
              <Text style={styles.headerSubtitle}>We usually respond within 24 hours</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.formCard}>
              {[
                { key: "name" as const, label: "Your name", value: name, setter: setName, placeholder: "Enter your name", type: "default" as const },
                { key: "email" as const, label: "Email address", value: email, setter: setEmail, placeholder: "Enter your email", type: "email-address" as const },
              ].map(({ key, label, value, setter, placeholder, type }) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    style={[styles.input, errors[key] ? styles.inputError : null]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    value={value}
                    onChangeText={(v) => { setter(v); setErrors((prev) => ({ ...prev, [key]: undefined })); }}
                    keyboardType={type}
                    autoCapitalize={key === "email" ? "none" : "words"}
                    autoCorrect={false}
                  />
                  {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
                </View>
              ))}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>What's your query about?</Text>
                <Pressable style={[styles.dropdown, errors.queryType ? styles.inputError : null]} onPress={() => setDropdownOpen((prev) => !prev)}>
                  <Text style={[styles.dropdownText, !queryType && styles.dropdownPlaceholder]}>{queryType || "Select a topic"}</Text>
                  <ChevronDown size={17} color={colors.mutedForeground} strokeWidth={2} style={{ transform: [{ rotate: dropdownOpen ? "180deg" : "0deg" }] }} />
                </Pressable>
                {errors.queryType && <Text style={styles.errorText}>{errors.queryType}</Text>}
                {dropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    {QUERY_OPTIONS.map((option, index) => (
                      <React.Fragment key={option}>
                        {index > 0 && <View style={styles.dropdownDivider} />}
                        <Pressable style={[styles.dropdownOption, queryType === option && styles.dropdownOptionSelected]} onPress={() => { setQueryType(option); setDropdownOpen(false); setErrors((prev) => ({ ...prev, queryType: undefined })); }}>
                          <Text style={[styles.dropdownOptionText, queryType === option && styles.dropdownOptionTextSelected]}>{option}</Text>
                        </Pressable>
                      </React.Fragment>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Your message</Text>
                <TextInput
                  style={[styles.textarea, errors.message ? styles.inputError : null]}
                  placeholder="Tell us how we can help you…"
                  placeholderTextColor={colors.mutedForeground}
                  value={message}
                  onChangeText={(v) => { setMessage(v); setErrors((prev) => ({ ...prev, message: undefined })); }}
                  multiline numberOfLines={5} textAlignVertical="top"
                />
                <Text style={styles.charCount}>{message.length} characters</Text>
                {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
              </View>
            </View>

            <Pressable style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : (
                <><Send size={17} color={colors.primaryForeground} strokeWidth={2} /><Text style={styles.submitBtnText}>Send Message</Text></>
              )}
            </Pressable>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    headerCenter: { alignItems: "center" },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground, textAlign: "center" },
    headerSubtitle: { fontSize: 12, fontWeight: "500" as const, color: colors.mutedForeground, marginTop: 2, textAlign: "center" },
    scrollContent: { paddingHorizontal: 24, paddingTop: 8 },
    formCard: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border + "50", padding: 20, gap: 20, marginBottom: 16 },
    fieldGroup: { gap: 6 },
    label: { fontSize: 13, fontWeight: "600" as const, color: colors.foreground, marginBottom: 2 },
    input: { backgroundColor: colors.background, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: colors.foreground, fontWeight: "500" as const },
    inputError: { borderColor: colors.destructive + "80" },
    errorText: { fontSize: 12, color: colors.destructive, fontWeight: "500" as const, marginTop: 2 },
    dropdown: { backgroundColor: colors.background, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    dropdownText: { fontSize: 14, color: colors.foreground, fontWeight: "500" as const, flex: 1 },
    dropdownPlaceholder: { color: colors.mutedForeground, fontWeight: "400" as const },
    dropdownMenu: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border + "70", overflow: "hidden", marginTop: 4 },
    dropdownDivider: { height: 1, backgroundColor: colors.border + "40", marginHorizontal: 14 },
    dropdownOption: { paddingVertical: 13, paddingHorizontal: 16 },
    dropdownOptionSelected: { backgroundColor: colors.accent },
    dropdownOptionText: { fontSize: 14, color: colors.foreground, fontWeight: "500" as const },
    dropdownOptionTextSelected: { color: colors.primary, fontWeight: "600" as const },
    textarea: { backgroundColor: colors.background, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: colors.foreground, minHeight: 120 },
    charCount: { fontSize: 11, color: colors.mutedForeground, textAlign: "right", marginTop: 2 },
    submitBtn: { backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4 },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    successContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 },
    successIconWrap: { width: 90, height: 90, borderRadius: 30, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    successTitle: { fontSize: 24, fontWeight: "700" as const, color: colors.foreground, textAlign: "center" },
    successSubtitle: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", lineHeight: 22 },
    successBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 32, marginTop: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
    successBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
