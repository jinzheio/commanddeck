const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("commanddeck", {
  getProjects: () => ipcRenderer.invoke("projects:list"),
  addProject: (name) => ipcRenderer.invoke("projects:add", name),
  createProject: (name) => ipcRenderer.invoke("projects:create", name),
  removeProject: (name) => ipcRenderer.invoke("projects:remove", name),
  getAgents: () => ipcRenderer.invoke("agents:list"),
  startAgent: (payload) => ipcRenderer.invoke("agents:start", payload),
  sendMessage: (payload) => ipcRenderer.invoke("agents:message", payload),
  onAgentsChanged: (callback) =>
    ipcRenderer.on("agents-changed", (_event, data) => callback(data)),
  onProjectsChanged: (callback) =>
    ipcRenderer.on("projects-changed", (_event, data) => callback(data)),
  onAgentLog: (callback) =>
    ipcRenderer.on("agent-log", (_event, data) => callback(data)),
  onAgentExit: (callback) =>
    ipcRenderer.on("agent-exit", (_event, data) => callback(data)),
  getAgentLogs: (agentId) => ipcRenderer.invoke("agents:logs", agentId),
});
