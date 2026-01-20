#!/bin/bash
# AgentMeta - Claude Code Hook Script
# 用于将 Claude Code 生命周期事件上报到 Hub

HUB_URL="${AGENT_CONSOLE_URL:-http://127.0.0.1:8787}"
AGENT_ID="${AGENT_CONSOLE_AGENT_ID:-claude-default}"
PROJECT_ID="${AGENT_CONSOLE_PROJECT_ID:-default}"
EVENT_TYPE="$1"

# 读取 stdin（Claude Code 提供的 JSON）
INPUT=$(cat 2>/dev/null || echo '{}')

# 解析字段（容错处理）
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty' 2>/dev/null || true)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)

# State 映射
case "$EVENT_TYPE" in
  session_start)
    STATE="RUNNING"
    ;;
  tool_start|tool_end)
    STATE="RUNNING"
    ;;
  session_end)
    STATE="DONE"
    ;;
  error)
    STATE="ERROR"
    ;;
  status_change)
    # Stop hook - 通常表示等待用户输入
    STATE="WAITING_USER"
    ;;
  approval_request)
    STATE="WAITING_APPROVAL"
    ;;
  *)
    STATE="RUNNING"
    ;;
esac

# 构建 JSON payload
PAYLOAD=$(jq -n \
  --arg agent_id "$AGENT_ID" \
  --arg project_id "$PROJECT_ID" \
  --arg session_id "$SESSION_ID" \
  --arg type "$EVENT_TYPE" \
  --arg state "$STATE" \
  --arg client_ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg tool_name "$TOOL_NAME" \
  '{
    agent_id: $agent_id,
    project_id: $project_id,
    session_id: (if $session_id == "" then null else $session_id end),
    type: $type,
    state: $state,
    client_ts: $client_ts,
    payload: {
      tool_name: (if $tool_name == "" then null else $tool_name end)
    }
  }')

# 发送到 Hub（后台执行，不阻塞 hook）
curl -s --max-time 2 -X POST "$HUB_URL/events" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" &>/dev/null &

exit 0
