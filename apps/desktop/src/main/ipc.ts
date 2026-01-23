import type { IpcMain } from "electron";

interface IpcHandlers {
  listProjects: () => any;
  addProject: (payload: any) => any;
  createProject: (payload: any) => any;
  removeProject: (name: string) => any;
  updateProject: (payload: any) => any;
  dissolveProject: (projectName: string) => any;
  broadcastProjects: () => void;
  listAgents: () => any;
  startAgent: (payload: any) => any;
  stopAgent: (payload: any) => any;
  sendMessage: (payload: any) => any;
  getAgentLogs: (agentId: string) => any;
  getGitChanges: (projectName: string) => any;
  getGitDiff: (payload: any) => any;
  approveGitChange: (payload: any) => any;
  rejectGitChange: (payload: any) => any;
}

export function registerIpc(ipcMain: IpcMain, handlers: IpcHandlers): void {
  ipcMain.handle("projects:list", () => handlers.listProjects());
  ipcMain.handle("projects:add", (_event, payload) => handlers.addProject(payload));
  ipcMain.handle("projects:create", (_event, payload) => handlers.createProject(payload));
  ipcMain.handle("projects:remove", (_event, name) => handlers.removeProject(name));
  ipcMain.handle("projects:update", (_event, payload) => handlers.updateProject(payload));
  ipcMain.handle("projects:dissolve", (_event, projectName) => handlers.dissolveProject(projectName));
  ipcMain.on("projects:changed", () => handlers.broadcastProjects());

  ipcMain.handle("agents:list", () => handlers.listAgents());
  ipcMain.handle("agents:start", (_event, payload) => handlers.startAgent(payload));
  ipcMain.handle("agents:stop", (_event, payload) => handlers.stopAgent(payload));
  ipcMain.handle("agents:message", (_event, payload) => handlers.sendMessage(payload));
  ipcMain.handle("agents:logs", (_event, agentId) => handlers.getAgentLogs(agentId));

  ipcMain.handle("git:getChanges", (_event, projectName) => handlers.getGitChanges(projectName));
  ipcMain.handle("git:getDiff", (_event, payload) => handlers.getGitDiff(payload));
  ipcMain.handle("git:approveChange", (_event, payload) => handlers.approveGitChange(payload));
  ipcMain.handle("git:rejectChange", (_event, payload) => handlers.rejectGitChange(payload));
}
