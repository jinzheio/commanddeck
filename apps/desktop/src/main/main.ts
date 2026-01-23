import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { loadConfig, saveConfig } from "./config.js";
import {
  listProjects,
  addProject,
  createProject,
  removeProject,
  updateProject,
  resolveProjectPath,
} from "./projects.js";
import {
  getGitChanges,
  getGitDiff,
  approveGitChange,
  rejectGitChange,
} from "./git.js";
import { registerIpc } from "./ipc.js";
import { createAgentsManager } from "./agents.js";

let mainWindow: BrowserWindow | null;
let agentsManager: ReturnType<typeof createAgentsManager> | null;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function broadcastProjects() {
  if (mainWindow) {
    mainWindow.webContents.send("projects-changed", listProjects());
  }
}

function handleUpdateProject(payload: { name?: string; updates?: { name?: string; domain?: string | null } }) {
  return updateProject(payload?.name || "", payload?.updates || {}, agentsManager?.agents);
}

function dissolveProject(projectName: string) {
  console.log(`[Dissolve] Dissolving project: ${projectName}`);

  const stoppedCount = agentsManager ? agentsManager.stopAgentsForProject(projectName) : 0;

  const config = loadConfig();
  config.projects = config.projects.filter((project) => project.name !== projectName);
  saveConfig(config);

  console.log(`[Dissolve] Removed project ${projectName} from config`);
  console.log(`[Dissolve] Stopped ${stoppedCount} agents`);

  broadcastProjects();
  agentsManager?.broadcastAgents();

  return { ok: true, stoppedAgents: stoppedCount };
}

function createWindow() {
  const preloadPath = path.join(__dirname, "..", "preload", "index.js");
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0b10",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  if (process.env.npm_lifecycle_event === "dev:electron" || process.argv.includes("--dev")) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
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

agentsManager = createAgentsManager({
  resolveProjectPath,
  onAgentsChanged: (agents) => {
    if (mainWindow) {
      mainWindow.webContents.send("agents-changed", agents);
    }
  },
  onAgentLog: (id, line) => {
    if (mainWindow) {
      mainWindow.webContents.send("agent-log", { id, line });
    }
  },
  onAgentExit: (id, info) => {
    if (mainWindow) {
      mainWindow.webContents.send("agent-exit", { id, ...info });
    }
  },
});

registerIpc(ipcMain, {
  listProjects,
  addProject,
  createProject,
  removeProject,
  updateProject: handleUpdateProject,
  dissolveProject,
  broadcastProjects,
  listAgents: () => agentsManager?.listAgents() || [],
  startAgent: (payload) => agentsManager?.startAgent(payload),
  stopAgent: (payload) => agentsManager?.stopAgent(payload),
  sendMessage: (payload) => agentsManager?.sendMessage(payload),
  getAgentLogs: (agentId) => agentsManager?.getAgentLogs(agentId) || [],
  getGitChanges,
  getGitDiff: ({ projectName, filePath, status }) => getGitDiff(projectName, filePath, status),
  approveGitChange: ({ projectName, filePath }) => approveGitChange(projectName, filePath),
  rejectGitChange: ({ projectName, filePath }) => rejectGitChange(projectName, filePath),
});

function killAllAgents() {
  agentsManager?.killAllAgents();
}

app.on("before-quit", () => {
  killAllAgents();
});

process.on("SIGINT", () => {
  console.log("[Signal] Received SIGINT (Ctrl+C), cleaning up...");
  killAllAgents();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[Signal] Received SIGTERM, cleaning up...");
  killAllAgents();
  process.exit(0);
});
