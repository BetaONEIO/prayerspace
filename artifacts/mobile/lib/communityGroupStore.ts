import { useState, useEffect } from "react";

export type CommunityGroupPrivacy = "Public" | "Private";
export type CommunityGroupFocus = "Prayer" | "Bible Study" | "Support" | "Testimony";

export interface CommunityGroup {
  id: string;
  communityId: string;
  name: string;
  description: string;
  memberCount: number;
  privacy: CommunityGroupPrivacy;
  focus: CommunityGroupFocus;
  isJoined: boolean;
  lastActivity: string;
  photoUri: string | null;
}

const SEED_GROUPS: CommunityGroup[] = [
  {
    id: "cg-cc-1",
    communityId: "castle-church",
    name: "Morning Prayer Circle",
    description: "Start each day in prayer together. Daily 6am intercession for the community.",
    memberCount: 18,
    privacy: "Public",
    focus: "Prayer",
    isJoined: true,
    lastActivity: "2 hours ago",
    photoUri: null,
  },
  {
    id: "cg-cc-2",
    communityId: "castle-church",
    name: "Healing & Restoration",
    description: "A safe, private space to bring prayers for physical and emotional healing.",
    memberCount: 11,
    privacy: "Private",
    focus: "Support",
    isJoined: false,
    lastActivity: "Yesterday",
    photoUri: null,
  },
  {
    id: "cg-cc-3",
    communityId: "castle-church",
    name: "Sunday Bible Study",
    description: "Weekly deep-dive into scripture alongside our pastoral team.",
    memberCount: 24,
    privacy: "Public",
    focus: "Bible Study",
    isJoined: false,
    lastActivity: "3 days ago",
    photoUri: null,
  },
  {
    id: "cg-hc-1",
    communityId: "hope-church",
    name: "Youth Prayer",
    description: "A vibrant group for young adults to pray and grow together in faith.",
    memberCount: 15,
    privacy: "Public",
    focus: "Prayer",
    isJoined: true,
    lastActivity: "1 hour ago",
    photoUri: null,
  },
  {
    id: "cg-hc-2",
    communityId: "hope-church",
    name: "Family Life",
    description: "Prayer support for marriages, parenting and family challenges.",
    memberCount: 9,
    privacy: "Private",
    focus: "Support",
    isJoined: false,
    lastActivity: "Yesterday",
    photoUri: null,
  },
  {
    id: "cg-cl-1",
    communityId: "city-light",
    name: "City Intercession",
    description: "Praying for our city, local government, and community transformation.",
    memberCount: 32,
    privacy: "Public",
    focus: "Prayer",
    isJoined: true,
    lastActivity: "Just now",
    photoUri: null,
  },
  {
    id: "cg-cl-2",
    communityId: "city-light",
    name: "Women of Faith",
    description: "A private group of women interceding for one another and their families.",
    memberCount: 14,
    privacy: "Private",
    focus: "Support",
    isJoined: false,
    lastActivity: "2 days ago",
    photoUri: null,
  },
  {
    id: "cg-ya-1",
    communityId: "young-adults",
    name: "Thursday Night Prayer",
    description: "Our weekly gathering for worship and corporate intercession.",
    memberCount: 22,
    privacy: "Public",
    focus: "Prayer",
    isJoined: true,
    lastActivity: "Just now",
    photoUri: null,
  },
];

let _groups: CommunityGroup[] = [...SEED_GROUPS];
type Listener = (groups: CommunityGroup[]) => void;
const _listeners = new Set<Listener>();

function notify() {
  const snapshot = [..._groups];
  _listeners.forEach((fn) => fn(snapshot));
}

export const communityGroupStore = {
  getAll(): CommunityGroup[] {
    return [..._groups];
  },

  getByCommunity(communityId: string): CommunityGroup[] {
    return _groups.filter((g) => g.communityId === communityId);
  },

  add(group: Omit<CommunityGroup, "id">): CommunityGroup {
    const newGroup: CommunityGroup = { ...group, id: `cg-${Date.now()}` };
    _groups = [newGroup, ..._groups];
    notify();
    return newGroup;
  },

  join(groupId: string): void {
    _groups = _groups.map((g) =>
      g.id === groupId ? { ...g, isJoined: true, memberCount: g.memberCount + 1, lastActivity: "Just now" } : g
    );
    notify();
  },

  subscribe(fn: Listener): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

export function useCommunityGroups(communityId: string): CommunityGroup[] {
  const [groups, setGroups] = useState<CommunityGroup[]>(() =>
    communityGroupStore.getByCommunity(communityId)
  );

  useEffect(() => {
    setGroups(communityGroupStore.getByCommunity(communityId));
    return communityGroupStore.subscribe((all) => {
      setGroups(all.filter((g) => g.communityId === communityId));
    });
  }, [communityId]);

  return groups;
}
