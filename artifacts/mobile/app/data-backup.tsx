import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Platform, ActivityIndicator, Alert } from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Shield, Cloud, Download, Trash2, AlertTriangle } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { usePrayer } from "@/providers/PrayerProvider";
import { downloadAccountExport } from "@/lib/accountPrivacy";
import { getLocalDataIdentity } from "@/lib/accountLocalData";
import { privacyNotice } from "@/hooks/useAbuseReport";

const GREEN = "#34C759";

export default function DataBackupScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { markAccountForDeletion, user, localDataEpoch } = useAuth();
  const owner = useMemo(() => ({ ...getLocalDataIdentity() }), [user?.id, localDataEpoch]);
  const { journalBackup: backup } = usePrayer();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [exported, setExported] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const unavailable = busy || backup.status === "syncing" || backup.status === "loading" || isDeleting;
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setFeedback(null);
    try { await action(); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "This operation failed. Please retry."); }
    finally { setBusy(false); }
  };
  const confirmBackup = () => {
    const text = "Upload this account's journal to your private Supabase backup? It is access-controlled, not end-to-end encrypted. Older unassigned device records will not be uploaded.";
    const enable = () => void run(() => backup.setEnabled(true));
    if (Platform.OS === "web") { if (window.confirm(text)) enable(); }
    else Alert.alert("Enable journal backup", text, [{ text: "Cancel", style: "cancel" }, { text: "Enable & restore", onPress: enable }]);
  };
  const statusText = backup.status === "upToDate" ? "Last sync completed — device changes backed up" :
    backup.status === "off" ? "Automatic cloud backup is off" :
    backup.status === "conflict" ? `${backup.conflicts.length} change(s) need your decision` :
    backup.status === "error" ? "Cloud sync unavailable — device edits retained" :
    backup.status === "syncing" ? "Syncing journal…" : backup.status === "loading" ? "Loading backup settings…" :
    backup.enabled ? "Device changes are waiting to sync" : "Automatic backup is off; device changes have not been uploaded";

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await markAccountForDeletion("DELETE");
      if (!getLocalDataIdentity().userId) privacyNotice("Deletion requested",
        "Your confirmed request was saved. The server will remove your account, owned files and account records, with automatic retries if cleanup fails. Your signed-in device records have been removed. Shared communities and copies independently saved by other people may remain. Cancel subscriptions separately in your app store.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Deletion was not confirmed. Please retry.");
      setIsDeleting(false);
    }
  }, [markAccountForDeletion]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
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
                  <Text style={styles.infoDesc}>Your device records are separated by account. Cloud journal backup is optional and account-protected, not end-to-end encrypted. Older records without verified ownership stay unassigned and are not uploaded.</Text>
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
                  <Text style={styles.infoTitle}>Private Journal Backup</Text>
                  <Text style={styles.infoDesc}>When enabled, journal changes sync while the app is open. On a new device, enable backup or use Restore / Sync to recover cloud records. Different versions are kept for your decision; edits are never silently overwritten. Cloud storage is limited to 5 MB and 5,000 records, including deletion history.</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: backup.status === "upToDate" ? GREEN : colors.mutedForeground }]} />
                <Text style={[styles.statusText, { color: colors.foreground, flex: 1 }]}>{statusText}</Text>
              </View>
              {backup.lastSyncedAt && <Text style={[styles.infoDesc, { paddingHorizontal: 18 }]}>Last successful sync: {new Date(backup.lastSyncedAt).toLocaleString()}</Text>}
              {backup.error && <Text style={[styles.infoDesc, { padding: 18, color: colors.destructive }]}>{backup.error}</Text>}
              <Pressable style={styles.actionBtn} disabled={unavailable} onPress={() => backup.enabled
                ? void run(() => backup.setEnabled(false)) : confirmBackup()} testID="toggle-journal-backup">
                <Text style={styles.actionBtnText}>{backup.enabled ? "Turn off automatic backup" : "Enable & restore journal backup"}</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} disabled={unavailable} onPress={() => void run(() => backup.syncNow())} testID="sync-journal-btn">
                <Text style={styles.actionBtnText}>Restore / Sync now</Text>
              </Pressable>
              {backup.conflicts.map(conflict => (
                <View key={conflict.id} style={{ padding: 18, gap: 10 }}>
                  <Text style={styles.infoTitle}>{conflict.local?.title ?? conflict.cloud?.title ?? "Deleted entry"} — conflicting change</Text>
                  <Text style={styles.infoDesc}>Device: {conflict.local?.body.slice(0, 300) ?? "Deleted on this device"}</Text>
                  <Text style={styles.infoDesc}>Cloud: {conflict.cloud?.body.slice(0, 300) ?? "Deleted in the cloud"}</Text>
                  <Pressable disabled={unavailable} onPress={() => void run(() => backup.resolve(conflict, "cloud"))}>
                    <Text style={styles.actionBtnText}>Use cloud version on this device</Text>
                  </Pressable>
                  {conflict.local && <Pressable disabled={unavailable} onPress={() => void run(() => backup.resolve(conflict, "both"))}>
                    <Text style={styles.actionBtnText}>Keep both versions</Text>
                  </Pressable>}
                  {!conflict.local && backup.enabled && <Pressable disabled={unavailable} onPress={() => {
                    const remove = () => void run(() => backup.resolve(conflict, "device"));
                    if (Platform.OS === "web") { if (window.confirm("Delete this changed cloud entry permanently?")) remove(); }
                    else Alert.alert("Keep device deletion", "Delete this changed cloud entry permanently?", [
                      { text: "Cancel", style: "cancel" }, { text: "Delete cloud copy", style: "destructive", onPress: remove },
                    ]);
                  }}><Text style={styles.dangerBtnText}>Confirm deletion of cloud version</Text></Pressable>}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXPORT DATA</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.iconWrap}><Download size={20} color={colors.primary} /></View>
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Download My Data</Text>
                  <Text style={styles.infoDesc}>Download your account records and this account's device journal as JSON. Owned uploaded files have private download links that expire after one hour.</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Pressable style={styles.actionBtn} disabled={unavailable} onPress={() => { setExported(false); setFeedback(null); setShowRequestModal(true); }} testID="request-data-btn">
                <Download size={16} color={colors.primary} />
                <Text style={styles.actionBtnText}>Download My Data</Text>
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
                  <Text style={styles.infoDesc}>Submit a confirmed, irreversible deletion of your account, owned files and account records. Sign in again if your last sign-in was more than 15 minutes ago. Store subscriptions must be cancelled separately.</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Pressable style={styles.dangerBtn} disabled={unavailable} onPress={() => { setFeedback(null); setShowDeleteModal(true); }} testID="delete-account-btn">
                <Trash2 size={16} color={colors.destructive} />
                <Text style={styles.dangerBtnText}>Delete My Account</Text>
              </Pressable>
            </View>
          </View>

          {feedback && <Text accessibilityRole="alert" style={[styles.infoDesc, { color: colors.destructive }]}>{feedback}</Text>}
          <View style={{ height: 40 }} />
        </AutoScrollView>

        {/* Request Data Modal */}
        <Modal visible={showRequestModal} transparent animationType="fade" onRequestClose={() => { if (!busy) setShowRequestModal(false); }}>
          <View style={styles.overlay}>
            <View style={styles.modalCard}>
              {exported ? (
                <>
                  <Text style={styles.modalTitle}>Export Prepared</Text>
                  <Text style={styles.modalDesc}>The download or save/share sheet opened with your JSON export. Keep it private and save any uploaded files before their links expire.</Text>
                  <Pressable style={styles.modalPrimaryBtn} onPress={() => setShowRequestModal(false)}>
                    <Text style={styles.modalPrimaryBtnText}>Done</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.modalIconCircle}><Download size={28} color={colors.primary} /></View>
                  <Text style={styles.modalTitle}>Download Your Data</Text>
                  <Text style={styles.modalDesc}>This export contains private journal and account information. Download it or save it using your device's share sheet. Older unassigned records are excluded.</Text>
                  {feedback && <Text accessibilityRole="alert" style={[styles.modalDesc, { color: colors.destructive }]}>{feedback}</Text>}
                  <Pressable style={styles.modalPrimaryBtn} disabled={busy} onPress={() => void run(async () => {
                    await downloadAccountExport(owner); setExported(true);
                  })} testID="confirm-request-btn">
                    {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.modalPrimaryBtnText}>Download JSON</Text>}
                  </Pressable>
                  <Pressable style={styles.modalSecondaryBtn} disabled={busy} onPress={() => setShowRequestModal(false)}>
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
              <Text style={styles.modalDesc}>This permanently removes your account, authored prayers and messages, private cloud journals, owned files and this account's device records. This cannot be undone.</Text>
              <View style={styles.modalWarningBox}><Text style={styles.modalWarningText}>Shared communities remain without your ownership. Copies saved independently by others may remain. Cancel store subscriptions separately. Download your data first if you need a copy.</Text></View>
              {feedback && <Text accessibilityRole="alert" style={[styles.modalDesc, { color: colors.destructive }]}>{feedback}</Text>}
              <Pressable style={[styles.modalDangerBtn, isDeleting && styles.modalBtnDisabled]} onPress={handleConfirmDelete} disabled={isDeleting} testID="confirm-delete-btn">
                {isDeleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalDangerBtnText}>Yes, Delete My Account</Text>}
              </Pressable>
              <Pressable style={[styles.modalSecondaryBtn, isDeleting && styles.modalBtnDisabled]} onPress={() => setShowDeleteModal(false)} disabled={isDeleting}>
                <Text style={styles.modalSecondaryBtnText}>Keep My Account</Text>
              </Pressable>
            </View>
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
