import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => void;

const agentsChangedHandlers = new WeakMap<AnyFunction, AnyFunction>();
const projectsChangedHandlers = new WeakMap<AnyFunction, AnyFunction>();
const agentLogHandlers = new WeakMap<AnyFunction, AnyFunction>();
const agentExitHandlers = new WeakMap<AnyFunction, AnyFunction>();

contextBridge.exposeInMainWorld("commanddeck", {
  getProjects: () => ipcRenderer.invoke("projects:list"),
  addProject: (payload: unknown) => ipcRenderer.invoke("projects:add", payload),
  createProject: (payload: unknown) => ipcRenderer.invoke("projects:create", payload),
  removeProject: (name: string) => ipcRenderer.invoke("projects:remove", name),
  updateProject: (payload: unknown) => ipcRenderer.invoke("projects:update", payload),
  dissolveProject: (projectName: string) => ipcRenderer.invoke("projects:dissolve", projectName),
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  getAgents: () => ipcRenderer.invoke("agents:list"),
  startAgent: (payload: unknown) => ipcRenderer.invoke("agents:start", payload),
  stopAgent: (payload: unknown) => ipcRenderer.invoke("agents:stop", payload),
  sendMessage: (payload: unknown) => ipcRenderer.invoke("agents:message", payload),
  onAgentsChanged: (callback: (agents: unknown[]) => void) => {
    const handler = (_event: IpcRendererEvent, data: unknown[]) => callback(data);
    agentsChangedHandlers.set(callback, handler);
    ipcRenderer.on("agents-changed", handler);
    return () => ipcRenderer.removeListener("agents-changed", handler);
  },
  offAgentsChanged: (callback: (agents: unknown[]) => void) => {
    const handler = agentsChangedHandlers.get(callback);
    if (handler) {
      ipcRenderer.removeListener("agents-changed", handler);
      agentsChangedHandlers.delete(callback);
    }
  },
  onProjectsChanged: (callback: (projects: unknown[]) => void) => {
    const handler = (_event: IpcRendererEvent, data: unknown[]) => callback(data);
    projectsChangedHandlers.set(callback, handler);
    ipcRenderer.on("projects-changed", handler);
    return () => ipcRenderer.removeListener("projects-changed", handler);
  },
  offProjectsChanged: (callback: (projects: unknown[]) => void) => {
    const handler = projectsChangedHandlers.get(callback);
    if (handler) {
      ipcRenderer.removeListener("projects-changed", handler);
      projectsChangedHandlers.delete(callback);
    }
  },
  onAgentLog: (callback: (data: { id: string; line: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { id: string; line: string }) => callback(data);
    agentLogHandlers.set(callback, handler);
    ipcRenderer.on("agent-log", handler);
    return () => ipcRenderer.removeListener("agent-log", handler);
  },
  offAgentLog: (callback: (data: { id: string; line: string }) => void) => {
    const handler = agentLogHandlers.get(callback);
    if (handler) {
      ipcRenderer.removeListener("agent-log", handler);
      agentLogHandlers.delete(callback);
    }
  },
  onAgentExit: (callback: (data: { id: string; reason: string; error?: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { id: string; reason: string; error?: string }) => callback(data);
    agentExitHandlers.set(callback, handler);
    ipcRenderer.on("agent-exit", handler);
    return () => ipcRenderer.removeListener("agent-exit", handler);
  },
  offAgentExit: (callback: (data: { id: string; reason: string; error?: string }) => void) => {
    const handler = agentExitHandlers.get(callback);
    if (handler) {
      ipcRenderer.removeListener("agent-exit", handler);
      agentExitHandlers.delete(callback);
    }
  },
  getAgentLogs: (agentId: string) => ipcRenderer.invoke("agents:logs", agentId),
  // Git integration
  getGitChanges: (projectName: string) => ipcRenderer.invoke("git:getChanges", projectName),
  getGitDiff: (projectName: string, filePath: string, status: string) => ipcRenderer.invoke("git:getDiff", { projectName, filePath, status }),
  approveGitChange: (projectName: string, filePath: string) => ipcRenderer.invoke("git:approveChange", { projectName, filePath }),
  rejectGitChange: (projectName: string, filePath: string) => ipcRenderer.invoke("git:rejectChange", { projectName, filePath }),
  getLastCommitTime: (projectName: string) => ipcRenderer.invoke("git:getLastCommitTime", projectName),
});
