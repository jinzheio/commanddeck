# Hub API 文档

Hub 服务监听 `127.0.0.1:8787`，提供 HTTP 和 WebSocket 接口。

---

## HTTP API

### POST /events

Agent 上报事件。

**Request Body:**

```typescript
{
  agent_id: string       // 必填，唯一标识符
  project_id: string     // 必填，项目标识
  session_id?: string    // 可选，会话 ID
  trace_id?: string      // 可选，追踪 ID
  span_id?: string       // 可选，调用级 ID
  type: EventType        // 必填，见下方枚举
  state: AgentState      // 必填，见下方枚举
  client_ts?: string     // 可选，Agent 本地时间 (ISO8601)
  payload?: {
    tool_name?: string
    message?: string
    model_name?: string
    error_details?: string
  }
}
```

**EventType 枚举:**
- `session_start` - 会话开始
- `session_end` - 会话结束
- `tool_start` - 工具调用开始
- `tool_end` - 工具调用结束
- `error` - 发生错误
- `status` - 状态更新
- `approval_request` - 请求用户批准
- `model_switch` - 模型切换

**AgentState 枚举:**
- `IDLE` - 空闲
- `RUNNING` - 运行中
- `WAITING_USER` - 等待用户输入
- `WAITING_APPROVAL` - 等待批准
- `ERROR` - 错误
- `DONE` - 完成

**Response:**

```typescript
{
  ok: true,
  id: number  // 事件 ID
}
```

**示例:**

```bash
curl -X POST http://127.0.0.1:8787/events \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "claude-1",
    "project_id": "my-project",
    "type": "tool_start",
    "state": "RUNNING",
    "payload": { "tool_name": "Write" }
  }'
```

---

## WebSocket API

连接地址: `ws://127.0.0.1:8787/stream`

### 客户端 → 服务端

#### subscribe

订阅项目事件，支持断线恢复。

```typescript
{
  type: 'subscribe',
  project_id: string,
  since_event_id?: number  // 可选，从该 ID 之后的事件开始
}
```

#### command

发送命令给 Agent。

```typescript
{
  type: 'command',
  agent_id: string,
  command: 'send_message' | 'approve' | 'retry' | 'cancel',
  payload?: { text?: string }
}
```

### 服务端 → 客户端

#### init

订阅成功后，返回历史事件。

```typescript
{
  type: 'init',
  events: Event[]
}
```

#### event

实时推送新事件。

```typescript
{
  type: 'event',
  data: {
    event_id: number,
    agent_id: string,
    project_id: string,
    type: EventType,
    state: AgentState,
    server_ts: string,
    payload?: object
  }
}
```

---

## 数据库 Schema

### events 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 自增主键 |
| agent_id | TEXT | Agent 标识 |
| project_id | TEXT | 项目标识 |
| session_id | TEXT | 会话 ID |
| trace_id | TEXT | 追踪 ID |
| span_id | TEXT | 调用级 ID |
| type | TEXT | 事件类型 |
| state | TEXT | Agent 状态 |
| payload | TEXT | JSON 载荷 |
| client_ts | TEXT | 客户端时间 |
| server_ts | TEXT | 服务端时间 |

**索引:**
- `idx_events_project (project_id, id DESC)`
- `idx_events_agent (agent_id, id DESC)`

### agents 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| project_id | TEXT | 项目标识 |
| current_state | TEXT | 当前状态 |
| current_model | TEXT | 当前模型 |
| last_seen | TEXT | 最后活跃时间 |
