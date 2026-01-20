import { useEffect, useCallback } from 'react';
import { useAgentStore } from '../stores/agentStore';

export function useAgents() {
  const { agents, setAgents, logs, addLog } = useAgentStore();

  const fetchAgents = useCallback(async () => {
    try {
      const data = await window.commanddeck.getAgents();
      setAgents(data);
    } catch (err) {
      console.error("Failed to fetch agents", err);
    }
  }, [setAgents]);

  useEffect(() => {
    fetchAgents();

    // Subscribe to agent list changes
    window.commanddeck.onAgentsChanged((nextAgents) => {
        setAgents(nextAgents);
    });

    // Subscribe to logs
    window.commanddeck.onAgentLog(({ id, line }) => {
        addLog(id, line);
    });
    
    return () => {
        // Cleanup would go here if API supported it
    };
  }, [fetchAgents, setAgents, addLog]);

  const startAgent = async (hubUrl: string, projectName: string, deskIndex: number) => {
      if (!projectName) return { ok: false, reason: 'No project specified' };
      return window.commanddeck.startAgent({ projectName, hubUrl, deskIndex });
  };
  
  const stopAgent = async (payload: { agentId: string }) => {
      return window.commanddeck.stopAgent(payload);
  };

  const sendMessage = async (agentId: string, text: string) => {
      return window.commanddeck.sendMessage({ agentId, text });
  };

  // const projectAgents = agents.filter(a => a.project === selectedProject);

  return {
    agents: agents, // Return all agents now
    allAgents: agents,
    logs,
    startAgent,
    stopAgent,
    sendMessage,
    fetchAgents
  };
}

