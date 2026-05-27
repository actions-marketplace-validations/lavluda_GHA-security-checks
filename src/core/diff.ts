import { execSync } from "node:child_process";
import { env } from "node:process";

/**
 * Resolves the set of files changed vs the PR base (or origin/main).
 * Returns undefined if git is unavailable — callers should fall back to a full scan.
 */
export function getChangedFiles(cwd: string): Set<string> | undefined {
  try {
    let base: string;

    const baseRef = env.GITHUB_BASE_REF;
    if (baseRef) {
      // Inside a GitHub Actions pull_request event
      base = `origin/${baseRef}`;
    } else {
      // Local dev — find the common ancestor with origin/main
      base = execSync("git merge-base HEAD origin/main", {
        cwd,
        stdio: ["ignore", "pipe", "ignore"]
      })
        .toString()
        .trim();
    }

    const output = execSync(`git diff --name-only "${base}"...HEAD`, {
      cwd,
      stdio: ["ignore", "pipe", "ignore"]
    })
      .toString()
      .trim();

    if (!output) return new Set();

    return new Set(
      output
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
    );
  } catch {
    // git not available or repo not initialised — fall back to full scan
    return undefined;
  }
}
