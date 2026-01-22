# 架构设计
 
 ## 概念架构：前店后厂模式
 
 本项目采用了 **"连锁集团" (前店后厂 + 集团总部)** 的架构设计。这有助于理解各个组件的角色和职责。
 
 ### 1. 🏢 集团总部 (Apps/Hub)
 - **角色**: 数据中心与指挥部。
 - **职责**: 
   - 接收所有 Agent 的工作日记（事件上报）。
   - 存储所有的历史档案（SQLite 数据库）。
   - 向前店（UI）实时广播消息（WebSocket）。
 - **特点**: 它是整个系统的"大脑"，必须一直在线。
 
 ### 2. 🏪 前店 (Apps/Desktop - Renderer)
 - **角色**: 接待大厅（用户界面）。
 - **职责**: 
   - 给用户展示漂亮的监控画面。
   - 接收用户的指令（比如"启动 Agent"）。
   - **不直接干重活**：它只负责发号施令，不会直接去操作底层系统文件。
 
 ### 3. 🏭 后厂 (Apps/Desktop - Main)
 - **角色**: 生产车间。
 - **职责**: 
   - 管理 Agent 员工（Node-pty 进程）。
   - 执行 Git 操作（搬运货物）。
   - 读取本地配置文件。
 - **特点**: 用户看不见它，但它拥有操作系统的全部权限。
 
 ### 4. 📜 通用语 (Packages/Protocol)
 - **角色**: 员工手册与标准字典。
 - **职责**: 
   - 定义了每一条指令和事件的确切格式。
   - 确保前店、后厂和总部说的是同一种语言。
   - **严谨性**: 使用 TypeScript 和 Zod 确保一个标点符号都不能错。

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
