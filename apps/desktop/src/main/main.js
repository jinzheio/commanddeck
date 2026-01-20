const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

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
    const child = spawn("claude", [], {
      cwd: projectPath,
      env,
      stdio: "pipe",
    });

    const id = `${projectName}:${agentName}`;
    let resolved = false;

    const finalize = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    child.once("spawn", () => {
      const record = {
        id,
        name: agentName,
        project: projectName,
        process: child,
        startedAt: new Date().toISOString(),
      };
      agents.set(id, record);
      broadcastAgents();
      finalize({ ok: true, agent: { id, name: agentName, project: projectName } });
    });

    child.once("error", (error) => {
      finalize({ ok: false, reason: "spawn_failed", error: error.message });
    });

    child.on("exit", () => {
      agents.delete(id);
      broadcastAgents();
    });

    child.on("error", () => {
      agents.delete(id);
      broadcastAgents();
    });
  });
}

function sendMessage({ agentId, text }) {
  const agent = agents.get(agentId);
  if (!agent) {
    return { ok: false, reason: "not_found" };
  }
  if (!text.trim()) {
    return { ok: false, reason: "empty" };
  }
  agent.process.stdin.write(`${text.trim()}\n`);
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
ipcMain.handle("agents:message", (_event, payload) => sendMessage(payload));

ipcMain.on("projects:changed", () => broadcastProjects());
