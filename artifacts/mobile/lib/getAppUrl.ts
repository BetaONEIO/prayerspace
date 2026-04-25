export function getAppUrl() {
  const domain = (process.env.EXPO_PUBLIC_DOMAIN ?? process.env.REPLIT_DEV_DOMAIN ?? "").trim();
  if (!domain) return "";
  return domain.startsWith("http://") || domain.startsWith("https://") ? domain.replace(/\/+$/, "") : `https://${domain}`.replace(/\/+$/, "");
}