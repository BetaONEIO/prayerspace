export type TourStep = {
  title: string; description: string; emptyDescription?: string;
  target: string; fallback?: string;
  route: "/(tabs)/community" | "/find-friend" | "/" | "/journal" | "/my-posts" | "/meditative-prayer" | "/prayer-mode" | "/select-recipients";
  section?: "Feed" | "Groups" | "Community";
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Your Prayer Feed", target: "prayer-controls", fallback: "feed-empty", route: "/(tabs)/community", section: "Feed",
    description: "Follow prayers from friends and communities. Use Pray or comments to encourage others. In Mine, add updates and mark your own prayers answered.",
    emptyDescription: "Your feed grows as friends share prayers. Use Pray or comments to encourage them, and Mine to update your own requests and mark them answered. No sample prayers are added.",
  },
  {
    title: "Share What's on Your Heart", target: "create-prayer", fallback: "feed-nav", route: "/(tabs)/community", section: "Feed",
    description: "Ask friends or your community for prayer and choose who can see it. Find your requests in My Prayer Requests. Open Prayer Form to practise without posting.",
  },
  {
    title: "Connect and Pray Together", target: "groups-nav", route: "/(tabs)/community", section: "Groups",
    description: "Find Friends in the menu, pray in smaller Groups, or join your church's Community. You can create a free community for up to 10 members. Joining and inviting are optional.",
  },
  {
    title: "Your Prayer Journal", target: "journal-tour", route: "/journal",
    description: "Keep private written or recorded prayers and reflections in your journal. Revisit entries, remember answered prayers and keep track of the people you're praying for.",
  },
  {
    title: "Pray Your Way", target: "record-tour", route: "/prayer-mode",
    description: "Write with Text or record with Voice, then review and use Send to to share with friends. For solo prayer, choose Prayer Space from the Pray tab. Nothing records or sends automatically.",
  },
];
export const TOUR_STEP_COUNT = TOUR_STEPS.length;
export const TOUR_FINAL_STEP = TOUR_STEP_COUNT - 1;

export type TourStatus = "not_started" | "in_progress" | "completed" | "skipped";
export type TourProgress = { status: TourStatus; step: number; updated_at: string; tour_version: 2 };

export function parseTourProgress(value: unknown): TourProgress | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const version = row.tour_version ?? 1;
  if (![1, 2].includes(Number(version)) || typeof version !== "number" ||
    !["not_started", "in_progress", "completed", "skipped"].includes(String(row.status)) ||
    !Number.isInteger(row.step) || Number(row.step) < 0 || Number(row.step) >= (version === 1 ? 13 : TOUR_STEPS.length) ||
    typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at))) return null;
  // Preserve terminal status and resume older tours at the matching feature,
  // rather than restarting them or interpreting an old index as a new chapter.
  const legacySteps = [0, 1, 0, 2, 2, 2, 0, 3, 1, 4, 4, 4, 4];
  const step = version === 1
    ? row.status === "completed" || row.status === "skipped" ? TOUR_FINAL_STEP : legacySteps[Number(row.step)]
    : Number(row.step);
  return { status: row.status as TourStatus, step, updated_at: row.updated_at, tour_version: 2 };
}

export function newestTourProgress(local: TourProgress | null, remote: TourProgress | null): TourProgress | null {
  if (!local) return remote;
  if (!remote) return local;
  return Date.parse(local.updated_at) > Date.parse(remote.updated_at) ? local : remote;
}
