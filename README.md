# CommandDeck - Multi-Agent Control Console

监控和交互多个 AI Agent（Claude Code / Antigravity / Codex）的桌面控制台。

## 功能

- 📊 **实时监控** - 查看所有 Agent 的状态（运行中/等待/错误/完成）
- 🔄 **事件时间线** - 追踪每个 Agent 的工具调用和状态变化
- 💬 **交互对话** - 向特定 Agent 发送消息
- 🔌 **多项目支持** - 管理多个项目，每个项目多个 Agent

## 技术栈

| 组件 | 技术 |
|------|------|
| 桌面应用 | Electron + React |
| Hub 服务 | Fastify + WebSocket |
| 数据库 | SQLite (better-sqlite3) |
| 构建工具 | pnpm + electron-builder |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm dev

# 构建桌面应用
pnpm build
```

## 项目结构

```
commanddeck/
├── apps/
│   ├── hub/           # Hub 服务 (HTTP + WebSocket)
│   └── desktop/       # Electron 桌面应用
├── packages/
│   └── protocol/      # 共享类型定义
├── scripts/
│   └── claude-hooks/  # Claude Code hooks
└── docs/              # 项目文档
```

## 文档

- [架构设计](docs/ARCHITECTURE.md)
- [API 文档](docs/API.md)
- [开发指南](docs/DEVELOPMENT.md)
- [部署指南](docs/DEPLOYMENT.md)

## License

MIT
