---
name: Base64 byte limits
description: Why upload limits must check decoded bytes in addition to encoded request size
---

An encoded base64 length limit does not precisely enforce the decoded byte limit. Check the actual decoded bytes too, and report an oversized payload as oversized rather than invalid encoding.

**Why:** Base64 rounds up in three-byte groups. An audio payload one byte over the accepted limit can have the same encoded length as a permitted payload.

**How to apply:** For future base64 audio or image uploads, bound the encoded request before allocating the decoded buffer, then enforce the exact decoded byte limit. Do not truncate the user's payload silently.
