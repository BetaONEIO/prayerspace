export function getAppUrl() {
  const domain = (process.env.REPLIT_EXPO_DEV_DOMAIN ?? process.env.REPLIT_DEV_DOMAIN ?? process.env.EXPO_PUBLIC_DOMAIN ?? "").trim();
  if (!domain) return "";
  return domain.startsWith("http://") || domain.startsWith("https://") ? domain.replace(/\/+$/, "") : `https://${domain}`.replace(/\/+$/, "");
}