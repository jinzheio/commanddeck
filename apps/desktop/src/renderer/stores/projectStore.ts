import { create } from 'zustand';

export interface Project {
  name: string;
  path?: string;
}

interface ProjectStore {
  projects: Project[];
  selectedProject: string | null;
  setProjects: (projects: Project[]) => void;
  selectProject: (name: string) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  selectedProject: localStorage.getItem('commanddeck.project'),
  setProjects: (projects) => set({ projects }),
  selectProject: (name) => {
    localStorage.setItem('commanddeck.project', name);
    set({ selectedProject: name });
  },
}));
