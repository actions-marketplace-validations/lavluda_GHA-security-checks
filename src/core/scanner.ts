import type { SecurityCheckConfig } from "./config.js";
import type { Finding } from "./finding.js";
import type { ToolRunner } from "../integrations/tool-runner.js";

export interface ScannerContext {
  cwd: string;
  config: SecurityCheckConfig;
  toolRunner: ToolRunner;
}

export interface Scanner {
  name: string;
  scan(context: ScannerContext): Promise<Finding[]>;
}
