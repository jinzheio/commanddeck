import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import type { AgentEvent, StoredEvent } from "@commanddeck/protocol";

const DB_FILENAME = "events.sqlite";

function getDataDir(): string {
  const home = os.homedir();
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", "CommandDeck");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, "CommandDeck");
  }
  return path.join(home, ".config", "CommandDeck");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const dataDir = getDataDir();
ensureDir(dataDir);

const dbPath = path.join(dataDir, DB_FILENAME);
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  session_id TEXT,
  trace_id TEXT,
  span_id TEXT,
  type TEXT NOT NULL,
  state TEXT,
  payload TEXT,
  client_ts TEXT,
  server_ts TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id, id DESC);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  current_state TEXT DEFAULT 'IDLE',
  current_model TEXT,
  last_seen TEXT
);

CREATE INDEX IF NOT EXISTS idx_agents_project ON agents(project_id);
`);

const insertEventStmt = db.prepare(`
  INSERT INTO events (
    agent_id,
    project_id,
    session_id,
    trace_id,
    span_id,
    type,
    state,
    payload,
    client_ts,
    server_ts
  ) VALUES (
    @agent_id,
    @project_id,
    @session_id,
    @trace_id,
    @span_id,
    @type,
    @state,
    @payload,
    @client_ts,
    @server_ts
  )
`);

const upsertAgentStmt = db.prepare(`
  INSERT INTO agents (id, project_id, current_state, current_model, last_seen)
  VALUES (@id, @project_id, @current_state, @current_model, @last_seen)
  ON CONFLICT(id) DO UPDATE SET
    project_id = excluded.project_id,
    current_state = excluded.current_state,
    current_model = excluded.current_model,
    last_seen = excluded.last_seen
`);

const getEventsSinceStmt = db.prepare(`
  SELECT * FROM events
  WHERE project_id = ? AND id > ?
  ORDER BY id ASC
`);

function serializePayload(payload: AgentEvent["payload"]) {
  return payload ? JSON.stringify(payload) : null;
}

function deserializePayload(payload: string | null) {
  if (!payload) return undefined;
  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

export function insertEvent(event: AgentEvent & { server_ts: string }): number {
  const result = insertEventStmt.run({
    agent_id: event.agent_id,
    project_id: event.project_id,
    session_id: event.session_id ?? null,
    trace_id: event.trace_id ?? null,
    span_id: event.span_id ?? null,
    type: event.type,
    state: event.state,
    payload: serializePayload(event.payload),
    client_ts: event.client_ts ?? null,
    server_ts: event.server_ts,
  });
  return Number(result.lastInsertRowid);
}

export function upsertAgent(event: AgentEvent & { server_ts: string }) {
  upsertAgentStmt.run({
    id: event.agent_id,
    project_id: event.project_id,
    current_state: event.state,
    current_model: event.payload?.model_name ?? null,
    last_seen: event.server_ts,
  });
}

export function getEventsSince(
  projectId: string,
  sinceId: number
): StoredEvent[] {
  const rows = getEventsSinceStmt.all(projectId, sinceId) as Array<{
    id: number;
    agent_id: string;
    project_id: string;
    session_id: string | null;
    trace_id: string | null;
    span_id: string | null;
    type: string;
    state: string | null;
    payload: string | null;
    client_ts: string | null;
    server_ts: string;
  }>;
  return rows.map((row) => ({
    event_id: row.id,
    agent_id: row.agent_id,
    project_id: row.project_id,
    session_id: row.session_id ?? undefined,
    trace_id: row.trace_id ?? undefined,
    span_id: row.span_id ?? undefined,
    type: row.type as StoredEvent["type"],
    state: row.state as StoredEvent["state"],
    payload: deserializePayload(row.payload),
    client_ts: row.client_ts ?? undefined,
    server_ts: row.server_ts,
  }));
}
