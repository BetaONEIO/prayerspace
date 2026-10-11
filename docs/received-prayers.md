# Received prayer requests

Home's Prayer Requests section loads the latest 50 non-archived requests from
accepted friends that the signed-in account may see. It is not a direct-message
delivery inbox. Public requests from strangers are not presented as received
requests, and friends' private requests are excluded.

Opening a card loads its saved content, sender information, date, image, status,
author's follow-up updates, and the actual unique prayer-engagement count.
Anonymous requests do not expose sender IDs, names, avatars, or profile links.
Participant identities are not displayed; counts cover the request's lifetime,
not just today. Blocked accounts cannot open or acknowledge each other's requests.

The existing request table stores text, not voice recordings. This route no
longer displays the simulated voice player or invented playback progress.

Acknowledging a prayer uses an authenticated, visibility-checked, idempotent RPC.
The caller cannot impersonate another account, and retries do not add duplicate
engagements. Success is shown only after the server accepts the acknowledgement.
The request is then added to the caller's local journal and dated reminders are
scheduled through the existing reminder service. No sender-notification promise
is made: the notifications service currently handles friendship events.

Queries are account-scoped, refreshed on opening and every 30 seconds, and
validated before rendering. Invalid links, unavailable/private/deleted requests,
and loading failures have separate states; failures offer retry. Requests
finishing after an account transition cannot populate another account's cache
or journal. Successful acknowledgements invalidate the inbox and feed caches.

## Verification

- Mobile project TypeScript check passed.
- Eight unit tests passed for parsing, identifiers, errors, account transitions,
  and authoritative acknowledgement responses.
- Database assertions passed using three isolated account fixtures, all rolled
  back: details, inbox, updates, anonymous identity, private/archived/friends-only
  access, blocked access, account spoofing, and idempotent prayer counts.
- An ordinary authenticated HTTP client loaded a disposable friend's request
  and its saved follow-up update successfully.
- The signed-in browser test failed internally before returning a verdict.
  The public startup screenshot was blank during initialization and does not
  verify the changed screens. Signed-in UI and native-device verification remain
  outstanding. Both disposable browser-test accounts and their server records
  were removed afterward.

No publishing or App Store readiness is implied.
