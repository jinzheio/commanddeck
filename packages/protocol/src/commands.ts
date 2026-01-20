// packages/protocol/src/commands.ts
// 命令类型定义

import { z } from 'zod'

// 命令类型枚举
export const CommandTypeEnum = z.enum([
  'send_message',
  'approve',
  'retry',
  'cancel',
])

// UI → Hub 命令
export const CommandSchema = z.object({
  agent_id: z.string().min(1),
  type: CommandTypeEnum,
  payload: z.object({
    text: z.string().optional(),
  }).optional(),
})

// 订阅请求
export const SubscribeSchema = z.object({
  type: z.literal('subscribe'),
  project_id: z.string().min(1),
  since_event_id: z.number().optional(),
})

// WebSocket 消息类型
export const WsMessageSchema = z.discriminatedUnion('type', [
  SubscribeSchema,
  z.object({
    type: z.literal('command'),
    ...CommandSchema.shape,
  }),
])

// 类型导出
export type CommandType = z.infer<typeof CommandTypeEnum>
export type Command = z.infer<typeof CommandSchema>
export type Subscribe = z.infer<typeof SubscribeSchema>
export type WsMessage = z.infer<typeof WsMessageSchema>
