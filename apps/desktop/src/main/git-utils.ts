import { execSync } from "child_process";

export function isGitRepo(projectPath: string): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", {
      cwd: projectPath,
      encoding: "utf-8",
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}
