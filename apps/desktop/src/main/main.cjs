const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const pty = require("node-pty");
const { execSync } = require("child_process");

const PROJECTS_DIR = path.join(os.homedir(), "Projects");
const CONFIG_DIR = path.join(os.homedir(), ".commanddeck");
const CONFIG_PATH = path.join(CONFIG_DIR, "projects.json");

const NAME_POOL = [
  "Alice", "Bob", "Clara", "Dylan", "Evelyn", "Finn", "Grace", "Henry",
  "Ivy", "Jack", "Kara", "Leo", "Mia", "Nora", "Owen", "Pia",
  "Quinn", "Rui", "Sara", "Theo", "Una", "Vera", "Will", "Xena",
  "Yuri", "Zoe"
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
    status: agent.status,
    deskIndex: agent.deskIndex,
  }));
}

function appendAgentLog(id, line) {
  const existing = agentLogs.get(id) || [];
  
  // Deduplication: skip if last line is identical
  if (existing.length > 0 && existing[existing.length - 1] === line) {
    return;
  }
  
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
  
  // Random name selection
  const availableNames = NAME_POOL.filter(name => !used.has(name));
  
  if (availableNames.length > 0) {
    // Pick random name from available
    const randomIndex = Math.floor(Math.random() * availableNames.length);
    return availableNames[randomIndex];
  }
  
  // If all names used, add number suffix
  let index = 1;
  while (used.has(`Agent${index}`)) {
    index += 1;
  }
  return `Agent${index}`;
}

function startAgent({ projectName, hubUrl, deskIndex }) {
  const projectPath = path.join(PROJECTS_DIR, projectName);
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
    const finalize = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    const id = `${projectName}:${agentName}`;
    const sessionId = require("crypto").randomUUID();
    
    // Cloud Code setup
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
      handleAgentOutput(id, data);
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
      sessionId: sessionId,
      startedAt: new Date().toISOString(),
      status: 'idle',
      deskIndex: deskIndex,
    };
    agents.set(id, record);
    agentLogs.set(id, []);
    broadcastAgents();
    
    setTimeout(() => {
      finalize({
        ok: true,
        agent: { id, name: agentName, project: projectName, deskIndex },
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
    return { ok: true };
  } catch (error) {
    console.error(`[Agent] Failed to stop ${agentId}:`, error);
    return { ok: false, reason: "kill_failed", error: error.message };
  }
}

function dissolveProject(projectName) {
  console.log(`[Dissolve] Dissolving project: ${projectName}`);
  
  // Step 1: Find and stop all agents for this project
  const projectAgents = Array.from(agents.values())
    .filter(agent => agent.project === projectName);
  
  let stoppedCount = 0;
  projectAgents.forEach(agent => {
    try {
      console.log(`[Dissolve] Terminating agent: ${agent.id}`);
      agent.process.kill();
      stoppedCount++;
    } catch (error) {
      console.error(`[Dissolve] Failed to kill ${agent.id}:`, error);
    }
  });
  
  // Step 2: Remove from config
  const config = loadConfig();
  config.projects = config.projects.filter(p => p.name !== projectName);
  saveConfig(config);
  
  console.log(`[Dissolve] Removed project ${projectName} from config`);
  console.log(`[Dissolve] Stopped ${stoppedCount} agents`);
  
  // Step 3: Broadcast updates
  broadcastProjects();
  broadcastAgents();
  
  return { ok: true, stoppedAgents: stoppedCount };
}

function sendMessage({ agentId, text }) {
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
  console.log(`[Message] Queued for ${agentId}: "${text.trim().substring(0, 50)}..." (queue size: ${agent.commandQueue.length})`);
  
  processCommandQueue(agentId);
  
  return { ok: true, queued: true };
}

function processCommandQueue(agentId) {
  const agent = agents.get(agentId);
  if (!agent || agent.isProcessing || !agent.commandQueue || agent.commandQueue.length === 0) {
    return;
  }
  
  agent.isProcessing = true;
  agent.status = 'working';
  broadcastAgents();
  
  const text = agent.commandQueue.shift();
  
  if (agent.messageCount === undefined) {
    agent.messageCount = 0;
  }
  agent.messageCount++;
  
  try {
    const escapedText = text.replace(/'/g, "'\\''");
    
    let command;
    if (agent.messageCount === 1) {
      command = `echo '${escapedText}' | claude -p --allowed-tools "Write,Bash" --permission-mode acceptEdits --session-id ${agent.sessionId}\n`;
      console.log(`[Message] First message to ${agentId}, creating session ${agent.sessionId.substring(0, 8)}...`);
    } else {
      command = `echo '${escapedText}' | claude -p --allowed-tools "Write,Bash" --permission-mode acceptEdits --resume ${agent.sessionId}\n`;
      console.log(`[Message] Resuming session ${agent.sessionId.substring(0, 8)} for ${agentId} (message #${agent.messageCount})`);
    }
    
    agent.process.write(command);
    
  } catch (error) {
    agent.isProcessing = false;
    agent.status = 'error';
    broadcastAgents();
    console.error(`[Message] Failed to send to ${agentId}:`, error);
  }
}

function handleAgentOutput(agentId, data) {
  const agent = agents.get(agentId);
  if (!agent) return;
  
  const line = data.toString();
  appendAgentLog(agentId, line);
  
  if (line.toLowerCase().includes('error:') || line.toLowerCase().includes('failed:')) {
    agent.status = 'error';
    broadcastAgents();
  }
  
  if (agent.isProcessing && line.includes('bash-') && line.includes('$')) {
    agent.isProcessing = false;
    
    if (agent.status !== 'error') {
      agent.status = 'idle';
    }
    
    if (agent.commandQueue && agent.commandQueue.length > 0) {
       setTimeout(() => processCommandQueue(agentId), 200);
    } else {
       broadcastAgents();
    }
  }
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

  if (process.env.npm_lifecycle_event === 'dev:electron' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
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

ipcMain.handle("projects:list", () => listProjects());
ipcMain.handle("projects:add", (_event, name) => addProject(name));
ipcMain.handle("projects:create", (_event, name) => createProject(name));
ipcMain.handle("projects:remove", (_event, name) => removeProject(name));
ipcMain.handle("projects:dissolve", (_event, projectName) => dissolveProject(projectName));

ipcMain.handle("agents:list", () => listAgents());
ipcMain.handle("agents:start", (_event, payload) => startAgent(payload));
ipcMain.handle("agents:stop", (_event, payload) => stopAgent(payload));
ipcMain.handle("agents:message", (_event, payload) => sendMessage(payload));
ipcMain.handle("agents:logs", (_event, agentId) => agentLogs.get(agentId) || []);

ipcMain.on("projects:changed", () => broadcastProjects());

// ============= Git Integration =============
// Get list of modified files in a project
function getGitChanges(projectName) {
  const projectPath = path.join(PROJECTS_DIR, projectName);
  
  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "project_not_found" };
  }
  
  try {
    // Get status of modified files
    const statusOutput = execSync('git status --porcelain', { 
      cwd: projectPath, 
      encoding: 'utf-8' 
    });
    
    const changes = [];
    const lines = statusOutput.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      const status = line.substring(0, 2);
      const filePath = line.substring(3);
      
      // M = modified, A = added, D = deleted, ?? = untracked
      if (status.includes('M') || status.includes('A') || status.includes('D') || status === '??') {
        // Determine the actual status
        let fileStatus = 'modified';
        if (status === '??') {
          fileStatus = 'added'; // Treat untracked as "added"
        } else if (status.includes('A')) {
          fileStatus = 'added';
        } else if (status.includes('D')) {
          fileStatus = 'deleted';
        }
        
        // Get diff stats for this file (skip for untracked files as they won't have diff)
        let additions = 0;
        let deletions = 0;
        
        if (status !== '??') {
          try {
            const diffStats = execSync(`git diff --numstat HEAD -- "${filePath}"`, {
              cwd: projectPath,
              encoding: 'utf-8'
            }).trim();
            
            const [add = '0', del = '0'] = diffStats.split('\t');
            additions = parseInt(add) || 0;
            deletions = parseInt(del) || 0;
          } catch (err) {
            // If diff fails, use 0 stats
          }
        } else {
          // For untracked files, count lines in the file as additions
          try {
            const fullPath = path.join(projectPath, filePath);
            const content = fs.readFileSync(fullPath, 'utf-8');
            additions = content.split('\n').length;
          } catch {
            additions = 0;
          }
        }
        
        changes.push({
          file: filePath,
          status: fileStatus,
          additions,
          deletions,
          timestamp: Date.now()
        });
      }
    }
    
    return { ok: true, changes };
  } catch (err) {
    console.error('[Git] Failed to get changes:', err.message);
    return { ok: false, reason: err.message };
  }
}

// Get diff for a specific file
function getGitDiff(projectName, filePath) {
  const projectPath = path.join(PROJECTS_DIR, projectName);
  
  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "project_not_found" };
  }
  
  const fullFilePath = path.join(projectPath, filePath);
  if (!fs.existsSync(fullFilePath)) {
    return { ok: false, reason: "file_not_found" };
  }
  
  try {
    // Get the unified diff
    const diff = execSync(`git diff HEAD -- "${filePath}"`, {
      cwd: projectPath,
      encoding: 'utf-8'
    });
    
    // Get old content (HEAD version)
    let oldContent = '';
    try {
      oldContent = execSync(`git show HEAD:"${filePath}"`, {
        cwd: projectPath,
        encoding: 'utf-8'
      });
    } catch {
      // File might be new
      oldContent = '';
    }
    
    // Get new content (working directory)
    const newContent = fs.readFileSync(fullFilePath, 'utf-8');
    
    return {
      ok: true,
      filePath,
      diff,
      oldContent,
      newContent
    };
  } catch (err) {
    console.error('[Git] Failed to get diff:', err.message);
    return { ok: false, reason: err.message };
  }
}

// Approve change (stage file)
function approveGitChange(projectName, filePath) {
  const projectPath = path.join(PROJECTS_DIR, projectName);
  
  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "project_not_found" };
  }
  
  try {
    execSync(`git add "${filePath}"`, {
      cwd: projectPath,
      encoding: 'utf-8'
    });
    
    console.log(`[Git] Approved change: ${filePath}`);
    return { ok: true };
  } catch (err) {
    console.error('[Git] Failed to approve change:', err.message);
    return { ok: false, reason: err.message };
  }
}

// Reject change (discard file changes)
function rejectGitChange(projectName, filePath) {
  const projectPath = path.join(PROJECTS_DIR, projectName);
  
  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "project_not_found" };
  }
  
  try {
    execSync(`git restore "${filePath}"`, {
      cwd: projectPath,
      encoding: 'utf-8'
    });
    
    console.log(`[Git] Rejected change: ${filePath}`);
    return { ok: true };
  } catch (err) {
    console.error('[Git] Failed to reject change:', err.message);
    return { ok: false, reason: err.message };
  }
}

// Git IPC handlers
ipcMain.handle("git:getChanges", (_event, projectName) => getGitChanges(projectName));
ipcMain.handle("git:getDiff", (_event, { projectName, filePath }) => getGitDiff(projectName, filePath));
ipcMain.handle("git:approveChange", (_event, { projectName, filePath }) => approveGitChange(projectName, filePath));
ipcMain.handle("git:rejectChange", (_event, { projectName, filePath }) => rejectGitChange(projectName, filePath));

// ============= Process Cleanup on Exit =============
// Kill all PTY processes when app exits (Ctrl+C, SIGINT, SIGTERM)
function killAllAgents() {
  console.log('[Cleanup] Killing all agent PTY processes...');
  let killedCount = 0;
  
  agents.forEach((agent, id) => {
    try {
      agent.process.kill();
      killedCount++;
      console.log(`[Cleanup] Killed agent ${id} (PID ${agent.process.pid})`);
    } catch (err) {
      console.error(`[Cleanup] Failed to kill agent ${id}:`, err.message);
    }
  });
  
  console.log(`[Cleanup] ${killedCount} agent(s) terminated`);
  agents.clear();
  agentLogs.clear();
}

// Handle app quit
app.on('before-quit', () => {
  killAllAgents();
});

// Handle Ctrl+C in terminal (SIGINT)
process.on('SIGINT', () => {
  console.log('[Signal] Received SIGINT (Ctrl+C), cleaning up...');
  killAllAgents();
  process.exit(0);
});

// Handle termination signal (SIGTERM)
process.on('SIGTERM', () => {
  console.log('[Signal] Received SIGTERM, cleaning up...');
  killAllAgents();
  process.exit(0);
});
