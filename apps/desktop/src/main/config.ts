import path from "path";
import fs from "fs";
import os from "os";

export const PROJECTS_DIR = path.join(os.homedir(), "Projects");
export const CONFIG_DIR = path.join(os.homedir(), ".commanddeck");
export const CONFIG_PATH = path.join(CONFIG_DIR, "projects.json");

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): { projects: any[] } {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    return { projects: [] };
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.projects)) {
      return { projects: [] };
    }
    return data;
  } catch {
    return { projects: [] };
  }
}

export function saveConfig(config: { projects: any[] }): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
