import Fastify from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import {
  AgentEventSchema,
  type StoredEvent,
  WsMessageSchema,
} from "@commanddeck/protocol";
import { getEventsSince, insertEvent, upsertAgent } from "./store";

const app = Fastify({ logger: true });
const clients = new Map<WebSocket, string>();

function broadcast(event: StoredEvent) {
  const message = JSON.stringify({ type: "event", event });
  for (const [socket, projectId] of clients.entries()) {
    if (projectId === event.project_id && socket.readyState === 1) {
      socket.send(message);
    }
  }
}

app.register(websocket);

app.post("/events", async (req, reply) => {
  const result = AgentEventSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: result.error.flatten() });
  }

  const event = result.data;
  const serverTs = new Date().toISOString();
  const id = insertEvent({ ...event, server_ts: serverTs });
  upsertAgent({ ...event, server_ts: serverTs });

  const storedEvent: StoredEvent = { ...event, event_id: id, server_ts: serverTs };
  broadcast(storedEvent);

  return { ok: true, id };
});

app.get("/stream", { websocket: true }, (connection) => {
  const socket = connection.socket;

  socket.on("message", (message) => {
    let parsed;
    try {
      parsed = JSON.parse(message.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    const result = WsMessageSchema.safeParse(parsed);
    if (!result.success) {
      socket.send(JSON.stringify({ type: "error", message: "Invalid payload" }));
      return;
    }

    if (result.data.type === "subscribe") {
      const { project_id, since_event_id } = result.data;
      clients.set(socket, project_id);
      const events = getEventsSince(project_id, since_event_id ?? 0);
      socket.send(JSON.stringify({ type: "init", events }));
      return;
    }

    if (result.data.type === "command") {
      socket.send(JSON.stringify({ type: "command_ack", ok: true }));
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
  });
});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";

app
  .listen({ port, host })
  .then(() => {
    app.log.info(`Hub listening on http://${host}:${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
