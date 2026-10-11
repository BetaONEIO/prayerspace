import { createAccountLocalStorage, type LocalDataIdentity } from "./accountLocalData";

export interface JournalEntry {
  id: string; title: string; body: string;
  tag: "gratitude" | "petition" | "reflection" | "praying_for";
  timestamp: number; isFavorite: boolean; isAnswered: boolean;
  contactName?: string; contactAvatar?: string; prayerRequest?: string;
  eventDate?: string | null; imageUrl?: string | null;
}
type Storage = ReturnType<typeof createAccountLocalStorage>;
type Base = { revision: number; base: string | null };
export type JournalConflict = { id: string; local: JournalEntry | null; cloud: JournalEntry | null; revision: number };
type CloudEntry = { id: string; entry: JournalEntry | null; revision: number };
export type JournalRpc = (changes: Array<{ id: string; entry: JournalEntry | null; expectedRevision: number }>,
  owner: LocalDataIdentity) => Promise<unknown>;

export const JOURNAL_KEY = "prayerful_journal";
const META_KEY = "prayerful_journal_sync_meta";
export const JOURNAL_STATE_KEY = "prayerful_journal_state";
export const BACKUP_CONFIG_KEY = "prayerful_journal_backup";
const locks = new Map<string, Promise<void>>();

export function validateJournal(value: unknown): JournalEntry[] {
  if (!Array.isArray(value) || value.length > 5000) throw new Error("Journal records could not be read safely");
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item.id !== "string" || !item.id.length || item.id.length > 200 || ids.has(item.id) ||
      typeof item.title !== "string" || item.title.length > 1000 || typeof item.body !== "string" ||
      item.body.length > 100000 || !["gratitude", "petition", "reflection", "praying_for"].includes(item.tag) ||
      !Number.isFinite(item.timestamp) || typeof item.isFavorite !== "boolean" || typeof item.isAnswered !== "boolean") {
      throw new Error("Journal records could not be read safely");
    }
    ids.add(item.id);
  }
  return value as JournalEntry[];
}

function canonical(entry: JournalEntry | null | undefined): string | null {
  return entry ? JSON.stringify(Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)))) : null;
}
function lock<T>(storage: Storage, task: () => Promise<T>): Promise<T> {
  storage.assertActive();
  const key = storage.owner.userId!;
  const work = (locks.get(key) ?? Promise.resolve()).then(() => { storage.assertActive(); return task(); });
  const settled = work.then(() => undefined, () => undefined);
  locks.set(key, settled);
  void settled.then(() => { if (locks.get(key) === settled) locks.delete(key); });
  return work;
}
async function read(storage: Storage) {
  const saved = await storage.getItem(JOURNAL_STATE_KEY);
  const envelope = saved ? JSON.parse(saved) : null;
  const journal = validateJournal(saved ? envelope?.journal : JSON.parse(await storage.getItem(JOURNAL_KEY) ?? "[]"));
  const rawMeta: Record<string, Base> = saved ? envelope?.meta : JSON.parse(await storage.getItem(META_KEY) ?? "{}");
  if (!rawMeta || typeof rawMeta !== "object" || Array.isArray(rawMeta) ||
    Object.values(rawMeta).some(item => !item || !Number.isSafeInteger(item.revision) || item.revision < 0 ||
      (item.base !== null && typeof item.base !== "string"))) throw new Error("Journal backup history could not load");
  const meta: Record<string, Base> = Object.assign(Object.create(null), rawMeta);
  return { journal, meta };
}
async function write(storage: Storage, journal: JournalEntry[], meta: Record<string, Base>) {
  // The authoritative journal + sync base commit is one atomic storage write.
  // The old account-scoped key is a compatibility mirror, never an unowned key.
  validateJournal(journal);
  await storage.setItem(JOURNAL_STATE_KEY, JSON.stringify({ journal, meta }));
  await storage.setItem(JOURNAL_KEY, JSON.stringify(journal));
}
export const loadJournal = (storage: Storage) => lock(storage, async () => (await read(storage)).journal);
export const drainJournalOperations = (userId: string) => locks.get(userId) ?? Promise.resolve();
function changesFor(journal: JournalEntry[], meta: Record<string, Base>) {
  const local = new Map(journal.map(entry => [entry.id, entry]));
  return [...new Set([...local.keys(), ...Object.keys(meta)])].flatMap(id => {
    const entry = local.get(id) ?? null;
    return canonical(entry) === (meta[id]?.base ?? null) ? [] :
      [{ id, entry, expectedRevision: meta[id]?.revision ?? 0 }];
  });
}

// Apply a screen's explicit edits, not its potentially outdated full snapshot:
// a cloud merge may have added records while the screen's save was in flight.
export function saveJournalEdits(storage: Storage, before: JournalEntry[], after: JournalEntry[]) {
  validateJournal(after);
  return lock(storage, async () => {
    const { journal, meta } = await read(storage);
    const previous = new Map(before.map(entry => [entry.id, entry]));
    const updated = new Map(after.map(entry => [entry.id, entry]));
    const current = new Map(journal.map(entry => [entry.id, entry]));
    for (const [id, entry] of updated) {
      const prev = previous.get(id);
      if (canonical(entry) === canonical(prev)) continue;
      const stored = current.get(id);
      if (prev && stored) {
        const merged = { ...stored } as JournalEntry & Record<string, unknown>;
        const beforeFields = prev as JournalEntry & Record<string, unknown>;
        const afterFields = entry as JournalEntry & Record<string, unknown>;
        let collision = false;
        for (const key of new Set([...Object.keys(prev), ...Object.keys(entry)])) {
          if (JSON.stringify(beforeFields[key]) === JSON.stringify(afterFields[key])) continue;
          if (JSON.stringify(merged[key]) !== JSON.stringify(beforeFields[key]) &&
            JSON.stringify(merged[key]) !== JSON.stringify(afterFields[key])) collision = true;
          if (afterFields[key] === undefined) delete merged[key]; else merged[key] = afterFields[key];
        }
        current.set(id, merged);
        if (collision) meta[id] = { revision: 0, base: canonical(prev) };
      } else {
        current.set(id, entry);
        if (prev && !stored) meta[id] = { revision: 0, base: canonical(prev) };
      }
    }
    for (const id of previous.keys()) {
      if (!updated.has(id) && current.has(id)) {
        if (canonical(current.get(id)) !== canonical(previous.get(id))) meta[id] = { revision: 0, base: canonical(previous.get(id)) };
        current.delete(id);
      }
    }
    const merged = [...current.values()].sort((a, b) => b.timestamp - a.timestamp);
    await write(storage, merged, meta);
    return merged;
  });
}

export function syncJournal(storage: Storage, rpc: JournalRpc, upload = true) {
  return lock(storage, async () => {
    const { journal, meta } = await read(storage);
    const changes = changesFor(journal, meta);
    const raw = await rpc(upload ? changes : [], storage.owner) as { entries?: CloudEntry[]; conflicts?: string[] };
    storage.assertActive();
    if (!raw || !Array.isArray(raw.entries) || !Array.isArray(raw.conflicts) ||
      raw.entries.some(row => !row || typeof row.id !== "string" ||
        !Number.isSafeInteger(row.revision) || row.revision < 1 || (row.entry !== null && row.entry?.id !== row.id))) {
      throw new Error("Cloud backup returned an invalid response");
    }
    validateJournal(raw.entries.flatMap(row => row.entry ? [row.entry] : []));
    const current = new Map(journal.map(entry => [entry.id, entry]));
    const conflicts: JournalConflict[] = [];
    const remote = [...raw.entries];
    for (const id of raw.conflicts) if (!remote.some(row => row.id === id)) remote.push({ id, entry: null, revision: 0 });
    for (const row of remote) {
      const local = current.get(row.id) ?? null;
      const dirty = canonical(local) !== (meta[row.id]?.base ?? null);
      const serverChanged = row.revision !== (meta[row.id]?.revision ?? 0);
      if (raw.conflicts.includes(row.id) || (dirty && serverChanged && canonical(local) !== canonical(row.entry))) {
        conflicts.push({ id: row.id, local, cloud: row.entry, revision: row.revision });
        continue;
      }
      if (!dirty || canonical(local) === canonical(row.entry)) {
        if (row.entry) current.set(row.id, row.entry); else current.delete(row.id);
      }
      meta[row.id] = { revision: row.revision, base: canonical(row.entry) };
    }
    const merged = [...current.values()].sort((a, b) => b.timestamp - a.timestamp);
    await write(storage, merged, meta);
    return { journal: merged, conflicts, pending: changesFor(merged, meta).length };
  });
}

export function resolveJournalConflict(storage: Storage, conflict: JournalConflict, choice: "cloud" | "both" | "device") {
  return lock(storage, async () => {
    const { journal, meta } = await read(storage);
    const current = new Map(journal.map(entry => [entry.id, entry]));
    const latestLocal = current.get(conflict.id);
    if (choice === "both" && latestLocal) {
      const copy = { ...latestLocal, id: `journal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` };
      current.set(copy.id, copy);
    }
    if (choice !== "device") {
      if (conflict.cloud) current.set(conflict.id, conflict.cloud); else current.delete(conflict.id);
    }
    meta[conflict.id] = { revision: conflict.revision, base: canonical(conflict.cloud) };
    const result = [...current.values()].sort((a, b) => b.timestamp - a.timestamp);
    await write(storage, result, meta);
    return result;
  });
}
