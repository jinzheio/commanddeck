# Main/Preload TypeScript Migration

## Goal
Migrate the Electron `main` and `preload` layers from CJS/JS to TypeScript with minimal behavior change, while keeping runtime output compatible with Electron (CJS or bundled).

## Scope
- `apps/desktop/src/main/**` → TypeScript
- `apps/desktop/src/preload/**` → TypeScript
- Add build outputs to `apps/desktop/dist/main` and `apps/desktop/dist/preload`
- Shared IPC types in `apps/desktop/src/types/ipc.ts`

## Plan
1) Add TS config and build scripts for main/preload
2) Migrate preload first (smaller surface)
3) Migrate main modules (agents, git, projects, ipc, entry)
4) Wire Electron to compiled preload output
5) Validate in dev + typecheck

## Progress Checklist
- [x] Create `tsconfig.main.json` and `tsconfig.preload.json`
- [x] Add `build:main` / `build:preload` scripts
- [x] Add shared IPC types (`src/types/ipc.ts`)
- [x] Migrate preload to TS
- [x] Update preload path in `BrowserWindow`
- [x] Migrate main modules to TS
- [x] Update dev/build flows
- [ ] Smoke tests: create project, start agent, git changes, analytics

## Notes / Decisions
- Output target: NodeNext (ESM) for Electron runtime
- Desktop package type remains `module` for Vite + ESM compatibility
- Keep IPC channel names unchanged
- Avoid behavior changes during migration
