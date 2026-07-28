---
name: Keyboard dismissal pattern
description: Durable guidance for native keyboard behavior across Prayer Space mobile forms.
---

Use the shared keyboard-aware scroll primitive for form screens. Pair it with outside-tap dismissal and explicitly dismiss the keyboard before controls open or navigation occurs.

**Why:** Text inputs in nested mobile forms can retain focus after typing, leaving the keyboard visible while controls and page content move underneath it.

**How to apply:** Keep drag dismissal and focus cleanup centralized in the shared scroll wrapper; add screen-specific outside-tap handling and `Keyboard.dismiss()` before modal, picker, toggle, tab, and navigation actions.