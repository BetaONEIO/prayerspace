import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { exportAccountData } from "@workspace/api-client-react";
import { accountStorageKey, assertLocalDataIdentity, createAccountLocalStorage, drainAccountStorage, type LocalDataIdentity } from "./accountLocalData";
import { drainJournalOperations } from "./journalSync";

function requireApi() {
  if (!process.env.EXPO_PUBLIC_DOMAIN) throw new Error("The account service URL has not been configured");
}
export async function removeDeletedAccountLocalData(userId: string) {
  // The caller has a confirmed self-deletion receipt and has invalidated the
  // old account. Do not remove a different account or unassigned legacy keys.
  await drainJournalOperations(userId);
  await drainAccountStorage(AsyncStorage, userId);
  const prefix = accountStorageKey(userId, "");
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix));
  await AsyncStorage.multiRemove(keys);
}

export async function downloadAccountExport(owner: LocalDataIdentity) {
  assertLocalDataIdentity(owner);
  requireApi();
  const storage = createAccountLocalStorage(AsyncStorage, owner);
  const remote = await exportAccountData({ expectedUserId: owner.userId! }, { signal: AbortSignal.timeout(45000) });
  assertLocalDataIdentity(owner);
  if (remote.userId !== owner.userId) throw new Error("Export account mismatch");
  const prefix = accountStorageKey(owner.userId!, "");
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith(prefix));
  const local: Record<string, unknown> = {};
  for (const key of keys) {
    const value = await storage.getItem(key.slice(prefix.length));
    local[key.slice(prefix.length)] = value === null ? null : JSON.parse(value);
  }
  const content = JSON.stringify({ ...remote, localDeviceRecords: local,
    fileDownloadNote: "Private file links expire one hour after export. Save any files you need before they expire." }, null, 2);
  assertLocalDataIdentity(owner);
  const name = `prayer-space-data-${Date.now()}.json`;
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    try {
      const link = document.createElement("a");
      link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  } else {
    if (!await Sharing.isAvailableAsync()) throw new Error("File sharing is unavailable on this device");
    assertLocalDataIdentity(owner);
    const file = new File(Paths.cache, name);
    try {
      file.create({ overwrite: true }); file.write(content);
      assertLocalDataIdentity(owner);
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", UTI: "public.json", dialogTitle: "Save your private Prayer Space export" });
    } finally {
      if (file.exists) file.delete();
    }
  }
}
