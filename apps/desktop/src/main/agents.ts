import fs from "fs";
import { randomUUID } from "crypto";
import pty from "node-pty";

const NAME_POOL = [
  "Alice", "Bob", "Clara", "Dylan", "Evelyn", "Finn", "Grace", "Henry",
  "Ivy", "Jack", "Kara", "Leo", "Mia", "Nora", "Owen", "Pia",
  "Quinn", "Rui", "Sara", "Theo", "Una", "Vera", "Will", "Xena",
  "Yuri", "Zoe",
];

export interface AgentRecord {
  id: string;
  name: string;
  project: string;
  process: pty.IPty;
  sessionId: string;
  startedAt: string;
  status: string;
  deskIndex: number;
  commandQueue?: string[];
  isProcessing?: boolean;
  messageCount?: number;
  currentCommandToken?: string;
}

interface AgentsCallbacks {
  onAgentsChanged?: (agents: Array<{
    id: string;
    name: string;
    project: string;
    pid: number;
    startedAt: string;
    status: string;
    deskIndex: number;
  }>) => void;
  onAgentLog?: (id: string, line: string) => void;
  onAgentExit?: (id: string, info: { reason: string; error?: string }) => void;
}

export function createAgentsManager(
  { resolveProjectPath, onAgentsChanged, onAgentLog, onAgentExit }: { resolveProjectPath: (projectName: string) => string } & AgentsCallbacks
) {
  const agents = new Map<string, AgentRecord>();
  const agentLogs = new Map<string, string[]>();
  const agentLogBuffers = new Map<string, string>();

  function listAgents() {
    return Array.from(agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name,
      project: agent.project,
      pid: agent.process.pid,
      startedAt: agent.startedAt,
      status: agent.status,
      deskIndex: agent.deskIndex,
    }));
  }

  function broadcastAgents() {
    if (onAgentsChanged) {
      onAgentsChanged(listAgents());
    }
  }

  function appendAgentLog(id: string, line: string) {
    const existing = agentLogs.get(id) || [];
    if (existing.length > 0 && existing[existing.length - 1] === line) {
      return;
    }
    existing.push(line);
    if (existing.length > 200) {
      existing.shift();
    }
    agentLogs.set(id, existing);
    if (onAgentLog) {
      onAgentLog(id, line);
    }
  }

  function notifyAgentExit(id: string, info: { reason: string; error?: string }) {
    if (onAgentExit) {
      onAgentExit(id, info);
    }
  }

  function nextAgentName(projectName: string) {
    const used = new Set(
      Array.from(agents.values())
        .filter((agent) => agent.project === projectName)
        .map((agent) => agent.name)
    );

    const availableNames = NAME_POOL.filter((name) => !used.has(name));
    if (availableNames.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableNames.length);
      return availableNames[randomIndex];
    }

    let index = 1;
    while (used.has(`Agent${index}`)) {
      index += 1;
    }
    return `Agent${index}`;
  }

  function handleAgentOutput(agentId: string, data: string) {
    const agent = agents.get(agentId);
    if (!agent) return;

    const chunk = data.toString();
    const buffer = agentLogBuffers.get(agentId) || "";
    const normalized = (buffer + chunk).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = normalized.split("\n");
    const nextBuffer = lines.pop() ?? "";
    agentLogBuffers.set(agentId, nextBuffer);

    for (const line of lines) {
      if (!line) continue;
      const normalizedLine = line
        .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
        .replace(/\x1b\][^\x07]*\x07/g, "")
        .trim();
      if (
        agent.isProcessing &&
        agent.currentCommandToken &&
        normalizedLine === agent.currentCommandToken
      ) {
        agent.isProcessing = false;
        agent.currentCommandToken = undefined;

        if (agent.status !== "error") {
          agent.status = "idle";
        }

        if (agent.commandQueue && agent.commandQueue.length > 0) {
          setTimeout(() => processCommandQueue(agentId), 200);
        } else {
          broadcastAgents();
        }
        continue;
      }

      appendAgentLog(agentId, line);

      if (line.toLowerCase().includes("error:") || line.toLowerCase().includes("failed:")) {
        agent.status = "error";
        broadcastAgents();
      }
    }
  }

  function startAgent({ projectName, hubUrl, deskIndex }: { projectName: string; hubUrl?: string; deskIndex: number }) {
    const projectPath = resolveProjectPath(projectName);
    console.log(`[Agent] Starting agent for project: ${projectName} at desk ${deskIndex}`);

    if (!fs.existsSync(projectPath)) {
      return { ok: false, reason: "missing_project", path: projectPath };
    }

    const agentName = nextAgentName(projectName);
    const env = {
      ...process.env,
      AGENT_CONSOLE_URL: hubUrl || "http://127.0.0.1:8787",
      AGENT_CONSOLE_AGENT_ID: agentName,
      AGENT_CONSOLE_PROJECT_ID: projectName,
    };

    return new Promise((resolve) => {
      let resolved = false;
      const finalize = (result: any) => {
        if (resolved) return;
        resolved = true;
        resolve(result);
      };

      const id = `${projectName}:${agentName}`;
      const sessionId = randomUUID();

      const ptyProcess = pty.spawn("bash", [], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: projectPath,
        env,
      });

      console.log(`[Agent] PTY spawned with PID: ${ptyProcess.pid}`);
      console.log(`[Agent] Session ID: ${sessionId}`);

      ptyProcess.onData((data) => {
        handleAgentOutput(id, data);
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`[Agent ${id}] Exit: code=${exitCode}, signal=${signal}`);
        agents.delete(id);
        agentLogs.delete(id);
        agentLogBuffers.delete(id);
        broadcastAgents();
        notifyAgentExit(id, { reason: "exit" });
      });

      const record: AgentRecord = {
        id,
        name: agentName,
        project: projectName,
        process: ptyProcess,
        sessionId,
        startedAt: new Date().toISOString(),
        status: "idle",
        deskIndex,
      };
      agents.set(id, record);
      agentLogs.set(id, []);
      agentLogBuffers.set(id, "");
      broadcastAgents();

      setTimeout(() => {
        finalize({
          ok: true,
          agent: { id, name: agentName, project: projectName, deskIndex },
        });
      }, 500);
    });
  }

  function stopAgent({ agentId }: { agentId: string }) {
    const agent = agents.get(agentId);
    if (!agent) {
      return { ok: false, reason: "not_found" };
    }

    try {
      console.log(`[Agent] Stopping agent: ${agentId}`);
      agent.process.kill();
      return { ok: true };
    } catch (error: any) {
      console.error(`[Agent] Failed to stop ${agentId}:`, error);
      return { ok: false, reason: "kill_failed", error: error.message };
    }
  }

  function processCommandQueue(agentId: string) {
    const agent = agents.get(agentId);
    if (!agent || agent.isProcessing || !agent.commandQueue || agent.commandQueue.length === 0) {
      return;
    }

    agent.isProcessing = true;
    agent.status = "working";
    broadcastAgents();

    const text = agent.commandQueue.shift() || "";

    if (agent.messageCount === undefined) {
      agent.messageCount = 0;
    }
    agent.messageCount += 1;
    const commandToken = `__CMD_DONE__:${agent.sessionId}:${agent.messageCount}`;
    agent.currentCommandToken = commandToken;

    try {
      const escapedText = text.replace(/'/g, "'\\''");

      let command;
      if (agent.messageCount === 1) {
        command = `echo '${escapedText}' | claude -p --allowed-tools "Write,Bash" --permission-mode acceptEdits --session-id ${agent.sessionId} ; echo '${commandToken}'\n`;
        console.log(`[Message] First message to ${agentId}, creating session ${agent.sessionId.substring(0, 8)}...`);
      } else {
        command = `echo '${escapedText}' | claude -p --allowed-tools "Write,Bash" --permission-mode acceptEdits --resume ${agent.sessionId} ; echo '${commandToken}'\n`;
        console.log(`[Message] Resuming session ${agent.sessionId.substring(0, 8)} for ${agentId} (message #${agent.messageCount})`);
      }

      agent.process.write(command);
    } catch (error: any) {
      agent.isProcessing = false;
      agent.status = "error";
      broadcastAgents();
      console.error(`[Message] Failed to send to ${agentId}:`, error);
    }
  }

  function sendMessage({ agentId, text }: { agentId: string; text: string }) {
    const agent = agents.get(agentId);
    if (!agent) {
      return { ok: false, reason: "not_found" };
    }
    if (!text.trim()) {
      return { ok: false, reason: "empty" };
    }

    if (!agent.commandQueue) {
      agent.commandQueue = [];
      agent.isProcessing = false;
    }

    agent.commandQueue.push(text.trim());
    console.log(
      `[Message] Queued for ${agentId}: "${text.trim().substring(0, 50)}..." (queue size: ${agent.commandQueue.length})`
    );

    processCommandQueue(agentId);
    return { ok: true, queued: true };
  }

  function stopAgentsForProject(projectName: string) {
    const projectAgents = Array.from(agents.values())
      .filter((agent) => agent.project === projectName);

    let stoppedCount = 0;
    projectAgents.forEach((agent) => {
      try {
        console.log(`[Dissolve] Terminating agent: ${agent.id}`);
        agent.process.kill();
        stoppedCount += 1;
      } catch (error) {
        console.error(`[Dissolve] Failed to kill ${agent.id}:`, error);
      }
    });

    return stoppedCount;
  }

  function killAllAgents() {
    console.log("[Cleanup] Killing all agent PTY processes...");
    let killedCount = 0;

    agents.forEach((agent, id) => {
      try {
        agent.process.kill();
        killedCount += 1;
        console.log(`[Cleanup] Killed agent ${id} (PID ${agent.process.pid})`);
      } catch (err: any) {
        console.error(`[Cleanup] Failed to kill agent ${id}:`, err.message);
      }
    });

    console.log(`[Cleanup] ${killedCount} agent(s) terminated`);
    agents.clear();
    agentLogs.clear();
    agentLogBuffers.clear();
  }

  function getAgentLogs(agentId: string) {
    return agentLogs.get(agentId) || [];
  }

  return {
    agents,
    listAgents,
    startAgent,
    stopAgent,
    sendMessage,
    getAgentLogs,
    stopAgentsForProject,
    killAllAgents,
    broadcastAgents,
  };
}
