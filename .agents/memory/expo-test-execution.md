---
name: Expo test execution
description: Keep mobile project typechecking separate from Node test execution without changing the app's module configuration.
---

Keep the Expo project typecheck separate from standalone Node unit-test
execution. Prefer temporary CommonJS transpilation over changing the app's
module format or installing a runner solely for a verification pass.

**Why:** Metro accepts extensionless TypeScript imports that Node's native ESM
type-stripping loader cannot resolve. Standalone TypeScript compilation also
loses the ambient declarations loaded by the full Expo project.

**How to apply:** Verify types using the mobile project's TypeScript
configuration, then run transpiled tests with the artifact's dependency
resolution. Temporary compiled files outside the workspace need explicit access
to the artifact's dependencies. Do not treat a loader failure as an app bug.
