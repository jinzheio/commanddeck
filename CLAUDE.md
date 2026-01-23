# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CommandDeck is a multi-agent control console using a "front-store-back-factory" (前店后厂) architecture:
- **Hub** (`apps/hub/`): Fastify server on port 8787 that receives events from agents, stores them in SQLite, and broadcasts via WebSocket
- **Desktop UI** (`apps/desktop/renderer/`): React interface for real-time monitoring and control
- **Main Process** (`apps/desktop/main/`): Electron main process that manages agent workers via node-pty
- **Protocol** (`packages/protocol/`): Shared TypeScript types using Zod schemas for type-safe communication

All communication is event-driven through the Hub.

## Common Commands

```bash
# Development
pnpm dev              # Start all services (hub + desktop) in parallel
pnpm --filter hub dev      # Hub only on http://127.0.0.1:8787
pnpm --filter desktop dev  # Electron app only

# Build & Type Checking
pnpm build            # Build all packages/apps
pnpm typecheck        # TypeScript checks across workspace
pnpm format           # Prettier formatting
```

## Architecture

### Event Flow
```
Claude Code Hook → report-event.sh → POST /events → Hub validates + stores → WebSocket broadcast → UI updates
```

### Agent State Machine
```
IDLE → RUNNING → (WAITING_USER/WAITING_APPROVAL) → RUNNING → DONE/ERROR
```

### Event Types (defined in packages/protocol/src/events.ts)
- `session_start`, `session_end`
- `tool_start`, `tool_end`
- `error`, `status`
- `approval_request`, `model_switch`

### WebSocket Protocol
UI connects to `/stream`, sends:
```json
{ "type": "subscribe", "project_id": "xxx", "since_event_id": 123 }
```

Hub responds with init events, then pushes real-time updates:
```json
{ "type": "init", "events": [...] }
{ "type": "event", "event": {...} }
```

## Key Files

- `apps/hub/src/server.ts` - Hub entry point with Fastify + WebSocket
- `apps/hub/src/store.ts` - SQLite operations for event persistence
- `packages/protocol/src/events.ts` - Zod schemas for all event types
- `packages/protocol/src/commands.ts` - Command type definitions

## State Management

The renderer uses Zustand for state:
- `agentStore` - Agent list and logs
- `projectStore` - Project configuration
- Custom hooks for WebSocket, Git changes, and analytics

## Configuration

- Environment: `.env` files checked in multiple locations (project root, `~/.commanddeck/.env`)
- Projects: `~/.commanddeck/projects.json`
- Database: `~/.commanddeck/events.sqlite`
- Default project search path: `~/Projects/`

## Claude Code Integration

Hooks are configured in `~/.claude/settings.json` to trigger shell scripts in `scripts/claude-hooks/` that report events to the Hub via `report-event.sh`.
