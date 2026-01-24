import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { PROJECTS_DIR, loadConfig, saveConfig } from "./config.js";
import { isGitRepo } from "./git-utils.js";

export interface ProjectRecord {
  name: string;
  path?: string;
  domain?: string | null;
  icon?: { type: "emoji"; value: string } | { type: "image"; value: string } | null;
  slotId?: number;
}

function normalizeIcon(
  icon: ProjectRecord["icon"] | string | null | undefined
): ProjectRecord["icon"] | null {
  if (!icon) return null;
  if (typeof icon === "string") {
    return { type: "emoji", value: icon };
  }
  if (icon.type === "emoji" || icon.type === "image") {
    return { type: icon.type, value: String(icon.value || "") };
  }
  return null;
}

export function folderNameFromProject(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (!trimmed.includes(".")) return trimmed;
  const parts = trimmed.split(".").filter(Boolean);
  if (parts.length <= 1) return trimmed;
  parts.pop();
  const joined = parts.join("");
  return joined || trimmed;
}

export function resolveProjectPath(projectName: string): string {
  const config = loadConfig();
  const entry = config.projects.find((project) => project.name === projectName);
  if (entry?.path) {
    return entry.path;
  }
  const folderName = folderNameFromProject(projectName);
  return path.join(PROJECTS_DIR, folderName);
}

export function getNextAvailableSlotId(config: { projects: ProjectRecord[] }): number {
  const used = new Set(
    config.projects
      .map((project) => project.slotId)
      .filter((slotId) => Number.isInteger(slotId))
  );
  let slotId = 0;
  while (used.has(slotId)) {
    slotId += 1;
  }
  return slotId;
}

export function listProjects(): ProjectRecord[] {
  const config = loadConfig();
  let changed = false;
  const used = new Set<number>();

  config.projects.forEach((project, index) => {
    let slotId = Number.isInteger(project.slotId) ? project.slotId : index;
    while (used.has(slotId)) {
      slotId += 1;
    }
    if (project.slotId !== slotId) {
      project.slotId = slotId;
      changed = true;
    }
    const nextIcon = normalizeIcon(project.icon ?? null);
    if (nextIcon !== project.icon) {
      project.icon = nextIcon;
      changed = true;
    }
    used.add(slotId);
  });

  if (changed) {
    saveConfig(config);
  }

  return config.projects;
}

export function addProject(payload: { name: string; slotId?: number } | string) {
  const input = typeof payload === "string" ? { name: payload } : (payload || {});
  const trimmed = String(input.name || "").trim();
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }
  const config = loadConfig();
  const slotId = Number.isInteger(input.slotId) ? input.slotId : getNextAvailableSlotId(config);
  const existing = config.projects.find((project) => project.name === trimmed);
  if (existing) {
    return { ok: true, project: existing };
  }
  const projectPath = resolveProjectPath(trimmed);
  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "missing", path: projectPath };
  }
  if (!isGitRepo(projectPath)) {
    try {
      execSync("git init", { cwd: projectPath, encoding: "utf-8" });
    } catch (err: any) {
      console.error("[Git] Failed to init repo:", err.message);
    }
  }
  const project = { name: trimmed, path: projectPath, domain: null, icon: null, slotId };
  config.projects.push(project);
  saveConfig(config);
  return { ok: true, project };
}

export function createProject(payload: { name: string; slotId?: number } | string) {
  const input = typeof payload === "string" ? { name: payload } : (payload || {});
  const trimmed = String(input.name || "").trim();
  const config = loadConfig();
  const slotId = Number.isInteger(input.slotId) ? input.slotId : getNextAvailableSlotId(config);
  const projectPath = resolveProjectPath(trimmed);
  const existed = fs.existsSync(projectPath);
  if (!existed) {
    fs.mkdirSync(projectPath, { recursive: true });
  }
  const existing = config.projects.find((project) => project.name === trimmed);
  if (!existing) {
    config.projects.push({ name: trimmed, path: projectPath, icon: null, slotId });
    saveConfig(config);
  }
  const result = {
    ok: true,
    project: { name: trimmed, path: projectPath, domain: null, icon: null, slotId },
    gitInit: false,
    repoCreated: false,
    warnings: [] as string[],
  };

  if (!isGitRepo(projectPath)) {
    try {
      execSync("git init", { cwd: projectPath, encoding: "utf-8" });
      result.gitInit = true;
    } catch (err: any) {
      console.error("[Git] Failed to init repo:", err.message);
      result.warnings.push(`git_init_failed: ${err.message}`);
    }
  }

  if (!existed) {
    try {
      execSync(`gh repo create "${trimmed}" --source . --remote origin --private --confirm`, {
        cwd: projectPath,
        encoding: "utf-8",
      });
      result.repoCreated = true;
    } catch (err: any) {
      console.error("[GitHub] Failed to create repo:", err.message);
      result.warnings.push(`repo_create_failed: ${err.message}`);
    }
  }

  return result;
}

export function removeProject(name: string) {
  const config = loadConfig();
  const next = config.projects.filter((project) => project.name !== name);
  config.projects = next;
  saveConfig(config);
  return { ok: true };
}

export function updateProject(
  name: string,
  updates: {
    name?: string;
    domain?: string | null;
    icon?: { type: "emoji"; value: string } | { type: "image"; value: string } | null;
  } = {},
  agents?: Map<string, any>
) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }
  const config = loadConfig();
  const index = config.projects.findIndex((project) => project.name === trimmed);
  if (index === -1) {
    return { ok: false, reason: "not_found" };
  }

  const nextNameRaw = updates.name !== undefined ? String(updates.name).trim() : trimmed;
  if (!nextNameRaw) {
    return { ok: false, reason: "empty" };
  }
  if (nextNameRaw !== trimmed) {
    const nameExists = config.projects.some((project) => project.name === nextNameRaw);
    if (nameExists) {
      return { ok: false, reason: "duplicate" };
    }
  }

  const rawDomain = updates.domain !== undefined ? updates.domain : config.projects[index].domain;
  const nextDomain =
    rawDomain === null || rawDomain === undefined ? null : String(rawDomain).trim() || null;
  const nextIcon = normalizeIcon(
    updates.icon !== undefined ? updates.icon : (config.projects[index].icon ?? null)
  );

  config.projects[index] = {
    ...config.projects[index],
    name: nextNameRaw,
    domain: nextDomain,
    icon: nextIcon ?? null,
  };
  saveConfig(config);

  if (nextNameRaw !== trimmed && agents) {
    agents.forEach((agent) => {
      if (agent.project === trimmed) {
        agent.project = nextNameRaw;
      }
    });
  }

  return { ok: true, project: config.projects[index], renamedFrom: trimmed };
}
