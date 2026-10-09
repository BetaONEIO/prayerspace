import { useState, useEffect } from "react";
import { supabase } from "./supabase";

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

  async reload(expectedUserId?: string): Promise<StoredCommunity[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId || (expectedUserId && expectedUserId !== userId)) throw new Error("Please sign in to load communities");
    const { data, error } = await supabase.rpc("get_my_communities");
    if (error) throw error;
    const { data: { session: current } } = await supabase.auth.getSession();
    if (current?.user.id !== userId) throw new Error("The signed-in account changed");
    _communities = (data ?? []).map((row: {
      id: string; name: string; description: string | null; member_count: number;
      owner_id: string | null; is_private: boolean; is_official: boolean;
      accent_color: string | null; icon_letter: string | null; banner_image: string | null;
    }) => {
      const hash = hashName(row.name);
      const palette = COLOR_PALETTES[hash % COLOR_PALETTES.length];
      return {
        id: row.id, name: row.name, description: row.description ?? undefined,
        memberCount: row.member_count, isOwned: row.owner_id === userId,
        isPrivate: row.is_private, isOfficial: row.is_official,
        accentColor: row.accent_color ?? palette.accent,
        iconLetter: row.icon_letter ?? row.name.charAt(0).toUpperCase(),
        gradientColors: palette.gradient,
        bannerImage: row.banner_image ?? CHURCH_BANNERS[hash % CHURCH_BANNERS.length],
        isPremium: false, tier: "church_free",
      };
    });
    notify();
    return [..._communities];
  },

  async join(id: string): Promise<void> {
    const { error } = await supabase.rpc("join_prayer_community", { community: id });
    if (error) throw error;
    await communityStore.reload();
  },

  /**
   * Creates a real free community after onboarding. Ownership is established
   * by the authenticated database RPC; local tier values never grant paid access.
   */
  async addOwnedCommunity(name: string | null, _tier: string | null = null,
    details: { description?: string; location?: string; denomination?: string | null } = {}): Promise<StoredCommunity> {
    const { error, data: id } = await supabase.rpc("create_prayer_community", {
      community_name: name?.trim() || "My Church",
      community_description: details.description?.trim() || null,
      community_location: details.location?.trim() || null,
      community_denomination: details.denomination ?? null,
    });
    if (error) throw error;
    const rows = await communityStore.reload();
    const saved = rows.find((row) => row.id === id);
    if (!saved) throw new Error("Community was saved but could not be reloaded. Please retry.");
    return saved;
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
