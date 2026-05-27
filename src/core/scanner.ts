import type { SecurityCheckConfig } from "./config.js";
import type { Finding } from "./finding.js";
import type { ToolRunner } from "../integrations/tool-runner.js";

export interface ScannerContext {
  cwd: string;
  config: SecurityCheckConfig;
  toolRunner: ToolRunner;
  /**
   * When set (diff mode), only files in this Set were changed.
   * Scanners should limit their scope to these files.
   * Undefined means full scan.
   */
  changedFiles?: Set<string>;
}

export interface Scanner {
  name: string;
  scan(context: ScannerContext): Promise<Finding[]>;
}
