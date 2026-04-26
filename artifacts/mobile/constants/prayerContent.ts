export interface PrayerTag {
  id: string;
  label: string;
  emoji: string;
}

export const PRAYER_TAGS: PrayerTag[] = [
  { id: "prayer_request", label: "Prayer Request", emoji: "🙏" },
  { id: "urgent", label: "Urgent Prayer Request", emoji: "⚡" },
  { id: "praise", label: "Praise Report", emoji: "🎉" },
  { id: "testimony", label: "Testimony", emoji: "✨" },
  { id: "update", label: "Update", emoji: "📣" },
  { id: "gratitude", label: "Gratitude", emoji: "💛" },
  { id: "healing", label: "Healing", emoji: "💚" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { id: "work", label: "Work", emoji: "💼" },
  { id: "church", label: "Church", emoji: "⛪" },
  { id: "guidance", label: "Guidance", emoji: "🧭" },
  { id: "provision", label: "Provision", emoji: "🌾" },
];

export interface AudienceOption {
  key: string;
  label: string;
  sublabel?: string;
  type: "everyone" | "community" | "group";
}

export const AUDIENCE_OPTIONS: AudienceOption[] = [
  { key: "everyone", label: "Feed", sublabel: "Visible to all members", type: "everyone" },
  { key: "grace-community", label: "Grace Community", sublabel: "24 members", type: "community" },
  { key: "morning-prayer", label: "Morning Prayer Circle", sublabel: "11 members", type: "group" },
  { key: "family-first", label: "Family First", sublabel: "6 members", type: "group" },
];
