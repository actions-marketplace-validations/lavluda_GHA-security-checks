import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { SecurityCheckConfig } from "./config.js";
import type { ScanResult } from "./finding.js";
import { writeJsonReport } from "../reporters/json.js";
import { writeMarkdownReport } from "../reporters/markdown.js";
import { writeSarifReport } from "../reporters/sarif.js";

export interface WrittenReports {
  json?: string;
  markdown?: string;
  sarif?: string;
}

export function writeConfiguredReports(
  result: ScanResult,
  config: SecurityCheckConfig,
  cwd: string
): WrittenReports {
  const written: WrittenReports = {};

  if (config.outputs.json) {
    const path = outputPath(cwd, config.outputs.json, "security-results.json");
    ensureParent(path);
    writeJsonReport(result, path);
    written.json = path;
  }

  if (config.outputs.markdown) {
    const path = outputPath(cwd, config.outputs.markdown, "security-summary.md");
    ensureParent(path);
    writeMarkdownReport(result, path);
    written.markdown = path;
  }

  if (config.outputs.sarif) {
    const path = outputPath(cwd, config.outputs.sarif, "security-results.sarif");
    ensureParent(path);
    writeSarifReport(result, path);
    written.sarif = path;
  }

  return written;
}

function outputPath(cwd: string, value: boolean | string, fallback: string): string {
  return resolve(cwd, typeof value === "string" ? value : fallback);
}

function ensureParent(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
}
