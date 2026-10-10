import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AccountChangedError, accountStorageKey, createAccountLocalStorage,
  getLocalDataIdentity, setLocalDataIdentity, type LocalStorageAdapter,
} from "./accountLocalData";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); },
  };
}

function scope(adapter: LocalStorageAdapter, account: string | null) {
  return createAccountLocalStorage(adapter, setLocalDataIdentity(account));
}

test("all private resources are isolated and unowned legacy records remain untouched", async () => {
  const keys = ["prayers", "journal", "settings", "stats", "reminders", "archived_posts", "your_people", "favourites"]
    .map(name => `prayerful_${name}`);
  const adapter = memoryStorage(Object.fromEntries(keys.map(key => [key, "unassigned"])));
  const a = scope(adapter, "account-a");
  for (const key of keys) {
    assert.equal(await a.getItem(key), null);
    await a.setItem(key, "account-a-private");
  }
  const b = scope(adapter, "account-b");
  for (const key of keys) {
    assert.equal(await b.getItem(key), null);
    await b.setItem(key, "account-b-private");
  }
  const returningA = scope(adapter, "account-a");
  for (const key of keys) {
    assert.equal(await returningA.getItem(key), "account-a-private");
    assert.equal(adapter.values.get(key), "unassigned");
    assert.equal(adapter.values.get(accountStorageKey("account-b", key)), "account-b-private");
  }
});

test("signed-out storage cannot read or write any account data", async () => {
  const adapter = memoryStorage();
  const signedOut = scope(adapter, null);
  await assert.rejects(signedOut.getItem("prayerful_journal"), AccountChangedError);
  await assert.rejects(signedOut.setItem("prayerful_journal", "private"), AccountChangedError);
  assert.equal(adapter.values.size, 0);
});

test("a stale callback cannot save after logout, switch, or A -> B -> A", async () => {
  const adapter = memoryStorage();
  const a = scope(adapter, "account-a");
  await a.setItem("prayerful_journal", "saved");
  scope(adapter, null);
  await assert.rejects(a.setItem("prayerful_journal", "after logout"), AccountChangedError);
  scope(adapter, "account-b");
  await assert.rejects(a.setItem("prayerful_journal", "into b"), AccountChangedError);
  const returningA = scope(adapter, "account-a");
  await assert.rejects(a.setItem("prayerful_journal", "old session"), AccountChangedError);
  assert.equal(await returningA.getItem("prayerful_journal"), "saved");
});

test("token refresh for the same account keeps the local identity valid", async () => {
  const adapter = memoryStorage();
  const a = scope(adapter, "account-a");
  const before = getLocalDataIdentity().epoch;
  setLocalDataIdentity("account-a");
  assert.equal(getLocalDataIdentity().epoch, before);
  await a.setItem("prayerful_journal", "still active");
  assert.equal(await a.getItem("prayerful_journal"), "still active");
});

test("an in-flight read from A cannot publish data after switching to B", async () => {
  let release!: (value: string) => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const adapter = {
    getItem: () => new Promise<string>(resolve => { release = resolve; started(); }),
    setItem: async () => {},
  };
  const a = scope(adapter, "account-a");
  const read = a.getItem("prayerful_journal");
  await began;
  scope(adapter, "account-b");
  const rejected = assert.rejects(read, AccountChangedError);
  release("account-a-private");
  await rejected;
});

test("an already-started save only touches A's key, never B; returning A waits for it", async () => {
  const values = new Map<string, string>();
  let release!: () => void;
  let started!: () => void;
  const began = new Promise<void>(resolve => { started = resolve; });
  const adapter = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => new Promise<void>(resolve => {
      release = () => { values.set(key, value); resolve(); };
      started();
    }),
  };
  const a = scope(adapter, "account-a");
  const save = a.setItem("prayerful_journal", "saved before switch");
  await began;
  const rejected = assert.rejects(save, AccountChangedError);
  const b = scope(adapter, "account-b");
  assert.equal(await b.getItem("prayerful_journal"), null);
  const returningA = scope(adapter, "account-a");
  const read = returningA.getItem("prayerful_journal");
  release();
  await rejected;
  assert.equal(await read, "saved before switch");
  assert.equal(values.has(accountStorageKey("account-b", "prayerful_journal")), false);
});

test("queued saves cancel on an identity change without writing a new record", async () => {
  const adapter = memoryStorage();
  const a = scope(adapter, "account-a");
  const save = a.setItem("prayerful_journal", "must not save");
  scope(adapter, "account-b");
  await assert.rejects(save, AccountChangedError);
  assert.equal(adapter.values.size, 0);
});

test("storage failures propagate and do not poison the next queued save", async () => {
  const adapter = memoryStorage();
  let fail = true;
  const failing = {
    getItem: adapter.getItem,
    setItem: async (key: string, value: string) => {
      if (fail) { fail = false; throw new Error("Disk full"); }
      return adapter.setItem(key, value);
    },
  };
  const a = scope(failing, "account-a");
  await assert.rejects(a.setItem("prayerful_journal", "unsaved"), /Disk full/);
  await a.setItem("prayerful_journal", "retry saved");
  assert.equal(await a.getItem("prayerful_journal"), "retry saved");
});

test("account IDs containing separators cannot collide with another namespace", () => {
  assert.notEqual(accountStorageKey("a:b", "c"), accountStorageKey("a", "b:c"));
  assert.throws(() => accountStorageKey("", "prayerful_journal"), AccountChangedError);
});
