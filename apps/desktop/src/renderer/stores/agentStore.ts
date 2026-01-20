import { create } from 'zustand';

export interface Agent {
  id: string;
  name: string;
  project: string;
  pid: number;
  startedAt: string;
  status: 'idle' | 'working' | 'error';
}

interface AgentStore {
  agents: Agent[];
  logs: Record<string, string[]>;
  setAgents: (agents: Agent[]) => void;
  addLog: (agentId: string, line: string) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  logs: {},
  setAgents: (agents) => set({ agents }),
  addLog: (agentId, line) => set((state) => ({
    logs: {
      ...state.logs,
      [agentId]: [...(state.logs[agentId] || []), line].slice(-500)
    }
  })),
}));
