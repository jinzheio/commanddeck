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

  // Initial fetch and subscription
  useEffect(() => {
    fetchProjects();
    
    if (window.commanddeck.onProjectsChanged) {
        window.commanddeck.onProjectsChanged((newProjects) => {
            setProjects(newProjects);
        });
    }
  }, []);

  return { 
      projects, 
      selectedProject, 
      selectProject, 
      fetchProjects, 
      addProject,
      createProject,
      loading, 
      error 
  };
}
