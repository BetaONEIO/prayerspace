// Account identity is updated synchronously by the auth callback, before React
// renders. Epochs also invalidate callbacks from an A -> B -> A session change.
export interface LocalDataIdentity {
  userId: string | null;
  epoch: number;
}

let identity: LocalDataIdentity = { userId: null, epoch: 0 };

export function getLocalDataIdentity(): LocalDataIdentity {
  return identity;
}

export function setLocalDataIdentity(userId: string | null): LocalDataIdentity {
  if (identity.userId !== userId) {
    identity = { userId, epoch: identity.epoch + 1 };
  }
  return identity;
}

export class AccountChangedError extends Error {
  constructor() {
    super("This account session has changed. Please reopen the screen.");
    this.name = "AccountChangedError";
  }
}

export function assertLocalDataIdentity(owner: LocalDataIdentity): void {
  if (!owner.userId || owner.userId !== identity.userId || owner.epoch !== identity.epoch) {
    throw new AccountChangedError();
  }
}

export function accountStorageKey(userId: string, legacyKey: string): string {
  if (!userId) throw new AccountChangedError();
  return `prayerful_account:${encodeURIComponent(userId)}:${legacyKey}`;
}

export interface LocalStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}

// Serialize by adapter and fully scoped key. Reads after a pending write see
// that write, including after returning to the same account in a new session.
const queues = new WeakMap<LocalStorageAdapter, Map<string, Promise<void>>>();
export async function drainAccountStorage(adapter: LocalStorageAdapter, userId: string) {
  const prefix = accountStorageKey(userId, "");
  await Promise.all([...(queues.get(adapter) ?? [])].filter(([key]) => key.startsWith(prefix)).map(([, work]) => work));
}

export function createAccountLocalStorage(adapter: LocalStorageAdapter, owner: LocalDataIdentity) {
  const snapshot = { ...owner };
  let queue = queues.get(adapter);
  if (!queue) {
    queue = new Map();
    queues.set(adapter, queue);
  }
  const pending = queue;
  const run = <T>(legacyKey: string, operation: (key: string) => Promise<T>): Promise<T> => {
    try {
      assertLocalDataIdentity(snapshot);
    } catch (error) {
      return Promise.reject(error);
    }
    const key = accountStorageKey(snapshot.userId!, legacyKey);
    const task = (pending.get(key) ?? Promise.resolve()).then(async () => {
      assertLocalDataIdentity(snapshot);
      const result = await operation(key);
      assertLocalDataIdentity(snapshot);
      return result;
    });
    const settled = task.then(() => undefined, () => undefined);
    pending.set(key, settled);
    void settled.then(() => {
      if (pending.get(key) === settled) pending.delete(key);
    });
    return task;
  };

  return {
    owner: snapshot,
    assertActive: () => assertLocalDataIdentity(snapshot),
    isActive: () => !!snapshot.userId &&
      snapshot.userId === identity.userId && snapshot.epoch === identity.epoch,
    getItem: (legacyKey: string) => run(legacyKey, key => adapter.getItem(key)),
    setItem: (legacyKey: string, value: string) =>
      run(legacyKey, key => adapter.setItem(key, value)),
  };
}
