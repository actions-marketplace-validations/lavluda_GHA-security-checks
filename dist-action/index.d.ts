import { type SecurityCheckConfig, type SecurityCheckConfigOverrides } from "./core/config.js";
import type { ScanResult } from "./core/finding.js";
import { type WrittenReports } from "./core/output.js";
import { type ToolRunner } from "./integrations/tool-runner.js";
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
export declare function runSecurityCheck(options?: RunSecurityCheckOptions): Promise<RunSecurityCheckResult>;
export * from "./core/config.js";
export * from "./core/finding.js";
export * from "./core/scanner.js";
export * from "./core/scanner-engine.js";
export * from "./integrations/tool-runner.js";
