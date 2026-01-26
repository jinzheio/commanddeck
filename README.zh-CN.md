# CommandDeck

CommandDeck 是一个用于协调与监控多 Agent 工作流的可视化控制台。

[English](README.md) | [中文](README.zh-CN.md)

## 功能

- 📊 **实时监控**：查看 Agent 状态（运行中/空闲/错误/完成）
- 🔄 **事件时间线**：追踪工具调用与状态变化
- 💬 **交互消息**：向指定 Agent 发送消息
- 🔌 **多项目支持**：在一个控制台内管理多个项目与 Agent

## 快速开始

### 前置要求

- Node.js 20+
- pnpm 9+

### 安装与启动

```bash
pnpm install
pnpm dev
```

### 单独启动服务

```bash
# 仅启动 Hub
pnpm --filter hub dev

# 仅启动桌面端
pnpm --filter desktop dev
```

默认 Hub 监听 `http://127.0.0.1:8787`，WebSocket 流地址为 `ws://127.0.0.1:8787/stream`。

## 配置

### 环境变量 (.env)

在项目根目录创建 `.env` 文件：

```bash
# Hub 服务端口（默认 8787）
PORT=8787
HOST=127.0.0.1

# Cloudflare Analytics（可选）
# 用于在 TrafficPanel 显示网站流量
CLOUDFLARE_API_TOKEN=your_cf_token
CLOUDFLARE_DEBUG=0
```

### 默认路径（macOS）

以下路径由系统自动管理，无需手动配置：

- **配置文件**：`~/.commanddeck/projects.json`（自动生成）
- **项目目录**：`~/Projects/`（默认查找路径）
- **Hub 数据**：`~/.commanddeck/events.sqlite`

### 新用户设置

1. **如果你的代码项目都在 `~/Projects/` 下**，添加项目时只需输入目录名（如 `myproject`）。否则，请输入完整路径（如 `/Users/you/project/dir/myproject`）。
2. 如果需要接入 Cloudflare 统计，请在 `.env` 中填写 Token，并在 `projects.json` 中为项目配置 `domain` 字段。

## 文档

- [架构设计](docs/ARCHITECTURE.md)
- [API 文档](docs/API.md)
- [开发指南](docs/DEVELOPMENT.md)
- [部署指南](docs/DEPLOYMENT.md)

## License

MIT
