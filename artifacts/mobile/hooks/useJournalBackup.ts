import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "@/lib/supabase";
import { createAccountLocalStorage } from "@/lib/accountLocalData";
import { BACKUP_CONFIG_KEY, syncJournal, resolveJournalConflict, type JournalConflict, type JournalEntry } from "@/lib/journalSync";

type Storage = ReturnType<typeof createAccountLocalStorage>;
export type BackupState = {
  enabled: boolean; status: "loading" | "off" | "syncing" | "upToDate" | "pending" | "conflict" | "error";
  lastSyncedAt: number | null; pending: number; error: string | null; conflicts: JournalConflict[];
};
const initial: BackupState = { enabled: false, status: "loading", lastSyncedAt: null, pending: 0, error: null, conflicts: [] };

export function useJournalBackup(storage: Storage, onMerged: (entries: JournalEntry[]) => void, editVersion: () => number) {
  const [state, setState] = useState<BackupState>(initial);
  const enabled = useRef(false);
  const loaded = useRef(false);
  const busy = useRef(false);
  const callbacks = useRef({ onMerged, editVersion });
  callbacks.current = { onMerged, editVersion };

  const syncNow = useCallback(async () => {
    storage.assertActive();
    if (busy.current) throw new Error("A backup operation is already in progress");
    if (!loaded.current) throw new Error("Backup settings could not load. Reopen this screen before retrying.");
    busy.current = true;
    const generation = callbacks.current.editVersion();
    setState(prev => ({ ...prev, status: "syncing", error: null }));
    try {
      const result = await syncJournal(storage, async (changes, owner) => {
        const { data, error } = await supabase.rpc("sync_private_journal", {
          p_expected_user_id: owner.userId, p_changes: changes,
        }).abortSignal(AbortSignal.timeout(20000));
        if (error) throw new Error(/Journal (backup limit|cloud storage limit)/.test(error.message)
          ? error.message : "Cloud backup could not sync. Your device edits are retained. Please retry.");
        return data;
      }, enabled.current);
      const editedDuringSync = generation !== callbacks.current.editVersion();
      if (!editedDuringSync) callbacks.current.onMerged(result.journal);
      const lastSyncedAt = Date.now();
      await storage.setItem(BACKUP_CONFIG_KEY, JSON.stringify({ enabled: enabled.current, lastSyncedAt }));
      setState(prev => ({ ...prev, lastSyncedAt, pending: result.pending, conflicts: result.conflicts,
        status: editedDuringSync ? "pending" : result.conflicts.length ? "conflict" : result.pending ? "pending" : enabled.current ? "upToDate" : "off" }));
      return result;
    } catch (error) {
      if (storage.isActive()) setState(prev => ({ ...prev, status: "error", error: error instanceof Error ? error.message : "Backup could not sync" }));
      throw error;
    } finally { busy.current = false; }
  }, [storage]);

  useEffect(() => {
    if (!storage.owner.userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const config = JSON.parse(await storage.getItem(BACKUP_CONFIG_KEY) ?? '{"enabled":false,"lastSyncedAt":null}');
        if (!config || typeof config.enabled !== "boolean") throw new Error("Backup settings could not be read safely");
        if (cancelled) return;
        enabled.current = config.enabled;
        loaded.current = true;
        setState(prev => ({ ...prev, enabled: config.enabled, lastSyncedAt: config.lastSyncedAt ?? null,
          status: config.enabled ? "pending" : "off" }));
        if (config.enabled) void syncNow().catch(() => {});
      } catch (error) {
        if (!cancelled && storage.isActive()) setState(prev => ({ ...prev, status: "error",
          error: error instanceof Error ? error.message : "Backup settings could not load" }));
      }
    })();
    const check = () => {
      if (!cancelled && enabled.current && loaded.current && !busy.current && AppState.currentState !== "background") {
        void syncNow().catch(() => {});
      }
    };
    const timer = setInterval(check, 30000);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") check(); });
    return () => { cancelled = true; clearInterval(timer); subscription.remove(); };
  }, [storage, syncNow]);

  const setEnabled = useCallback(async (value: boolean) => {
    storage.assertActive();
    if (!loaded.current || busy.current) throw new Error("Please wait until the current backup operation finishes");
    await storage.setItem(BACKUP_CONFIG_KEY, JSON.stringify({ enabled: value, lastSyncedAt: state.lastSyncedAt }));
    enabled.current = value;
    setState(prev => ({ ...prev, enabled: value, status: value ? "pending" : "off", error: null }));
    if (value) await syncNow();
  }, [storage, state.lastSyncedAt, syncNow]);
  const onSaved = useCallback(() => {
    if (enabled.current && loaded.current && storage.isActive()) {
      setState(prev => ({ ...prev, status: prev.conflicts.length ? "conflict" : "pending" }));
      if (!busy.current) void syncNow().catch(() => {});
    }
  }, [storage, syncNow]);
  const resolve = useCallback(async (conflict: JournalConflict, choice: "cloud" | "both" | "device") => {
    if (busy.current) throw new Error("Please wait for the backup operation to finish");
    busy.current = true;
    const generation = callbacks.current.editVersion();
    try {
      const journal = await resolveJournalConflict(storage, conflict, choice);
      if (generation === callbacks.current.editVersion()) callbacks.current.onMerged(journal);
      busy.current = false;
      await syncNow();
    } finally { busy.current = false; }
  }, [storage, syncNow]);
  return { ...state, syncNow, setEnabled, onSaved, resolve };
}
