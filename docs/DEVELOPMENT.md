# 开发指南

## 前置要求

- Node.js 20+
- pnpm 9+
- macOS / Windows / Linux

## 环境搭建

```bash
# 克隆仓库
git clone https://github.com/yourname/commanddeck.git
cd commanddeck

# 安装依赖
pnpm install

# 启动开发模式
pnpm dev
```

## 项目结构

```
commanddeck/
├── apps/
│   ├── hub/                 # Hub 服务
│   │   ├── src/
│   │   │   ├── server.ts    # Fastify 入口
│   │   │   ├── store.ts     # SQLite 操作
│   │   │   └── schema.ts    # Zod 校验
│   │   └── package.json
│   └── desktop/             # Electron 应用
│       ├── src/
│       │   ├── main/        # Main process
│       │   ├── renderer/    # React UI
│       │   └── preload/     # IPC bridge
│       └── package.json
├── packages/
│   └── protocol/            # 共享类型
│       ├── src/
│       │   ├── events.ts    # 事件类型
│       │   └── commands.ts  # 命令类型
│       └── package.json
└── scripts/
    └── claude-hooks/        # Claude Code hooks
```

## 开发命令

```bash
# 启动 Hub 开发服务
pnpm --filter hub dev

# 启动 Electron 开发模式
pnpm --filter desktop dev

# 同时启动所有
pnpm dev

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format

# 构建所有包
pnpm build
```

## 配置 Claude Code Hooks

1. 复制 hooks 脚本到全局位置：

```bash
mkdir -p ~/.commanddeck
cp scripts/claude-hooks/* ~/.commanddeck/
chmod +x ~/.commanddeck/*.sh
```

2. 配置环境变量（可选）：

```bash
export AGENT_CONSOLE_URL=http://127.0.0.1:8787
export AGENT_CONSOLE_AGENT_ID=claude-main
export AGENT_CONSOLE_PROJECT_ID=my-project
```

3. 配置 `~/.claude/settings.json`：

```json
{
  "hooks": {
    "SessionStart": [
      { "command": "~/.commanddeck/report-event.sh session_start" }
    ],
    "PreToolUse": [
      { "matcher": "*", "command": "~/.commanddeck/report-event.sh tool_start" }
    ],
    "PostToolUse": [
      { "matcher": "*", "command": "~/.commanddeck/report-event.sh tool_end" }
    ],
    "Stop": [
      { "command": "~/.commanddeck/report-event.sh status_change" }
    ],
    "SessionEnd": [
      { "command": "~/.commanddeck/report-event.sh session_end" }
    ]
  }
}
```

## 测试

### 手动测试事件上报

```bash
# 启动 Hub
pnpm --filter hub dev

# 发送测试事件
curl -X POST http://127.0.0.1:8787/events \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "project_id": "test-project",
    "type": "session_start",
    "state": "RUNNING"
  }'
```

### WebSocket 测试

使用 `wscat` 测试 WebSocket：

```bash
npm install -g wscat
wscat -c ws://127.0.0.1:8787/stream

# 发送订阅
{"type":"subscribe","project_id":"test-project"}
```

## 调试

### Hub 日志

```bash
DEBUG=commanddeck:* pnpm --filter hub dev
```

### Electron DevTools

开发模式下自动打开 DevTools。生产模式按 `Cmd+Shift+I` 打开。

## 代码规范

- TypeScript strict mode
- ESLint + Prettier
- 提交前运行 `pnpm typecheck && pnpm lint`
