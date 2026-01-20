// packages/protocol/src/events.ts
// 事件类型定义

import { z } from "zod";

// 事件类型枚举
export const EventTypeEnum = z.enum([
	"session_start",
	"session_end",
	"tool_start",
	"tool_end",
	"error",
	"status",
	"approval_request",
	"model_switch",
]);

// Agent 状态枚举
export const AgentStateEnum = z.enum([
	"IDLE",
	"RUNNING",
	"WAITING_USER",
	"WAITING_APPROVAL",
	"ERROR",
	"DONE",
]);

// Agent 事件 Schema
export const AgentEventSchema = z.object({
	agent_id: z.string().min(1),
	project_id: z.string().min(1),
	session_id: z.string().optional(),
	trace_id: z.string().optional(),
	span_id: z.string().optional(),
	type: EventTypeEnum,
	state: AgentStateEnum,
	client_ts: z.string().optional(),
	payload: z
		.object({
			tool_name: z.string().optional(),
			message: z.string().optional(),
			model_name: z.string().optional(),
			previous_model: z.string().optional(),
			quota_remaining: z.number().min(0).max(100).optional(),
			error_details: z.string().optional(),
		})
		.optional(),
});

// 存储的事件（包含服务端生成的字段）
export const StoredEventSchema = AgentEventSchema.extend({
	event_id: z.number(),
	server_ts: z.string(),
});

// 类型导出
export type EventType = z.infer<typeof EventTypeEnum>;
export type AgentState = z.infer<typeof AgentStateEnum>;
export type AgentEvent = z.infer<typeof AgentEventSchema>;
export type StoredEvent = z.infer<typeof StoredEventSchema>;
