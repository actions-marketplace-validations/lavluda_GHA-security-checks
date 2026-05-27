import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Finding } from "./finding.js";

export interface BaselineEntry {
  id: string;
  title: string;
  suppressedAt: string;
}

/**
 * Loads the baseline file and returns a Set of suppressed finding IDs.
 * Returns an empty Set if the file doesn't exist or can't be parsed.
 */
export function loadBaseline(cwd: string, baselinePath: string): Set<string> {
  const full = resolve(cwd, baselinePath);
  if (!existsSync(full)) return new Set();

  try {
    const parsed = JSON.parse(readFileSync(full, "utf8")) as BaselineEntry[];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((entry) => entry.id));
  } catch {
    return new Set();
  }
}

/**
 * Writes all open findings to the baseline file.
 * On subsequent runs, these findings will be suppressed.
 */
export function saveBaseline(cwd: string, baselinePath: string, findings: Finding[]): void {
  const full = resolve(cwd, baselinePath);
  const now = new Date().toISOString();

  const entries: BaselineEntry[] = findings
    .filter((f) => f.status === "open")
    .map((f) => ({
      id: f.id,
      title: f.title,
      suppressedAt: now
    }));

  writeFileSync(full, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

/**
 * Marks findings whose ID is present in the baseline as suppressed.
 */
export function applyBaseline(findings: Finding[], baselineIds: Set<string>): Finding[] {
  return findings.map((f) =>
    baselineIds.has(f.id)
      ? {
          ...f,
          status: "suppressed" as const,
          metadata: { ...f.metadata, baselined: true }
        }
      : f
  );
}
