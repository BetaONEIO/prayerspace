import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { AppState } from "react-native";

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

export interface DiscoverCommunity {
  id: string;
  name: string;
  memberCount: number;
  accentColor: string;
  iconLetter: string;
  gradientColors: [string, string, string];
  bannerImage: string;
  isPrivate?: boolean;
  description?: string;
  isOfficial?: boolean;
}

type DBRow = {
  id: string;
  name: string;
  description?: string | null;
  member_count?: number | null;
  is_official?: boolean | null;
  is_private?: boolean | null;
  accent_color?: string | null;
  icon_letter?: string | null;
  banner_image?: string | null;
};

function mapRow(row: DBRow): DiscoverCommunity {
  const hash = hashName(row.name);
  const palette = COLOR_PALETTES[hash % COLOR_PALETTES.length];
  const banner = CHURCH_BANNERS[hash % CHURCH_BANNERS.length];
  return {
    id: row.id,
    name: row.name,
    memberCount: row.member_count ?? 0,
    accentColor: row.accent_color ?? palette.accent,
    iconLetter: row.icon_letter ?? row.name.charAt(0).toUpperCase(),
    gradientColors: palette.gradient,
    bannerImage: row.banner_image ?? banner,
    isPrivate: row.is_private ?? false,
    description: row.description ?? undefined,
    isOfficial: row.is_official ?? false,
  };
}

export function useDiscoverCommunities(searchQuery: string) {
  const [communities, setCommunities] = useState<DiscoverCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(() => setRetryCount((n) => n + 1), []);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") refetch();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === "active") refetch();
    }, 60000);
    return () => { listener.remove(); clearInterval(interval); };
  }, [refetch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let active = true;
    const controller = new AbortController();
    const delay = searchQuery.trim() ? 300 : 0;
    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        let query = supabase
          .from("communities")
          .select("id, name, description, member_count, is_official, is_private, accent_color, icon_letter, banner_image")
          .eq("is_private", false)
          .order("is_official", { ascending: false })
          .order("member_count", { ascending: false })
          .order("id", { ascending: true })
          .limit(50)
          .abortSignal(controller.signal);

        if (searchQuery.trim()) {
          // Quote the filter value so commas/parentheses in a community name
          // cannot become additional PostgREST filter expressions.
          const term = JSON.stringify(`%${searchQuery.trim().replace(/[\\%_]/g, "\\$&")}%`);
          query = query.or(`name.ilike.${term},description.ilike.${term}`);
        }

        const { data, error: sbError } = await query;
        if (!active) return;

        if (sbError) {
          setCommunities([]);
          const isTableMissing =
            sbError.code === "42P01" || sbError.code === "PGRST205";
          setError(isTableMissing
            ? "Community discovery isn't set up yet. Please try again later."
            : "We couldn't load communities right now.");
        } else {
          setCommunities(((data ?? []) as DBRow[]).map(mapRow));
        }
      } catch {
        if (!active) return;
        setCommunities([]);
        setError("We couldn't load communities right now.");
      } finally {
        if (active) setLoading(false);
      }
    }, delay);

    return () => {
      active = false;
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, retryCount]);

  return { communities, loading, error, refetch };
}
