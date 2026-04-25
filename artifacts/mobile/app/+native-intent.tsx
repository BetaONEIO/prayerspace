export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  if (path.startsWith("auth") || path.startsWith("login") || path.startsWith("verify-otp") || path.startsWith("password-reset")) {
    return `/${path}`;
  }
  return "/";
}