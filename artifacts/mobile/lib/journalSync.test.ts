import assert from "node:assert/strict";
import test from "node:test";
import { accountStorageKey, createAccountLocalStorage, setLocalDataIdentity } from "./accountLocalData";
import { JOURNAL_KEY, JOURNAL_STATE_KEY, loadJournal, saveJournalEdits, syncJournal, resolveJournalConflict, validateJournal, type JournalEntry, type JournalRpc } from "./journalSync";

const entry = (id = "journal-1", body = "private device text"): JournalEntry =>
  ({ id, title: id, body, tag: "reflection", timestamp: 100, isFavorite: false, isAnswered: false });
function fixture() {
  const data = new Map<string, string>();
  const adapter = { getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); } };
  const owner = { ...setLocalDataIdentity("journal-owner") };
  const storage = createAccountLocalStorage(adapter, owner);
  const rows = new Map<string, { id: string; entry: JournalEntry | null; revision: number }>();
  const rpc: JournalRpc = async changes => {
    const conflicts: string[] = [];
    for (const change of changes) {
      const old = rows.get(change.id);
      if (!old) {
        if (change.expectedRevision) conflicts.push(change.id);
        else rows.set(change.id, { id: change.id, entry: change.entry, revision: 1 });
      } else if (JSON.stringify(old.entry) === JSON.stringify(change.entry)) continue;
      else if (old.revision !== change.expectedRevision) conflicts.push(change.id);
      else rows.set(change.id, { id: change.id, entry: change.entry, revision: old.revision + 1 });
    }
    return { entries: [...rows.values()], conflicts };
  };
  return { data, adapter, owner, storage, rows, rpc };
}

test("first backup uploads only scoped journals; unassigned legacy data stays untouched", async () => {
  const f = fixture();
  f.data.set(JOURNAL_KEY, JSON.stringify([entry("legacy")]));
  await saveJournalEdits(f.storage, [], [entry()]);
  const result = await syncJournal(f.storage, f.rpc);
  assert.equal(result.pending, 0);
  assert.equal(f.rows.size, 1);
  assert.equal(f.rows.has("legacy"), false);
  assert.equal(JSON.parse(f.data.get(JOURNAL_KEY)!)[0].id, "legacy");
});
test("new-device restore downloads cloud records without treating local emptiness as a deletion", async () => {
  const f = fixture(); f.rows.set("journal-1", { id: "journal-1", entry: entry(), revision: 3 });
  const result = await syncJournal(f.storage, f.rpc);
  assert.deepEqual(result.journal, [entry()]);
  assert.equal(f.rows.get("journal-1")!.revision, 3);
});
test("offline edits survive RPC failure", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]);
  await assert.rejects(syncJournal(f.storage, async () => { throw Error("offline"); }), /offline/);
  assert.deepEqual(await loadJournal(f.storage), [entry()]);
});
test("concurrent edits create a conflict and preserve both versions until a decision", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]); await syncJournal(f.storage, f.rpc);
  await saveJournalEdits(f.storage, [entry()], [entry("journal-1", "device edit")]);
  f.rows.set("journal-1", { id: "journal-1", entry: entry("journal-1", "cloud edit"), revision: 2 });
  const result = await syncJournal(f.storage, f.rpc);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.journal[0].body, "device edit");
  assert.equal(result.conflicts[0].cloud?.body, "cloud edit");
  await resolveJournalConflict(f.storage, result.conflicts[0], "both");
  const resolved = await syncJournal(f.storage, f.rpc);
  assert.equal(resolved.conflicts.length, 0);
  assert.deepEqual(resolved.journal.map(item => item.body).sort(), ["cloud edit", "device edit"]);
});
test("offline deletion creates a tombstone and never resurrects a synced deletion", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]); await syncJournal(f.storage, f.rpc);
  await saveJournalEdits(f.storage, [entry()], []);
  assert.equal((await syncJournal(f.storage, f.rpc)).journal.length, 0);
  assert.equal(f.rows.get("journal-1")!.entry, null);
  assert.equal((await syncJournal(f.storage, f.rpc)).journal.length, 0);
});
test("a deletion conflicting with another device's edit requires a decision", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]); await syncJournal(f.storage, f.rpc);
  await saveJournalEdits(f.storage, [entry()], []);
  f.rows.set("journal-1", { id: "journal-1", entry: entry("journal-1", "new cloud edit"), revision: 2 });
  const result = await syncJournal(f.storage, f.rpc);
  assert.equal(result.conflicts[0].local, null);
  await resolveJournalConflict(f.storage, result.conflicts[0], "cloud");
  assert.equal((await syncJournal(f.storage, f.rpc)).journal[0].body, "new cloud edit");
});
test("a delayed cloud result after A-B-A cannot touch storage", async () => {
  const f = fixture();
  const result = syncJournal(f.storage, async () => {
    setLocalDataIdentity("other"); setLocalDataIdentity("journal-owner");
    return { entries: [{ id: "journal-1", entry: entry(), revision: 1 }], conflicts: [] };
  });
  await assert.rejects(result, /session has changed/);
  assert.equal(f.data.has(accountStorageKey("journal-owner", JOURNAL_STATE_KEY)), false);
});
test("an edit based on a pre-sync screen cannot discard newly restored records", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]);
  f.rows.set("journal-2", { id: "journal-2", entry: entry("journal-2"), revision: 1 });
  await syncJournal(f.storage, f.rpc);
  const saved = await saveJournalEdits(f.storage, [entry()], [entry("journal-1", "edit")]);
  assert.equal(saved.length, 2);
});
test("an edit during sync preserves unrelated remote fields", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]); await syncJournal(f.storage, f.rpc);
  f.rows.set("journal-1", { id: "journal-1", entry: entry("journal-1", "remote new body"), revision: 2 });
  await syncJournal(f.storage, f.rpc);
  await saveJournalEdits(f.storage, [entry()], [{ ...entry(), isFavorite: true }]);
  const result = await syncJournal(f.storage, f.rpc);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.journal[0].body, "remote new body");
  assert.equal(result.journal[0].isFavorite, true);
});
test("same-field edits during sync force a conflict instead of overwriting unseen cloud changes", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]); await syncJournal(f.storage, f.rpc);
  f.rows.set("journal-1", { id: "journal-1", entry: entry("journal-1", "cloud new body"), revision: 2 });
  await syncJournal(f.storage, f.rpc);
  await saveJournalEdits(f.storage, [entry()], [entry("journal-1", "device new body")]);
  const result = await syncJournal(f.storage, f.rpc);
  assert.equal(result.conflicts.length, 1);
  assert.equal(f.rows.get("journal-1")!.entry?.body, "cloud new body");
  assert.equal(result.journal[0].body, "device new body");
});
test("a deletion during sync does not delete a newly changed cloud entry silently", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]); await syncJournal(f.storage, f.rpc);
  f.rows.set("journal-1", { id: "journal-1", entry: entry("journal-1", "remote edit"), revision: 2 });
  await syncJournal(f.storage, f.rpc);
  await saveJournalEdits(f.storage, [entry()], []);
  const result = await syncJournal(f.storage, f.rpc);
  assert.equal(result.conflicts.length, 1);
  assert.equal(f.rows.get("journal-1")!.entry?.body, "remote edit");
});
test("restore without enabling backup never uploads device entries", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]);
  f.rows.set("journal-2", { id: "journal-2", entry: entry("journal-2"), revision: 1 });
  const result = await syncJournal(f.storage, f.rpc, false);
  assert.equal(result.journal.length, 2); assert.equal(result.pending, 1);
  assert.equal(f.rows.has("journal-1"), false);
});
test("malformed cloud response cannot replace a valid local journal", async () => {
  const f = fixture(); await saveJournalEdits(f.storage, [], [entry()]);
  await assert.rejects(syncJournal(f.storage, async () => ({ entries: [{}], conflicts: [] })), /invalid response/);
  assert.deepEqual(await loadJournal(f.storage), [entry()]);
});
test("journal shape and duplicate IDs are validated", () => {
  assert.throws(() => validateJournal({}), /safely/);
  assert.throws(() => validateJournal([entry(), entry()]), /safely/);
});
