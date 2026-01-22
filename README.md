# CommandDeck - Multi-Agent Control Console

CommandDeck 是一个为多 Agent 协作系统设计的可视化控制台。

## 核心概念：前店后厂

想象这是一个 **"连锁集团"**：

- **🏢 集团总部 (Hub)**: 位于云端或本地服务器的数据中心。负责接收所有 Agent 的工作汇报，存储历史档案，并进行数据分析。
- **🏪 前店 (Desktop UI)**: 给用户看的桌面应用。负责展示实时监控画面，下达指令，本身不直接参与繁重的计算任务。
- **🏭 后厂 (Main Process & Agents)**: 实际干活的地方。负责启动 Agent 进程，执行 Git 操作，运行代码。
- **📜 通用语 (Protocol)**: 集团内部统一的沟通标准 (TypeScript/Zod)，确保前店、后厂和总部之间沟通无误。

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

## Configuration

### 环境变量 (.env)

在项目根目录创建 `.env` 文件：

```bash
# Hub 服务端口 (默认 8787)
PORT=8787
HOST=127.0.0.1

# Cloudflare Analytics (可选)
# 用于在 TrafficPanel 显示网站流量
CLOUDFLARE_API_TOKEN=your_cf_token
CLOUDFLARE_DEBUG=0
```

### 文件路径 (macOS)

系统会自动管理以下路径，无需手动配置：

- **配置文件**: `~/.commanddeck/projects.json` (自动生成)
- **项目目录**: `~/Projects/` (默认查找路径)
- **Hub 数据**: `~/.commanddeck/events.sqlite`

### 新用户设置

1. **你的代码项目如果都存放在 `~/Projects/` 目录下**，则不需要手动添加项目路径（只需要输入类似`myproject`就可以了）。否则，在添加项目时要输入完整的项目路径（/Users/you/project/dir/myproject）。
2. 如果需要接入 Cloudflare 统计，请在 `.env` 中填入 Token，并在 `projects.json` 中为项目配置 `domain` 字段。

## License

MIT
