export interface ICommandDeckAPI {
  getProjects: () => Promise<any[]>;
  createProject: (name: string) => Promise<{ ok: boolean }>;
  addProject: (name: string) => Promise<{ ok: boolean; reason?: string; path?: string }>;
  getAgents: () => Promise<any[]>;
  startAgent: (params: { projectName: string; hubUrl: string }) => Promise<{ ok: boolean; agent?: any; reason?: string; error?: string }>;
  stopAgent: (params: { agentId: string }) => Promise<{ ok: boolean; reason?: string }>;
  sendMessage: (params: { agentId: string; text: string }) => Promise<{ ok: boolean; reason?: string; error?: string }>;
  getAgentLogs: (agentId: string) => Promise<string[]>;
  onAgentsChanged: (callback: (agents: any[]) => void) => void;
  onProjectsChanged: (callback: (projects: any[]) => void) => void;
  onAgentLog: (callback: (data: { id: string; line: string }) => void) => void;
  onAgentExit: (callback: (data: { id: string; reason: string; error?: string }) => void) => void;
}

declare global {
  interface Window {
    commanddeck: ICommandDeckAPI;
  }
}
