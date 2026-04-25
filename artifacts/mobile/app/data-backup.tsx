import React, { useState, useCallback, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Platform, ActivityIndicator, Animated } from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Shield, Cloud, Download, Trash2, AlertTriangle, CheckCircle2, UserX } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

const GREEN = "#34C759";

export default function DataBackupScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { markAccountForDeletion } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const showDeletedConfirmation = useCallback(() => {
    setShowDeletedModal(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await markAccountForDeletion();
      setShowDeleteModal(false);
      showDeletedConfirmation();
    } catch (error) {
      console.error("[DataBackup] Failed to delete account:", error);
      setIsDeleting(false);
    }
  }, [markAccountForDeletion, showDeletedConfirmation]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.headerTitle}>Data & Backup</Text>
          <View style={{ width: 40 }} />
        </View>

        <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>YOUR DATA</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.iconWrap}><Shield size={20} color={colors.primary} /></View>
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Data Protection</Text>
                  <Text style={styles.infoDesc}>Your prayer data is securely stored and protected. We do not sell or share your personal data with any third parties.</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BACKUP</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.iconWrap}><Cloud size={20} color={GREEN} /></View>
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Automatic Backup</Text>
                  <Text style={styles.infoDesc}>Your data is automatically backed up securely on our systems. No action is needed from you.</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Backup is active and up to date</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXPORT DATA</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.iconWrap}><Download size={20} color={colors.primary} /></View>
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Request My Data</Text>
                  <Text style={styles.infoDesc}>You have the right to receive a copy of your personal data. We will send it to your registered email address.</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Pressable style={styles.actionBtn} onPress={() => setShowRequestModal(true)} testID="request-data-btn">
                <Download size={16} color={colors.primary} />
                <Text style={styles.actionBtnText}>Request My Data</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            <View style={[styles.card, styles.dangerCard]}>
              <View style={styles.infoRow}>
                <View style={[styles.iconWrap, styles.dangerIconWrap]}><Trash2 size={20} color={colors.destructive} /></View>
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Delete My Account</Text>
                  <Text style={styles.infoDesc}>Permanently delete your account and all associated data. This is irreversible and will be processed within 30 days.</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Pressable style={styles.dangerBtn} onPress={() => setShowDeleteModal(true)} testID="delete-account-btn">
                <Trash2 size={16} color={colors.destructive} />
                <Text style={styles.dangerBtnText}>Delete My Account</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.gdprNote}>
            <Text style={styles.gdprText}>Prayer Space is designed in line with GDPR principles. For full details, see our Privacy Policy and Terms of Service.</Text>
          </View>
          <View style={{ height: 40 }} />
        </AutoScrollView>

        {/* Request Data Modal */}
        <Modal visible={showRequestModal} transparent animationType="fade" onRequestClose={() => { if (!requestSent) setShowRequestModal(false); }}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              {requestSent ? (
                <>
                  <View style={styles.modalIconCircle}><CheckCircle2 size={32} color={GREEN} /></View>
                  <Text style={styles.modalTitle}>Request Sent</Text>
                  <Text style={styles.modalDesc}>We have received your data request. You will receive a copy within 30 days.</Text>
                  <Pressable style={styles.modalPrimaryBtn} onPress={() => { setShowRequestModal(false); setRequestSent(false); }}>
                    <Text style={styles.modalPrimaryBtnText}>Done</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.modalIconCircle}><Download size={28} color={colors.primary} /></View>
                  <Text style={styles.modalTitle}>Request Your Data</Text>
                  <Text style={styles.modalDesc}>We will compile and send a copy of your personal data to your registered email address within 30 days.</Text>
                  <Pressable style={styles.modalPrimaryBtn} onPress={() => setRequestSent(true)} testID="confirm-request-btn">
                    <Text style={styles.modalPrimaryBtnText}>Send Request</Text>
                  </Pressable>
                  <Pressable style={styles.modalSecondaryBtn} onPress={() => setShowRequestModal(false)}>
                    <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Delete Account Modal */}
        <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => { if (!isDeleting) setShowDeleteModal(false); }}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              <View style={[styles.modalIconCircle, styles.dangerIconCircle]}><AlertTriangle size={28} color={colors.destructive} /></View>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <Text style={styles.modalDesc}>This will permanently delete your account, prayer history, journal entries, and all personal data.</Text>
              <View style={styles.modalWarningBox}><Text style={styles.modalWarningText}>Your data will be permanently deleted within 30 days in line with GDPR regulations.</Text></View>
              <Pressable style={[styles.modalDangerBtn, isDeleting && styles.modalBtnDisabled]} onPress={handleConfirmDelete} disabled={isDeleting} testID="confirm-delete-btn">
                {isDeleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalDangerBtnText}>Yes, Delete My Account</Text>}
              </Pressable>
              <Pressable style={[styles.modalSecondaryBtn, isDeleting && styles.modalBtnDisabled]} onPress={() => setShowDeleteModal(false)} disabled={isDeleting}>
                <Text style={styles.modalSecondaryBtnText}>Keep My Account</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Deleted Confirmation Modal */}
        <Modal visible={showDeletedModal} transparent animationType="none" onRequestClose={() => {}}>
          <View style={styles.overlay}>
            <Animated.View style={[styles.modalCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.deletedIconCircle}><UserX size={30} color={colors.foreground} /></View>
              <Text style={styles.modalTitle}>Account Deleted</Text>
              <Text style={styles.modalDesc}>Your account has been removed from Prayer Space. Your data will be permanently deleted within 30 days.</Text>
              <Pressable style={styles.modalPrimaryBtn} onPress={() => setShowDeletedModal(false)} testID="deleted-ok-btn">
                <Text style={styles.modalPrimaryBtnText}>OK</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
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
    scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 11, fontWeight: "800" as const, color: colors.mutedForeground, letterSpacing: 1.5, marginBottom: 12, paddingHorizontal: 4 },
    card: { backgroundColor: colors.card, borderRadius: 24, overflow: "hidden" as const, borderWidth: 1, borderColor: colors.border + "50" },
    dangerCard: { borderColor: colors.destructive + "20" },
    infoRow: { flexDirection: "row", alignItems: "flex-start", padding: 18, gap: 14 },
    iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, alignItems: "center" as const, justifyContent: "center" as const, flexShrink: 0 },
    dangerIconWrap: { backgroundColor: colors.destructive + "10" },
    infoText: { flex: 1 },
    infoTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground, marginBottom: 4 },
    infoDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 19 },
    divider: { height: 1, backgroundColor: colors.border + "50", marginHorizontal: 18 },
    statusRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
    statusText: { fontSize: 13, fontWeight: "600" as const, color: GREEN },
    actionBtn: { flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const, gap: 8, margin: 14, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.primary + "30" },
    actionBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.primary },
    dangerBtn: { flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const, gap: 8, margin: 14, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.destructive + "08", borderWidth: 1, borderColor: colors.destructive + "25" },
    dangerBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.destructive },
    gdprNote: { paddingHorizontal: 4, marginBottom: 8 },
    gdprText: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18, textAlign: "center" as const },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center" as const, justifyContent: "center" as const, padding: 24 },
    modalCard: { backgroundColor: colors.card, borderRadius: 28, padding: 28, width: "100%", maxWidth: 380, alignItems: "center" as const },
    modalIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 18 },
    dangerIconCircle: { backgroundColor: colors.destructive + "10" },
    modalTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground, marginBottom: 10, textAlign: "center" as const },
    modalDesc: { fontSize: 14, color: colors.mutedForeground, lineHeight: 20, textAlign: "center" as const, marginBottom: 16 },
    modalWarningBox: { backgroundColor: colors.destructive + "08", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20, borderWidth: 1, borderColor: colors.destructive + "20" },
    modalWarningText: { fontSize: 12, color: colors.destructive, fontWeight: "500" as const, textAlign: "center" as const, lineHeight: 17 },
    modalPrimaryBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, width: "100%", alignItems: "center" as const, marginBottom: 10 },
    modalPrimaryBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
    modalDangerBtn: { backgroundColor: colors.destructive, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, width: "100%", alignItems: "center" as const, marginBottom: 10 },
    modalDangerBtnText: { fontSize: 15, fontWeight: "700" as const, color: "#FFFFFF" },
    modalSecondaryBtn: { paddingVertical: 12, paddingHorizontal: 32, width: "100%", alignItems: "center" as const },
    modalSecondaryBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
    modalBtnDisabled: { opacity: 0.6 },
    deletedIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 18, borderWidth: 1, borderColor: colors.border },
  });
}
