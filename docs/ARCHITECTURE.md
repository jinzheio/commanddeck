# 架构设计

## 系统概览

```
┌─────────────────────────────────────────────────────────────┐
│                        本地开发机                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Claude Code  │  │ Claude Code  │  │ Antigravity  │      │
│  │    #1        │  │    #2        │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └────────────┬────┴────────────────┘               │
│                      ▼                                      │
│         ┌────────────────────────────┐                     │
│         │      Hub Service :8787     │                     │
│         │  ┌─────────┐ ┌──────────┐  │                     │
│         │  │   HTTP  │ │WebSocket │  │                     │
│         │  │ /events │ │ /stream  │  │                     │
│         │  └────┬────┘ └────┬─────┘  │                     │
│         │       │           │        │                     │
│         │       ▼           │        │                     │
│         │  ┌─────────┐      │        │                     │
│         │  │ SQLite  │◀─────┘        │                     │
│         │  └─────────┘               │                     │
│         └────────────────────────────┘                     │
│                      │                                      │
│                      ▼ WebSocket                            │
│         ┌────────────────────────────┐                     │
│         │    Electron Renderer       │                     │
│         │  ┌─────────────────────┐  │                     │
│         │  │   React Dashboard   │  │                     │
│         │  └─────────────────────┘  │                     │
│         └────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## 组件说明

### Hub Service

职责：
- 接收 Agent 事件 (`POST /events`)
- 存储事件到 SQLite
- 通过 WebSocket 推送实时事件
- 管理 Agent 状态

特性：
- 单端口 (8787) 同时提供 HTTP 和 WebSocket
- Zod schema 校验所有输入
- 支持断线恢复 (since_event_id)

### Electron App

职责：
- Main Process: 启动/管理 Hub 进程
- Renderer: 显示 Dashboard UI

特性：
- 系统托盘常驻
- 开机自启（可选）

### Claude Code Hooks

职责：
- 在 Claude Code 生命周期事件触发时上报到 Hub

事件类型：
- `SessionStart` → session_start
- `PreToolUse` → tool_start
- `PostToolUse` → tool_end
- `Stop` → status_change (WAITING_USER)
- `SessionEnd` → session_end

## 数据流

### 事件上报流程

```
Claude Code Hook 触发
        │
        ▼
   report-event.sh
        │
        ▼ POST /events
   Hub 校验 + 存储
        │
        ├──▶ SQLite (持久化)
        │
        └──▶ WebSocket broadcast
                │
                ▼
           UI 更新
```

### 断线恢复流程

```
UI 连接 WebSocket
        │
        ▼
   发送 subscribe { project_id, since_event_id }
        │
        ▼
   Hub 查询 events WHERE id > since_event_id
        │
        ▼
   返回 { type: 'init', events: [...] }
        │
        ▼
   UI 合并事件，继续监听实时推送
```

## 状态机

```
                    session_start
        ┌──────────────────────────────┐
        │                              ▼
      IDLE ◀────────────────────── RUNNING
                session_end            │
                                       │ Stop hook
                                       ▼
                               WAITING_USER
                                       │
                                       │ user_response
                                       ▼
                                   RUNNING
                                       │
                                       │ error
                                       ▼
                                    ERROR
```

## 未来扩展

### Phase 2: 上云部署

```
┌──────────────┐          ┌──────────────┐
│   本地机器    │          │    VPS       │
│  ┌────────┐  │  HTTPS   │  ┌────────┐  │
│  │ Agent  │──┼──────────┼─▶│  Hub   │  │
│  └────────┘  │          │  └────────┘  │
└──────────────┘          │       │      │
                          │       ▼      │
                          │  ┌────────┐  │
                          │  │Postgres│  │
                          │  └────────┘  │
                          └──────────────┘
                                 │
                                 ▼ WSS
                          ┌──────────────┐
                          │   浏览器/App  │
                          └──────────────┘
```
