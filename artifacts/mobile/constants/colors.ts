export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  destructive: string;
  tabIconDefault: string;
  tabIconSelected: string;
}

export const LightColors: ThemeColors = {
  primary: "#C4662A",
  primaryForeground: "#FFFFFF",
  background: "#FAF8F5",
  foreground: "#1C1914",
  card: "#FFFFFF",
  cardForeground: "#1C1914",
  secondary: "#F0EAE2",
  secondaryForeground: "#5C4838",
  muted: "#EDE5D8",
  mutedForeground: "#8C7865",
  accent: "#F5EDDA",
  accentForeground: "#8A5828",
  border: "#E5DCCE",
  destructive: "#D9534F",
  tabIconDefault: "#B8A090",
  tabIconSelected: "#C4662A",
};

export const DarkColors: ThemeColors = {
  primary: "#E86F24",
  primaryForeground: "#FFFFFF",
  background: "#0F172A",
  foreground: "#F8FAFC",
  card: "#111827",
  cardForeground: "#F8FAFC",
  secondary: "#1E293B",
  secondaryForeground: "#CBD5E1",
  muted: "#1E293B",
  mutedForeground: "#94A3B8",
  accent: "rgba(232, 111, 36, 0.14)",
  accentForeground: "#E86F24",
  border: "#334155",
  destructive: "#EF4444",
  tabIconDefault: "#64748B",
  tabIconSelected: "#E86F24",
};

const Colors = LightColors;
export default Colors;
