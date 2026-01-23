import path from "path";
import fs from "fs";
import { execSync, execFileSync } from "child_process";
import { resolveProjectPath } from "./projects.js";
import { isGitRepo } from "./git-utils.js";

export function getGitChanges(projectName: string) {
  const projectPath = resolveProjectPath(projectName);

  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "project_not_found" };
  }
  if (!isGitRepo(projectPath)) {
    return { ok: false, reason: "not_git_repo" };
  }

  try {
    const statusOutput = execSync("git status --porcelain", {
      cwd: projectPath,
      encoding: "utf-8",
    });

    const changes = [];
    const lines = statusOutput.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      const status = line.substring(0, 2);
      const filePath = line.substring(3);
      const isUntracked = status === "??";
      const hasUnstaged = !isUntracked && status[1] !== " ";
      const isStagedOnly = !isUntracked && status[0] !== " " && status[1] === " ";

      if (isStagedOnly) {
        continue;
      }

      if (hasUnstaged || isUntracked || status.includes("M") || status.includes("A") || status.includes("D")) {
        let fileStatus = "modified";
        if (isUntracked) {
          fileStatus = "added";
        } else if (status.includes("A")) {
          fileStatus = "added";
        } else if (status.includes("D")) {
          fileStatus = "deleted";
        }

        let additions = 0;
        let deletions = 0;

        if (status !== "??") {
          try {
            const diffStats = execSync(`git diff --numstat HEAD -- "${filePath}"`, {
              cwd: projectPath,
              encoding: "utf-8",
            }).trim();

            const [add = "0", del = "0"] = diffStats.split("\t");
            additions = parseInt(add, 10) || 0;
            deletions = parseInt(del, 10) || 0;
          } catch {
            // Keep 0 stats on failure.
          }
        } else {
          try {
            const fullPath = path.join(projectPath, filePath);
            const content = fs.readFileSync(fullPath, "utf-8");
            additions = content.split("\n").length;
          } catch {
            additions = 0;
          }
        }

        changes.push({
          file: filePath,
          status: fileStatus,
          additions,
          deletions,
          timestamp: Date.now(),
        });
      }
    }

    return { ok: true, changes };
  } catch (err: any) {
    console.error("[Git] Failed to get changes:", err.message);
    return { ok: false, reason: err.message };
  }
}

export function getGitDiff(projectName: string, filePath: string, status?: string) {
  const projectPath = resolveProjectPath(projectName);

  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "project_not_found" };
  }
  if (!isGitRepo(projectPath)) {
    return { ok: false, reason: "not_git_repo" };
  }

  const fullFilePath = path.join(projectPath, filePath);
  if (!fs.existsSync(fullFilePath)) {
    return { ok: false, reason: "file_not_found" };
  }

  try {
    let existsInHead = status !== "added";
    if (status === undefined) {
      existsInHead = true;
      try {
        execSync(`git cat-file -e HEAD:"${filePath}"`, {
          cwd: projectPath,
          encoding: "utf-8",
          stdio: "ignore",
        });
      } catch {
        existsInHead = false;
      }
    }

    let diff = "";
    if (!existsInHead) {
      try {
        diff = execFileSync("git", ["diff", "--no-index", "/dev/null", filePath], {
          cwd: projectPath,
          encoding: "utf-8",
        });
      } catch (err: any) {
        diff = err.stdout ? err.stdout.toString() : "";
      }
    } else {
      try {
        diff = execSync(`git diff HEAD -- "${filePath}"`, {
          cwd: projectPath,
          encoding: "utf-8",
        });
      } catch (err: any) {
        diff = err.stdout ? err.stdout.toString() : "";
      }
    }

    const oldContent = existsInHead
      ? execSync(`git show HEAD:"${filePath}"`, {
          cwd: projectPath,
          encoding: "utf-8",
        })
      : "";

    const newContent = fs.readFileSync(fullFilePath, "utf-8");

    return {
      ok: true,
      filePath,
      diff,
      oldContent,
      newContent,
    };
  } catch (err: any) {
    console.error("[Git] Failed to get diff:", err.message);
    return { ok: false, reason: err.message };
  }
}

export function approveGitChange(projectName: string, filePath: string) {
  const projectPath = resolveProjectPath(projectName);

  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "project_not_found" };
  }
  if (!isGitRepo(projectPath)) {
    return { ok: false, reason: "not_git_repo" };
  }

  try {
    execSync(`git add -A -- "${filePath}"`, {
      cwd: projectPath,
      encoding: "utf-8",
    });

    console.log(`[Git] Approved change: ${filePath}`);
    return { ok: true };
  } catch (err: any) {
    console.error("[Git] Failed to approve change:", err.message);
    return { ok: false, reason: err.message };
  }
}

export function rejectGitChange(projectName: string, filePath: string) {
  const projectPath = resolveProjectPath(projectName);

  if (!fs.existsSync(projectPath)) {
    return { ok: false, reason: "project_not_found" };
  }
  if (!isGitRepo(projectPath)) {
    return { ok: false, reason: "not_git_repo" };
  }

  try {
    const untrackedOutput = execSync(`git ls-files --others --exclude-standard -- "${filePath}"`, {
      cwd: projectPath,
      encoding: "utf-8",
    }).trim();
    const isUntracked = untrackedOutput.length > 0;
    const fullPath = path.join(projectPath, filePath);
    const isDirectory = fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory();

    if (isUntracked) {
      const cleanFlags = isDirectory ? "-f -d" : "-f";
      execSync(`git clean ${cleanFlags} -- "${filePath}"`, {
        cwd: projectPath,
        encoding: "utf-8",
      });
      console.log(`[Git] Rejected untracked change: ${filePath}`);
    } else {
      execSync(`git restore -- "${filePath}"`, {
        cwd: projectPath,
        encoding: "utf-8",
      });
      console.log(`[Git] Rejected change: ${filePath}`);
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[Git] Failed to reject change:", err.message);
    return { ok: false, reason: err.message };
  }
}
