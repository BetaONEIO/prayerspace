---
name: Chat retry semantics
description: Prevent duplicate messages and accidental reaction reversal after ambiguous network failures.
---

Chat retries must repeat the intended write, not repeat a state transition. Keep the same message-operation ID for an unchanged draft and account generation; reaction requests must carry the desired active state rather than blindly toggling the saved state.

**Why:** A server can save a write while its response is lost. A new message ID then duplicates the message, while retrying a server-side reaction toggle removes the reaction that was successfully saved.

**How to apply:** Preserve failed drafts and operation identifiers until their outcome is acknowledged. Changes to draft content or reply target are new operations. Use explicit, idempotent reaction add/remove requests, and do not clear a newer draft or apply obsolete account callbacks.
