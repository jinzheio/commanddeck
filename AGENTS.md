# Repository Guidelines

## Project Structure & Module Organization
- `packages/protocol/` contains the shared TypeScript protocol types (`src/commands.ts`, `src/events.ts`, `src/index.ts`).
- `scripts/claude-hooks/` holds shell scripts for Claude Code event reporting.
- `docs/` contains architecture, API, development, and deployment notes.
- The README and `docs/DEVELOPMENT.md` describe an `apps/` layout (hub + desktop). If you add these apps, keep their code under `apps/hub/` and `apps/desktop/` with `src/` subfolders.

## Build, Test, and Development Commands
Use these commands as documented in `docs/DEVELOPMENT.md`:
- `pnpm install` installs workspace dependencies.
- `pnpm dev` starts all dev services.
- `pnpm --filter hub dev` runs the Fastify hub only.
- `pnpm --filter desktop dev` runs the Electron desktop app only.
- `pnpm typecheck` runs TypeScript checks.
- `pnpm format` runs Prettier formatting.
- `pnpm build` builds all packages/apps.

## Coding Style & Naming Conventions
- TypeScript is the primary language; keep strict typing enabled.
- Formatting uses Prettier; run `pnpm format` before commits.
- Use lower-case file names for modules (e.g., `events.ts`, `commands.ts`).

## Testing Guidelines
- There are no automated test suites in this checkout; use manual verification.
- Manual event test:
  - Start hub: `pnpm --filter hub dev`
  - POST an event to `http://127.0.0.1:8787/events` (see `docs/DEVELOPMENT.md`).
- WebSocket smoke test uses `wscat` against `ws://127.0.0.1:8787/stream`.

## Commit & Pull Request Guidelines
- Git history is not available in this checkout; default to Conventional Commits (e.g., `feat: add hub heartbeat`).
- PRs should include a concise description, linked issue if available, and screenshots/GIFs for UI changes.
- Run `pnpm typecheck && pnpm format` before opening a PR.

## Agent Hooks & Configuration
- To report Claude Code events, copy scripts from `scripts/claude-hooks/` to `~/.commanddeck/` and set `AGENT_CONSOLE_*` env vars.
- Configure `~/.claude/settings.json` hooks as shown in `docs/DEVELOPMENT.md`.
