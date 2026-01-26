import { create } from 'zustand';

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

interface ProjectStore {
  projects: Project[];
  selectedProject: string | null;
  setProjects: (projects: Project[]) => void;
  selectProject: (name: string | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  selectedProject: localStorage.getItem('commanddeck.project'),
  setProjects: (projects) => set({ projects }),
  selectProject: (name) => {
    if (name) {
      localStorage.setItem('commanddeck.project', name);
    } else {
      localStorage.removeItem('commanddeck.project');
    }
    set({ selectedProject: name });
  },
}));
