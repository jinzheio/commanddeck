import { useEffect, useCallback, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';

export function useProjects() {
  const { projects, setProjects, selectProject, selectedProject } = useProjectStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await window.commanddeck.getProjects();
      setProjects(data);
      
      // Auto-select first project if none selected
      if (!selectedProject && data.length > 0) {
        selectProject(data[0].name);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch projects');
    }
  }, [setProjects, selectedProject, selectProject]);

  const addProject = async (name: string) => {
    try {
      const res = await window.commanddeck.addProject(name);
      if (res.ok) {
        await fetchProjects();
        if (!selectedProject) selectProject(name);
      }
      return res;
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  };

  const createProject = async (name: string) => {
      const res = await window.commanddeck.createProject(name);
      if (res.ok) {
          await fetchProjects();
          selectProject(name);
      }
      return res;
  };

  const dissolveProject = async (projectName: string) => {
    try {
      const res = await window.commanddeck.dissolveProject(projectName);
      if (res.ok) {
        // Clear selection if dissolved project was selected
        if (selectedProject === projectName) {
          selectProject(null);
        }
        await fetchProjects();
        console.log(`[Dissolve] Project ${projectName} dissolved. Stopped ${res.stoppedAgents} agents.`);
      }
      return res;
    } catch (err) {
      return { ok: false, stoppedAgents: 0, error: String(err) };
    }
  };

  const updateProject = async (name: string, updates: { name?: string; domain?: string | null }) => {
    try {
      const res = await window.commanddeck.updateProject({ name, updates });
      if (res.ok) {
        await fetchProjects();
      }
      return res;
    } catch (err) {
      return { ok: false, reason: String(err) };
    }
  };

  // Initial fetch and subscription
  useEffect(() => {
    fetchProjects();
    
    let offProjectsChanged;
    if (window.commanddeck.onProjectsChanged) {
      offProjectsChanged = window.commanddeck.onProjectsChanged((newProjects) => {
        setProjects(newProjects);
      });
    }

    return () => {
      offProjectsChanged?.();
    };
  }, []);

  return { 
      projects, 
      selectedProject, 
      selectProject, 
      fetchProjects, 
      addProject,
      createProject,
      dissolveProject,
      updateProject,
      loading, 
      error 
  };
}
