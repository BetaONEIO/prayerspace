# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- **mobile** (`artifacts/mobile/`) — Prayer Space, an Expo (React Native) mobile app imported from https://github.com/BetaONEIO/prayerspace. Uses Supabase for auth/storage/chat (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Optional secrets: `EXPO_PUBLIC_TOOLKIT_URL` and `EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY` for AI transcription/text generation features.
- **api-server** (`artifacts/api-server/`) — shared Express API at `/api`.
- **mockup-sandbox** (`artifacts/mockup-sandbox/`) — design canvas for prototyping.
