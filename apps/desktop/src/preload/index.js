const { contextBridge, ipcRenderer } = require("electron");

const agentsChangedHandlers = new WeakMap();
const projectsChangedHandlers = new WeakMap();
const agentLogHandlers = new WeakMap();
const agentExitHandlers = new WeakMap();

contextBridge.exposeInMainWorld("commanddeck", {
  getProjects: () => ipcRenderer.invoke("projects:list"),
  addProject: (payload) => ipcRenderer.invoke("projects:add", payload),
  createProject: (payload) => ipcRenderer.invoke("projects:create", payload),
  removeProject: (name) => ipcRenderer.invoke("projects:remove", name),
  updateProject: (payload) => ipcRenderer.invoke("projects:update", payload),
  dissolveProject: (projectName) => ipcRenderer.invoke("projects:dissolve", projectName),
  getAgents: () => ipcRenderer.invoke("agents:list"),
  startAgent: (payload) => ipcRenderer.invoke("agents:start", payload),
  stopAgent: (payload) => ipcRenderer.invoke("agents:stop", payload),
  sendMessage: (payload) => ipcRenderer.invoke("agents:message", payload),
  onAgentsChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    agentsChangedHandlers.set(callback, handler);
    ipcRenderer.on("agents-changed", handler);
    return () => ipcRenderer.removeListener("agents-changed", handler);
  },
  offAgentsChanged: (callback) => {
    const handler = agentsChangedHandlers.get(callback);
    if (handler) {
      ipcRenderer.removeListener("agents-changed", handler);
      agentsChangedHandlers.delete(callback);
    }
  },
  onProjectsChanged: (callback) => {
    const handler = (_event, data) => callback(data);
    projectsChangedHandlers.set(callback, handler);
    ipcRenderer.on("projects-changed", handler);
    return () => ipcRenderer.removeListener("projects-changed", handler);
  },
  offProjectsChanged: (callback) => {
    const handler = projectsChangedHandlers.get(callback);
    if (handler) {
      ipcRenderer.removeListener("projects-changed", handler);
      projectsChangedHandlers.delete(callback);
    }
  },
  onAgentLog: (callback) => {
    const handler = (_event, data) => callback(data);
    agentLogHandlers.set(callback, handler);
    ipcRenderer.on("agent-log", handler);
    return () => ipcRenderer.removeListener("agent-log", handler);
  },
  offAgentLog: (callback) => {
    const handler = agentLogHandlers.get(callback);
    if (handler) {
      ipcRenderer.removeListener("agent-log", handler);
      agentLogHandlers.delete(callback);
    }
  },
  onAgentExit: (callback) => {
    const handler = (_event, data) => callback(data);
    agentExitHandlers.set(callback, handler);
    ipcRenderer.on("agent-exit", handler);
    return () => ipcRenderer.removeListener("agent-exit", handler);
  },
  offAgentExit: (callback) => {
    const handler = agentExitHandlers.get(callback);
    if (handler) {
      ipcRenderer.removeListener("agent-exit", handler);
      agentExitHandlers.delete(callback);
    }
  },
  getAgentLogs: (agentId) => ipcRenderer.invoke("agents:logs", agentId),
  // Git integration
  getGitChanges: (projectName) => ipcRenderer.invoke("git:getChanges", projectName),
  getGitDiff: (projectName, filePath, status) => ipcRenderer.invoke("git:getDiff", { projectName, filePath, status }),
  approveGitChange: (projectName, filePath) => ipcRenderer.invoke("git:approveChange", { projectName, filePath }),
  rejectGitChange: (projectName, filePath) => ipcRenderer.invoke("git:rejectChange", { projectName, filePath }),
});
