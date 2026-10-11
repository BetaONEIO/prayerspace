import { strict as assert } from "node:assert";
import { test } from "node:test";
import { completeNativeGoogleSignIn, parseGoogleAuthorizationCode } from "./nativeGoogleAuth";

const redirect = "exp://example.test:8081/--/";
const callback = `${redirect}?code=test-code`;
const sessionResult = { data: { session: { user: { id: "fixture-user" } } }, error: null };

test("parses PKCE codes for Expo Go, custom native schemes and HTTPS callbacks", () => {
  for (const base of [redirect, "prayerspace:///", "prayerspace://callback/", "https://example.test/auth/callback"]) {
    assert.equal(parseGoogleAuthorizationCode(`${base}?code=opaque%2Bcode%2Fvalue%3D&state=ignored`, base), "opaque+code/value=");
  }
  assert.equal(parseGoogleAuthorizationCode("exp://example.test:8081/--?code=test-code", redirect), "test-code");
});

test("rejects malformed, foreign or credential-bearing return URLs", () => {
  for (const url of [
    "not a URL", "https://other.test/?code=secret",
    "exp://other.test:8081/--/?code=secret",
    "exp://example.test:8082/--/?code=secret",
    "exp://example.test:8081/--/other?code=secret",
    "exp://user:password@example.test:8081/--/?code=secret",
  ]) {
    assert.throws(() => parseGoogleAuthorizationCode(url, redirect), /invalid response/);
  }
});

test("rejects absent, blank, duplicated and fragment codes or implicit tokens", () => {
  for (const tail of [
    "", "?code=", "?code=%20", "?code=%0Asecret", "?code=a&code=b",
    "#code=secret", "?code=a#code=b", "#access_token=secret",
    "?code=a#refresh_token=secret", "?code=a&access_token=secret",
  ]) assert.throws(() => parseGoogleAuthorizationCode(redirect + tail, redirect), /invalid response/);
});

test("handles query and fragment provider errors without leaking descriptions or codes", () => {
  for (const separator of ["?", "#"]) {
    assert.throws(() => parseGoogleAuthorizationCode(
      `${redirect}${separator}error=access_denied&error_description=sensitive-secret`, redirect,
    ), /wasn't authorized/);
    assert.throws(() => parseGoogleAuthorizationCode(
      `${redirect}?code=sensitive-secret${separator === "?" ? "&" : "#"}error_description=sensitive-secret`, redirect,
    ), error => error instanceof Error && !error.message.includes("sensitive-secret"));
  }
});

test("exchanges only the decoded code once and confirms a session", async () => {
  const calls: string[] = [];
  assert.equal(await completeNativeGoogleSignIn(
    { type: "success", url: callback }, redirect,
    async code => { calls.push(code); return sessionResult; }, () => {},
  ), true);
  assert.deepEqual(calls, ["test-code"]);
});

test("cancel and dismiss create no exchange and no error", async () => {
  for (const type of ["cancel", "dismiss"]) {
    let calls = 0;
    assert.equal(await completeNativeGoogleSignIn(
      { type }, redirect, async () => { calls++; return sessionResult; }, () => { throw new Error("unused"); },
    ), false);
    assert.equal(calls, 0);
  }
});

test("invalid browser responses, provider errors and account changes never exchange", async () => {
  for (const result of [
    { type: "locked" }, { type: "success" }, { type: "success", url: `${redirect}?error=server_error` },
    { type: "success", url: callback },
  ]) {
    let calls = 0;
    await assert.rejects(completeNativeGoogleSignIn(
      result, redirect, async () => { calls++; return sessionResult; },
      () => { throw new Error("Account changed"); },
    ));
    assert.equal(calls, 0);
  }
});

test("SDK failures and missing sessions cannot report success or leak request secrets", async () => {
  const attempts = [
    async () => ({ data: { session: null }, error: null }),
    async () => ({ ...sessionResult, error: new Error("sensitive-secret") }),
    async () => { throw new Error("https://example.test/token?code=sensitive-secret"); },
  ];
  for (const exchange of attempts) {
    await assert.rejects(completeNativeGoogleSignIn(
      { type: "success", url: callback }, redirect, exchange, () => {},
    ), error => error instanceof Error && /establish a session/.test(error.message) && !error.message.includes("sensitive-secret"));
  }
});

test("an exchange failure does not prevent a fresh callback attempt", async () => {
  await assert.rejects(completeNativeGoogleSignIn(
    { type: "success", url: callback }, redirect,
    async () => ({ data: { session: null }, error: new Error("expired") }), () => {},
  ));
  assert.equal(await completeNativeGoogleSignIn(
    { type: "success", url: callback }, redirect, async () => sessionResult, () => {},
  ), true);
});
