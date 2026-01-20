const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const pty = require("node-pty");

const PROJECTS_DIR = path.join(os.homedir(), "Projects");
const CONFIG_DIR = path.join(os.homedir(), ".commanddeck");
const CONFIG_PATH = path.join(CONFIG_DIR, "projects.json");

const NAME_POOL = [
  "Alice",
  "Bob",
  "Clara",
  "Dylan",
  "Evelyn",
  "Finn",
  "Grace",
  "Henry",
  "Ivy",
  "Jack",
  "Kara",
  "Leo",
  "Mia",
  "Nora",
  "Owen",
  "Pia",
  "Quinn",
  "Rui",
  "Sara",
  "Theo",
  "Una",
  "Vera",
  "Will",
  "Xena",
  "Yuri",
  "Zoe",
];

let mainWindow;
const agents = new Map();
const agentLogs = new Map();

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig() {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    return { projects: [] };
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.projects)) {
      return { projects: [] };
    }
    return data;
  } catch {
    return { projects: [] };
  }
}

function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function listProjects() {
  const config = loadConfig();
  return config.projects;
}

function addProject(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }
  const config = loadConfig();
  const existing = config.projects.find((project) => project.name === trimmed);
  if (existing) {
    return { ok: true, project: existing };
  }
  const projectPath = path.join(PROJECTS_DIR, trimmed);
  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "missing", path: projectPath };
  }
  const project = { name: trimmed, path: projectPath };
  config.projects.push(project);
  saveConfig(config);
  return { ok: true, project };
}

function createProject(name) {
  const trimmed = name.trim();
  const projectPath = path.join(PROJECTS_DIR, trimmed);
  fs.mkdirSync(projectPath, { recursive: true });
  const config = loadConfig();
  const existing = config.projects.find((project) => project.name === trimmed);
  if (!existing) {
    config.projects.push({ name: trimmed, path: projectPath });
    saveConfig(config);
  }
  return { ok: true, project: { name: trimmed, path: projectPath } };
}

function removeProject(name) {
  const config = loadConfig();
  const next = config.projects.filter((project) => project.name !== name);
  config.projects = next;
  saveConfig(config);
  return { ok: true };
}

function listAgents() {
  return Array.from(agents.values()).map((agent) => ({
    id: agent.id,
    name: agent.name,
    project: agent.project,
    pid: agent.process.pid,
    startedAt: agent.startedAt,
  }));
}

function appendAgentLog(id, line) {
  const existing = agentLogs.get(id) || [];
  existing.push(line);
  if (existing.length > 200) {
    existing.shift();
  }
  agentLogs.set(id, existing);
  if (mainWindow) {
    mainWindow.webContents.send("agent-log", { id, line });
  }
}

function notifyAgentExit(id, info) {
  if (mainWindow) {
    mainWindow.webContents.send("agent-exit", { id, ...info });
  }
}

function broadcastAgents() {
  if (mainWindow) {
    mainWindow.webContents.send("agents-changed", listAgents());
  }
}

function broadcastProjects() {
  if (mainWindow) {
    mainWindow.webContents.send("projects-changed", listProjects());
  }
}

function nextAgentName(projectName) {
  const used = new Set(
    Array.from(agents.values())
      .filter((agent) => agent.project === projectName)
      .map((agent) => agent.name)
  );
  for (const name of NAME_POOL) {
    if (!used.has(name)) {
      return name;
    }
  }
  let index = 1;
  while (used.has(`Agent${index}`)) {
    index += 1;
  }
  return `Agent${index}`;
}

function startAgent({ projectName, hubUrl }) {
  const projectPath = path.join(PROJECTS_DIR, projectName);
  console.log(`[Agent] Starting agent for project: ${projectName}`);
  
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
    const finalize = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    const id = `${projectName}:${agentName}`;
    
    // 为每个 agent 生成一个唯一的 session UUID 用于维持对话上下文
    const sessionId = require("crypto").randomUUID();
    
    // Claude Code 交互模式不支持编程式 Enter 提交
    // 使用 bash 包装运行 claude，每次收到消息时用 -p 模式执行
    const ptyProcess = pty.spawn("bash", [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: projectPath,
      env: env,
    });

    console.log(`[Agent] PTY spawned with PID: ${ptyProcess.pid}`);
    console.log(`[Agent] Session ID: ${sessionId}`);

    ptyProcess.onData((data) => {
      const line = data.toString();
      console.log(`[Agent ${id}] PTY output:`, line);
      appendAgentLog(id, line);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`[Agent ${id}] Exit: code=${exitCode}, signal=${signal}`);
      agents.delete(id);
      agentLogs.delete(id);
      broadcastAgents();
      notifyAgentExit(id, { reason: "exit" });
    });

    const record = {
      id,
      name: agentName,
      project: projectName,
      process: ptyProcess,
      sessionId: sessionId,  // 存储 session ID
      startedAt: new Date().toISOString(),
    };
    agents.set(id, record);
    agentLogs.set(id, []);
    broadcastAgents();
    
    setTimeout(() => {
      finalize({
        ok: true,
        agent: { id, name: agentName, project: projectName },
      });
    }, 500);
  });
}

function stopAgent({ agentId }) {
  const agent = agents.get(agentId);
  if (!agent) {
    return { ok: false, reason: "not_found" };
  }
  
  try {
    console.log(`[Agent] Stopping agent: ${agentId}`);
    agent.process.kill();
    // cleanup会在 onExit 中自动处理
    return { ok: true };
  } catch (error) {
    console.error(`[Agent] Failed to stop ${agentId}:`, error);
    return { ok: false, reason: "kill_failed", error: error.message };
  }
}

function sendMessage({ agentId, text }) {
  const agent = agents.get(agentId);
  if (!agent) {
    return { ok: false, reason: "not_found" };
  }
  if (!text.trim()) {
    return { ok: false, reason: "empty" };
  }
  try {
    // 使用 claude -p (print mode) 执行单次命令
    // --allowed-tools: 允许 Write 和 Bash 工具（Bash 用于 git 操作）
    // --permission-mode acceptEdits: 自动批准所有编辑操作
    // --session-id: 使用固定 UUID 维持对话上下文
    // 使用默认 text 输出格式（简洁，节省存储）
    // 通过 stdin 管道提供 prompt
    const escapedText = text.trim().replace(/'/g, "'\\''");
    const command = `echo '${escapedText}' | claude -p \\
      --allowed-tools "Write,Bash" \\
      --permission-mode acceptEdits \\
      --session-id ${agent.sessionId}\n`;
    
    agent.process.write(command);
    console.log(`[Message] Sent to agent ${agentId} (session: ${agent.sessionId.substring(0, 8)}...)`);
  } catch (error) {
    return { ok: false, reason: "write_failed", error: error.message };
  }
  return { ok: true };
}




function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0b10",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "../preload/index.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("projects:list", () => listProjects());
ipcMain.handle("projects:add", (_event, name) => addProject(name));
ipcMain.handle("projects:create", (_event, name) => createProject(name));
ipcMain.handle("projects:remove", (_event, name) => removeProject(name));

ipcMain.handle("agents:list", () => listAgents());
ipcMain.handle("agents:start", (_event, payload) => startAgent(payload));
ipcMain.handle("agents:stop", (_event, payload) => stopAgent(payload));
ipcMain.handle("agents:message", (_event, payload) => sendMessage(payload));
ipcMain.handle("agents:logs", (_event, agentId) => agentLogs.get(agentId) || []);

ipcMain.on("projects:changed", () => broadcastProjects());
