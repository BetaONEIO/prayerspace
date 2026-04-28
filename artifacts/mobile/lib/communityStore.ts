import { useState, useEffect } from "react";

const COLOR_PALETTES: Array<{ accent: string; gradient: [string, string, string] }> = [
  { accent: "#C4521A", gradient: ["#9E3A0E", "#C4521A", "#D96E27"] },
  { accent: "#2E6DB5", gradient: ["#1A4A8A", "#2E6DB5", "#4A8FD9"] },
  { accent: "#1A7A52", gradient: ["#0F5238", "#1A7A52", "#27A06E"] },
  { accent: "#6B3FA0", gradient: ["#4A2578", "#6B3FA0", "#9B59B6"] },
  { accent: "#B5820A", gradient: ["#7A5400", "#B5820A", "#D4A017"] },
  { accent: "#C43A3A", gradient: ["#8A2020", "#C43A3A", "#E05050"] },
  { accent: "#1A5A7A", gradient: ["#0F3A50", "#1A5A7A", "#2A8AB0"] },
];

const CHURCH_BANNERS = [
  "https://images.unsplash.com/photo-1548625149-720754507716?w=400&q=80",
  "https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=400&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80",
  "https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&q=80",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

export interface StoredCommunity {
  id: string;
  name: string;
  memberCount: number;
  accentColor: string;
  iconLetter: string;
  gradientColors: [string, string, string];
  bannerImage: string;
  isPrivate?: boolean;
  password?: string;
  description?: string;
  isOfficial?: boolean;
  isOwned?: boolean;
  isPremium?: boolean;
  tier?: string | null;
}

let _communities: StoredCommunity[] = [];
const _listeners = new Set<(communities: StoredCommunity[]) => void>();

function notify() {
  _listeners.forEach((fn) => fn([..._communities]));
}

export const communityStore = {
  getAll(): StoredCommunity[] {
    return [..._communities];
  },

  getOwned(): StoredCommunity[] {
    return _communities.filter((c) => c.isOwned);
  },

  /**
   * Called after the owner completes purchase. Creates the community entry
   * derived from the church name set during onboarding.
   */
  addOwnedCommunity(name: string | null, tier: string | null = null): StoredCommunity {
    const safeName = name?.trim() || "My Church";
    const hash = hashName(safeName);
    const palette = COLOR_PALETTES[hash % COLOR_PALETTES.length];
    const banner = CHURCH_BANNERS[hash % CHURCH_BANNERS.length];

    // Deduplicate — remove any prior entry with the same name
    _communities = _communities.filter((c) => !(c.isOwned && c.name === safeName));

    const community: StoredCommunity = {
      id: `owned-${safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${hash % 9999}`,
      name: safeName,
      memberCount: 1,
      accentColor: palette.accent,
      iconLetter: safeName.charAt(0).toUpperCase(),
      gradientColors: palette.gradient,
      bannerImage: banner,
      isOwned: true,
      isPremium: true,
      tier,
      description: "Your prayer community — invite members to get started.",
    };

    _communities = [community, ..._communities];
    console.log("[CommunityStore] Owned community added:", safeName);
    notify();
    return community;
  },

  clear() {
    _communities = [];
    notify();
  },

  subscribe(fn: (communities: StoredCommunity[]) => void): () => void {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

export function useCommunityStore(): StoredCommunity[] {
  const [communities, setCommunities] = useState<StoredCommunity[]>(
    () => communityStore.getAll()
  );
  useEffect(() => {
    setCommunities(communityStore.getAll());
    return communityStore.subscribe(setCommunities);
  }, []);
  return communities;
}
