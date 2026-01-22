export interface ICommandDeckAPI {
  getProjects: () => Promise<any[]>;
  createProject: (name: string) => Promise<{ ok: boolean }>;
  addProject: (name: string) => Promise<{ ok: boolean; reason?: string; path?: string }>;
  updateProject: (payload: { name: string; updates: { name?: string; domain?: string | null } }) => Promise<{ ok: boolean; reason?: string; project?: any; renamedFrom?: string }>;
  dissolveProject: (projectName: string) => Promise<{ ok: boolean; stoppedAgents: number }>;
  getAgents: () => Promise<any[]>;
  startAgent: (params: { projectName: string; hubUrl: string; deskIndex: number }) => Promise<{ ok: boolean; agent?: any; reason?: string; error?: string }>;
  stopAgent: (params: { agentId: string }) => Promise<{ ok: boolean; reason?: string }>;
  sendMessage: (params: { agentId: string; text: string }) => Promise<{ ok: boolean; reason?: string; error?: string }>;
  getAgentLogs: (agentId: string) => Promise<string[]>;
  onAgentsChanged: (callback: (agents: any[]) => void) => void;
  onProjectsChanged: (callback: (projects: any[]) => void) => void;
  onAgentLog: (callback: (data: { id: string; line: string }) => void) => void;
  onAgentExit: (callback: (data: { id: string; reason: string; error?: string }) => void) => void;
  // Git integration
  getGitChanges: (projectName: string) => Promise<{ ok: boolean; changes?: any[]; reason?: string }>;
  getGitDiff: (projectName: string, filePath: string, status?: string) => Promise<{ ok: boolean; filePath?: string; diff?: string; oldContent?: string; newContent?: string; reason?: string }>;
  approveGitChange: (projectName: string, filePath: string) => Promise<{ ok: boolean; reason?: string }>;
  rejectGitChange: (projectName: string, filePath: string) => Promise<{ ok: boolean; reason?: string }>;
}

declare global {
  interface Window {
    commanddeck: ICommandDeckAPI;
  }
}
