export type TourStep = {
  title: string; description: string; emptyDescription?: string;
  target: string; fallback?: string;
  route: "/(tabs)/community" | "/find-friend" | "/" | "/journal" | "/my-posts" | "/meditative-prayer" | "/prayer-mode" | "/select-recipients";
  section?: "Feed" | "Groups" | "Community";
};

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Your Prayer Feed", target: "feed-nav", route: "/(tabs)/community", section: "Feed",
    description: "See prayer requests and updates shared by your friends and communities. Your feed grows as you connect with people.",
  },
  {
    title: "Share What's on Your Heart", target: "create-prayer", fallback: "feed-nav", route: "/(tabs)/community", section: "Feed",
    description: "Create a prayer request and choose who can see it. Tap Open Prayer Form to try the real form safely, without publishing.",
  },
  {
    title: "Pray Together", target: "prayer-controls", fallback: "feed-empty", route: "/(tabs)/community", section: "Feed",
    description: "Let others know you're praying for them and encourage them through their journey. Use the prayer button to show support, or comments to encourage them.",
    emptyDescription: "There's no prayer from someone else to highlight yet. When friends share a request here, use its prayer button to show you're praying, or add an encouraging comment. This tour doesn't add sample data.",
  },
  {
    title: "Connect with Friends", target: "find-friends", route: "/find-friend",
    description: "Find people you know, send Friend Requests and stay connected through prayer. Search a name, then use the + person button beside a result to send a request when you're ready. This tour never sends one for you.",
  },
  {
    title: "Pray in Smaller Groups", target: "groups-nav", route: "/(tabs)/community", section: "Groups",
    description: "Create or join a Prayer Group to pray regularly with friends, family or others. Use the + button to create a group, invite friends and share prayer requests together.",
  },
  {
    title: "Bring Your Community Together", target: "communities-nav", route: "/(tabs)/community", section: "Community",
    description: "Join your church or ministry's Prayer Community, or create your own. You can create a free Prayer Community with up to 10 members. You don't need to join or create one now.",
  },
  {
    title: "Celebrate Answered Prayers", target: "answered-controls", fallback: "answered-filter", route: "/(tabs)/community", section: "Feed",
    description: "Update your prayer requests and share what God has done. In Mine, use Add update or Mark as answered on your own request. If you haven't shared a prayer yet, these controls appear after you do.",
  },
  {
    title: "Your Prayer Journal", target: "journal-tour", route: "/journal",
    description: "Keep your reflections, prayers and answered prayers together. Add a written or recorded entry, revisit it later, and keep track of the people you're praying for. Your journal can stay private.",
  },
  {
    title: "Your Prayer Requests", target: "requests-tour", route: "/my-posts",
    description: "My Prayer Requests brings your own requests together so you can revisit them and share updates. To ask friends for prayer, write a prayer, choose the Prayer Request tag, then choose who receives it.",
  },
  {
    title: "Make Time to Pray Solo", target: "solo-tour", route: "/meditative-prayer",
    description: "Prayer Space gives you a quiet moment to pause, reflect and spend time with God. Choose Begin Prayer when you're ready, with sound on or off. You don't need to start a session during this tour.",
  },
  {
    title: "Write or Record a Prayer", target: "record-tour", route: "/prayer-mode",
    description: "Choose Text to write your prayer or Voice to record it. You decide when recording begins, and can review your words before sharing. You can continue this tour without using your microphone.",
  },
  {
    title: "Send Prayers to Your Friends", target: "share-tour", route: "/select-recipients",
    description: "Choose the friends, group or community you want to pray for or ask for prayer. Use Send to from the prayer screen to choose recipients, then review before confirming. Nothing is selected or sent by this tour.",
  },
  {
    title: "You're Ready to Get Started!", target: "", route: "/",
    description: "Your prayer journey starts here. Share a prayer, connect with friends or spend a moment praying for someone today.",
  },
];
export const TOUR_STEP_COUNT = TOUR_STEPS.length;
export const TOUR_FINAL_STEP = TOUR_STEP_COUNT - 1;

export type TourStatus = "not_started" | "in_progress" | "completed" | "skipped";
export type TourProgress = { status: TourStatus; step: number; updated_at: string };

export function parseTourProgress(value: unknown): TourProgress | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!["not_started", "in_progress", "completed", "skipped"].includes(String(row.status)) ||
    !Number.isInteger(row.step) || Number(row.step) < 0 || Number(row.step) >= TOUR_STEPS.length ||
    typeof row.updated_at !== "string" || !Number.isFinite(Date.parse(row.updated_at))) return null;
  return { status: row.status as TourStatus, step: Number(row.step), updated_at: row.updated_at };
}

export function newestTourProgress(local: TourProgress | null, remote: TourProgress | null): TourProgress | null {
  if (!local) return remote;
  if (!remote) return local;
  return Date.parse(local.updated_at) > Date.parse(remote.updated_at) ? local : remote;
}
