export interface Project {
  name: string;
  path?: string;
  domain?: string | null;
  icon?: ProjectIcon | null;
  slotId?: number;
}

export type ProjectIcon =
  | { type: 'emoji'; value: string }
  | { type: 'image'; value: string };

export interface Agent {
  id: string;
  name: string;
  project: string;
  pid: number;
  startedAt: string;
  status: string;
  deskIndex: number;
}

export interface GitChange {
  file: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
  timestamp: number;
}

export type DeployStatusState = 'success' | 'failure' | 'error' | 'pending' | 'unknown';

export type DeployStatus = {
  state: DeployStatusState;
  description?: string;
  targetUrl?: string;
  updatedAt?: string;
  sha?: string;
  commitDate?: string;
  source?: 'status' | 'check';
};

export interface CommandDeckAPI {
  getProjects: () => Promise<Project[]>;
  createProject: (payload: { name: string; slotId?: number }) => Promise<{ ok: boolean; project?: Project; gitInit?: boolean; repoCreated?: boolean; warnings?: string[] }>;
  addProject: (payload: { name: string; slotId?: number }) => Promise<{ ok: boolean; reason?: string; path?: string }>;
  updateProject: (payload: {
    name: string;
    updates: { name?: string; domain?: string | null; icon?: ProjectIcon | null };
  }) => Promise<{ ok: boolean; reason?: string; project?: Project; renamedFrom?: string }>;
  dissolveProject: (projectName: string) => Promise<{ ok: boolean; stoppedAgents: number }>;
  openExternal: (url: string) => Promise<{ ok: boolean; reason?: string }>;
  removeProject: (name: string) => Promise<{ ok: boolean }>;
  getAgents: () => Promise<Agent[]>;
  startAgent: (params: { projectName: string; hubUrl: string; deskIndex: number }) => Promise<{ ok: boolean; agent?: any; reason?: string; error?: string }>;
  stopAgent: (params: { agentId: string }) => Promise<{ ok: boolean; reason?: string; error?: string }>;
  sendMessage: (params: { agentId: string; text: string }) => Promise<{ ok: boolean; reason?: string; error?: string }>;
  getAgentLogs: (agentId: string) => Promise<string[]>;
  onAgentsChanged: (callback: (agents: Agent[]) => void) => () => void;
  offAgentsChanged: (callback: (agents: Agent[]) => void) => void;
  onProjectsChanged: (callback: (projects: Project[]) => void) => () => void;
  offProjectsChanged: (callback: (projects: Project[]) => void) => void;
  onAgentLog: (callback: (data: { id: string; line: string }) => void) => () => void;
  offAgentLog: (callback: (data: { id: string; line: string }) => void) => void;
  onAgentExit: (callback: (data: { id: string; reason: string; error?: string }) => void) => () => void;
  offAgentExit: (callback: (data: { id: string; reason: string; error?: string }) => void) => void;
  getGitChanges: (projectName: string) => Promise<{ ok: boolean; changes?: GitChange[]; reason?: string }>;
  getGitDiff: (projectName: string, filePath: string, status?: string) => Promise<{ ok: boolean; filePath?: string; diff?: string; oldContent?: string; newContent?: string; reason?: string }>;
  approveGitChange: (projectName: string, filePath: string) => Promise<{ ok: boolean; reason?: string }>;
  rejectGitChange: (projectName: string, filePath: string) => Promise<{ ok: boolean; reason?: string }>;
  getLastCommitTime: (projectName: string) => Promise<{ ok: boolean; timestamp?: number; reason?: string }>;
  getDeployStatus: (projectName: string) => Promise<{ ok: boolean; status?: DeployStatus; reason?: string }>;
}
