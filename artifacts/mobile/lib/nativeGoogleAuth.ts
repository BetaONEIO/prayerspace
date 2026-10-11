export class NativeGoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NativeGoogleAuthError";
  }
}

type BrowserResult = { type: string; url?: string };
type ExchangeResult = {
  data: { session: { user: { id: string } } | null };
  error: unknown;
};

const callbackError = () => new NativeGoogleAuthError(
  "Google sign-in returned an invalid response. Please try again.",
);

/** Parse only a callback for this app. Never expose provider descriptions,
 * callback URLs, authorization codes or tokens in errors. */
export function parseGoogleAuthorizationCode(callbackUrl: string, redirectTo: string): string {
  let callback: URL;
  let expected: URL;
  try {
    callback = new URL(callbackUrl);
    expected = new URL(redirectTo);
  } catch {
    throw callbackError();
  }
  const path = (url: URL) => url.pathname.replace(/\/+$/, "");
  if (
    callback.protocol !== expected.protocol ||
    callback.hostname.toLowerCase() !== expected.hostname.toLowerCase() ||
    callback.port !== expected.port || path(callback) !== path(expected) ||
    callback.username || callback.password
  ) throw callbackError();

  const fragment = new URLSearchParams(callback.hash.slice(1));
  const parameters = [callback.searchParams, fragment];
  if (parameters.some(p => p.has("error") || p.has("error_code") || p.has("error_description"))) {
    const denied = parameters.some(p => p.get("error") === "access_denied");
    throw new NativeGoogleAuthError(denied
      ? "Google sign-in wasn't authorized. Please try again."
      : "Google sign-in couldn't complete. Please try again.");
  }
  // This app uses PKCE. Do not accept an implicit token callback or a second,
  // ambiguous code in the fragment.
  if (fragment.has("code") || parameters.some(p => p.has("access_token") || p.has("refresh_token"))) {
    throw callbackError();
  }
  const codes = callback.searchParams.getAll("code");
  if (codes.length !== 1 || !codes[0] || /\s/.test(codes[0])) throw callbackError();
  return codes[0];
}

export async function completeNativeGoogleSignIn(
  result: BrowserResult,
  redirectTo: string,
  exchangeCode: (code: string) => Promise<ExchangeResult>,
  assertCurrentAccount: () => void,
): Promise<boolean> {
  // Cancellation is normal: stay on sign-in without an error or a session.
  if (result.type === "cancel" || result.type === "dismiss") return false;
  if (result.type !== "success" || !result.url) throw callbackError();
  const code = parseGoogleAuthorizationCode(result.url, redirectTo);
  try {
    assertCurrentAccount();
  } catch {
    throw new NativeGoogleAuthError("Your account changed during sign-in. Please try again.");
  }
  try {
    const response = await exchangeCode(code);
    if (response.error || !response.data?.session?.user?.id) {
      throw new NativeGoogleAuthError("Google sign-in couldn't establish a session. Please try again.");
    }
  } catch {
    // SDK/network messages can include request URLs; do not propagate them to
    // the button's error logger or the user's error dialog.
    throw new NativeGoogleAuthError("Google sign-in couldn't establish a session. Please try again.");
  }
  return true;
}
