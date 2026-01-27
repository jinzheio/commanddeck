import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { resolveProjectPath } from "./projects.js";
import { isGitRepo } from "./git-utils.js";

export type DeployStatusState = "success" | "failure" | "error" | "pending" | "unknown";

export type DeployStatus = {
  state: DeployStatusState;
  description?: string;
  targetUrl?: string;
  updatedAt?: string;
  sha?: string;
  commitDate?: string;
  source?: "status" | "check";
};

type CacheEntry = {
  timestamp: number;
  value: { ok: boolean; status?: DeployStatus; reason?: string };
};

const CACHE_TTL_MS = 60_000;
const deployStatusCache = new Map<string, CacheEntry>();
let envLoaded = false;

function loadUserEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  const envPath = path.join(os.homedir(), ".commanddeck", ".env");
  if (!fs.existsSync(envPath)) return;
  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (!key) continue;
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    console.warn("[GitHub] Failed to load ~/.commanddeck/.env:", error);
  }
}

function parseGitHubRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const trimmed = remoteUrl.trim();
  let pathPart = "";
  if (trimmed.startsWith("git@github.com:")) {
    pathPart = trimmed.slice("git@github.com:".length);
  } else if (trimmed.startsWith("https://github.com/")) {
    pathPart = trimmed.slice("https://github.com/".length);
  } else if (trimmed.startsWith("http://github.com/")) {
    pathPart = trimmed.slice("http://github.com/".length);
  } else if (trimmed.startsWith("ssh://git@github.com/")) {
    pathPart = trimmed.slice("ssh://git@github.com/".length);
  } else {
    return null;
  }
  pathPart = pathPart.replace(/\.git$/i, "");
  const [owner, repo] = pathPart.split("/").filter(Boolean);
  if (!owner || !repo) return null;
  return { owner, repo };
}

function getLatestCommitInfo(projectPath: string): { sha: string; commitDate: string } | null {
  try {
    const sha = execSync("git rev-parse HEAD", {
      cwd: projectPath,
      encoding: "utf-8",
    }).trim();
    if (!sha) return null;
    const commitDate = execSync("git log -1 --format=%cI", {
      cwd: projectPath,
      encoding: "utf-8",
    }).trim();
    return { sha, commitDate };
  } catch {
    return null;
  }
}

function getRemoteOrigin(projectPath: string): string | null {
  try {
    return execSync("git remote get-url origin", {
      cwd: projectPath,
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
}

async function fetchJson(url: string, token?: string): Promise<any> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub ${response.status}: ${text}`);
  }
  return response.json();
}

function pickLatestStatus(statuses: any[]): any | null {
  if (!Array.isArray(statuses) || statuses.length === 0) return null;
  return statuses
    .slice()
    .sort((a, b) => {
      const aTime = Date.parse(a?.updated_at || a?.created_at || "") || 0;
      const bTime = Date.parse(b?.updated_at || b?.created_at || "") || 0;
      return bTime - aTime;
    })[0];
}

function mapCheckRunState(run: any): DeployStatusState {
  const status = String(run?.status || "");
  const conclusion = String(run?.conclusion || "");
  if (status && status !== "completed") return "pending";
  if (conclusion === "success") return "success";
  if (["failure", "timed_out", "cancelled", "action_required"].includes(conclusion)) return "failure";
  if (conclusion === "neutral" || conclusion === "skipped") return "unknown";
  return "unknown";
}

export async function getGithubDeployStatus(
  projectName: string,
  options?: { force?: boolean }
): Promise<{ ok: boolean; status?: DeployStatus; reason?: string }> {
  if (!projectName) return { ok: false, reason: "missing_project" };

  const cached = deployStatusCache.get(projectName);
  const force = Boolean(options?.force);
  if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  const projectPath = resolveProjectPath(projectName);
  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "project_not_found" };
  }
  if (!isGitRepo(projectPath)) {
    return { ok: false, reason: "not_git_repo" };
  }

  loadUserEnv();
  const token = process.env.GITHUB_TOKEN || "";

  const remote = getRemoteOrigin(projectPath);
  if (!remote) {
    return { ok: false, reason: "missing_remote" };
  }
  const repoInfo = parseGitHubRepo(remote);
  if (!repoInfo) {
    return { ok: false, reason: "unsupported_remote" };
  }

  const localCommit = getLatestCommitInfo(projectPath);
  if (!localCommit?.sha) {
    return { ok: false, reason: "no_commits" };
  }
  const apiBase = "https://api.github.com";
  try {
    const sha = localCommit.sha;
    const commitDate = localCommit.commitDate;

    const statusPayload = await fetchJson(
      `${apiBase}/repos/${repoInfo.owner}/${repoInfo.repo}/commits/${sha}/status`,
      token
    );
    const vercelStatuses = (statusPayload?.statuses || []).filter((item: any) =>
      /vercel/i.test(String(item?.context || ""))
    );
    const latestStatus = pickLatestStatus(vercelStatuses);
    if (latestStatus) {
      const result = {
        ok: true,
        status: {
          state: (latestStatus.state as DeployStatusState) || "unknown",
          description: latestStatus.description || "",
          targetUrl: latestStatus.target_url || "",
          updatedAt: latestStatus.updated_at || latestStatus.created_at || "",
          sha,
          commitDate,
          source: "status" as const,
        },
      };
      deployStatusCache.set(projectName, { timestamp: Date.now(), value: result });
      return result;
    }

    const checkPayload = await fetchJson(
      `${apiBase}/repos/${repoInfo.owner}/${repoInfo.repo}/commits/${sha}/check-runs`,
      token
    );
    const vercelChecks = (checkPayload?.check_runs || []).filter((run: any) => {
      const slug = String(run?.app?.slug || "");
      const name = String(run?.name || "");
      return slug === "vercel" || /vercel/i.test(name);
    });
    const latestCheck = pickLatestStatus(vercelChecks);
    if (latestCheck) {
      const result = {
        ok: true,
        status: {
          state: mapCheckRunState(latestCheck),
          description: latestCheck?.output?.title || latestCheck?.output?.summary || "",
          targetUrl: latestCheck?.details_url || latestCheck?.html_url || "",
          updatedAt: latestCheck?.completed_at || latestCheck?.started_at || "",
          sha,
          commitDate,
          source: "check" as const,
        },
      };
      deployStatusCache.set(projectName, { timestamp: Date.now(), value: result });
      return result;
    }

    const result = {
      ok: true,
      status: {
        state: "unknown" as const,
        description: "No Vercel status found",
        sha,
        commitDate,
        source: "status" as const,
      },
    };
    deployStatusCache.set(projectName, { timestamp: Date.now(), value: result });
    return result;
  } catch (error: any) {
    const result = { ok: false, reason: error?.message || "github_error" };
    deployStatusCache.set(projectName, { timestamp: Date.now(), value: result });
    return result;
  }
}
