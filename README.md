# CommandDeck

CommandDeck is a visual control console for coordinating and monitoring multi-agent workflows.

[English](README.md) | [中文](README.zh-CN.md)

## Features

- 📊 **Real-time monitoring**: track agent status (running/idle/error/done)
- 🔄 **Event timeline**: inspect tool calls and state changes
- 💬 **Interactive messaging**: send messages to specific agents
- 🔌 **Multi-project support**: manage multiple projects and agents in one place

## Quickstart

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install & run

```bash
pnpm install
pnpm dev
```

### Run individual services

```bash
# Hub only
pnpm --filter hub dev

# Desktop app only
pnpm --filter desktop dev
```

By default the hub listens on `http://127.0.0.1:8787`, and the WebSocket stream is `ws://127.0.0.1:8787/stream`.

## Configuration

### Environment variables (.env)

Create a `.env` file in the repo root:

```bash
# Hub port (default 8787)
PORT=8787
HOST=127.0.0.1

# Cloudflare Analytics (optional)
# Used to show website traffic in TrafficPanel
CLOUDFLARE_API_TOKEN=your_cf_token
CLOUDFLARE_DEBUG=0
```

### Default paths (macOS)

These are managed automatically:

- **Config**: `~/.commanddeck/projects.json` (auto-generated)
- **Projects root**: `~/Projects/` (default search path)
- **Hub data**: `~/.commanddeck/events.sqlite`

### New user setup

1. If your code projects live under `~/Projects/`, you can add a project using just the folder name (for example `myproject`). Otherwise, add the full path (for example `/Users/you/project/dir/myproject`).
2. For Cloudflare analytics, set the token in `.env` and add a `domain` field per project in `projects.json`.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Development](docs/DEVELOPMENT.md)
- [Deployment](docs/DEPLOYMENT.md)

## License

MIT
