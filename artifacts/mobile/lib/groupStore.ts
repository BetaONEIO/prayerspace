import { useState, useEffect } from "react";

export type MemberRole = "Admin" | "Leader" | "Member";

export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: MemberRole;
  isOnline: boolean;
  joinedDate?: string;
}

export type FocusCategory = "Prayer" | "Bible Study" | "Support" | "Testimony";
export type PrivacyType = "Private" | "Public";

export interface GroupState {
  id: string;
  name: string;
  description: string;
  photoUri: string | null;
  privacy: PrivacyType;
  safeSpace: boolean;
  focus: FocusCategory;
  members: GroupMember[];
}

const DEFAULT_MEMBERS: GroupMember[] = [
  { id: "m1", name: "Pastor Michael", avatar: "https://randomuser.me/api/portraits/men/32.jpg", role: "Admin", isOnline: true, joinedDate: "Founder" },
  { id: "m2", name: "Alice Thompson", avatar: "https://randomuser.me/api/portraits/women/62.jpg", role: "Admin", isOnline: true, joinedDate: "Since Jan 2023" },
  { id: "m3", name: "David Chen", avatar: "https://randomuser.me/api/portraits/men/85.jpg", role: "Leader", isOnline: false, joinedDate: "Since Mar 2023" },
  { id: "m4", name: "Emma Watson", avatar: "https://randomuser.me/api/portraits/women/44.jpg", role: "Leader", isOnline: true, joinedDate: "Since Jun 2023" },
  { id: "m5", name: "Chloe Martin", avatar: "https://randomuser.me/api/portraits/women/24.jpg", role: "Member", isOnline: true, joinedDate: "Since Aug 2023" },
  { id: "m6", name: "Bob Jenkins", avatar: "https://randomuser.me/api/portraits/men/42.jpg", role: "Member", isOnline: false, joinedDate: "Since Sep 2023" },
  { id: "m7", name: "Diana Prince", avatar: "https://randomuser.me/api/portraits/women/33.jpg", role: "Member", isOnline: true, joinedDate: "Since Oct 2023" },
  { id: "m8", name: "Chris Evans", avatar: "https://randomuser.me/api/portraits/men/12.jpg", role: "Member", isOnline: false, joinedDate: "Since Nov 2023" },
];

function makeDefault(id: string): GroupState {
  return {
    id,
    name: "Grace Community",
    description: "A welcoming space for prayer, encouragement, and growing together in faith.",
    photoUri: null,
    privacy: "Private",
    safeSpace: true,
    focus: "Prayer",
    members: DEFAULT_MEMBERS.map((m) => ({ ...m })),
  };
}

type Listener = (state: GroupState) => void;

const _groups = new Map<string, GroupState>();
const _listeners = new Map<string, Set<Listener>>();

function getOrCreate(id: string): GroupState {
  if (!_groups.has(id)) {
    _groups.set(id, makeDefault(id));
  }
  return _groups.get(id)!;
}

export const groupStore = {
  get(id: string): GroupState {
    return getOrCreate(id);
  },

  update(id: string, patch: Partial<Omit<GroupState, "id">>) {
    const current = getOrCreate(id);
    const next: GroupState = { ...current, ...patch };
    _groups.set(id, next);
    _listeners.get(id)?.forEach((fn) => fn(next));
  },

  subscribe(id: string, fn: Listener): () => void {
    if (!_listeners.has(id)) _listeners.set(id, new Set());
    _listeners.get(id)!.add(fn);
    return () => _listeners.get(id)?.delete(fn);
  },
};

export function useGroupState(id: string): GroupState {
  const [state, setState] = useState<GroupState>(() => groupStore.get(id));

  useEffect(() => {
    setState(groupStore.get(id));
    return groupStore.subscribe(id, setState);
  }, [id]);

  return state;
}

export interface CreatedGroupPayload {
  id: string;
  name: string;
  avatar: string | null;
  focus: FocusCategory | null;
  privacy: PrivacyType;
  safeSpace: boolean;
}

type CreatedListener = () => void;

// Immutable snapshot — replaced (never mutated) on each emit so
// useSyncExternalStore detects the change via reference equality.
let _createdSnapshot: CreatedGroupPayload[] = [];
const _createdSubscribers = new Set<CreatedListener>();

export const groupCreatedStore = {
  /**
   * useSyncExternalStore-compatible subscribe.
   * Returns an unsubscribe function.
   */
  subscribe(fn: CreatedListener): () => void {
    _createdSubscribers.add(fn);
    return () => _createdSubscribers.delete(fn);
  },

  /**
   * useSyncExternalStore-compatible snapshot getter.
   * Always returns the same reference unless emit() was called.
   */
  getSnapshot(): CreatedGroupPayload[] {
    return _createdSnapshot;
  },

  emit(group: CreatedGroupPayload) {
    if (_createdSnapshot.some((g) => g.id === group.id)) return;
    // Replace the array (new reference) so subscribers are notified
    _createdSnapshot = [group, ..._createdSnapshot];
    _createdSubscribers.forEach((fn) => fn());
  },

  // ── kept for call-sites that haven't been updated ─────────────────────────
  /** @deprecated Use the returned cleanup from subscribe() instead. */
  register(fn: (group: CreatedGroupPayload) => void): () => void {
    // Wrap so the stored subscriber matches the CreatedListener signature
    const wrapped: CreatedListener = () => {
      const latest = _createdSnapshot[0];
      if (latest) fn(latest);
    };
    _createdSubscribers.add(wrapped);
    return () => _createdSubscribers.delete(wrapped);
  },
  /** @deprecated No-op — cleanup is handled by the return value of subscribe(). */
  unregister() {},
};
