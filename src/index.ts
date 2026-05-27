import { resolve } from "node:path";
import {
  loadConfig,
  type SecurityCheckConfig,
  type SecurityCheckConfigOverrides
} from "./core/config.js";
import { createScanners } from "./core/create-scanners.js";
import { ScannerEngine } from "./core/scanner-engine.js";
import type { ScanResult } from "./core/finding.js";
import { writeConfiguredReports, type WrittenReports } from "./core/output.js";
import { getChangedFiles } from "./core/diff.js";
import { ChildProcessToolRunner, type ToolRunner } from "./integrations/tool-runner.js";

export interface RunSecurityCheckOptions {
  cwd?: string;
  configPath?: string;
  overrides?: SecurityCheckConfigOverrides;
  toolRunner?: ToolRunner;
  writeReports?: boolean;
}

export interface RunSecurityCheckResult {
  config: SecurityCheckConfig;
  result: ScanResult;
  reports: WrittenReports;
}

export async function runSecurityCheck(
  options: RunSecurityCheckOptions = {}
): Promise<RunSecurityCheckResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const config = loadConfig({
    cwd,
    configPath: options.configPath,
    overrides: {
      ...options.overrides,
      root: options.overrides?.root ?? cwd
    }
  });

  const engine = new ScannerEngine(createScanners(config));

  // In diff mode, resolve changed files so scanners can limit their scope
  const changedFiles = config.mode === "diff" ? getChangedFiles(cwd) : undefined;

  const result = await engine.run({
    cwd,
    config,
    toolRunner: options.toolRunner ?? new ChildProcessToolRunner(),
    changedFiles
  });

  const reports = options.writeReports === false ? {} : writeConfiguredReports(result, config, cwd);

  return { config, result, reports };
}

export * from "./core/baseline.js";
export * from "./core/config.js";
export * from "./core/diff.js";
export * from "./core/finding.js";
export * from "./core/scanner.js";
export * from "./core/scanner-engine.js";
export * from "./core/version.js";
export * from "./integrations/tool-runner.js";
