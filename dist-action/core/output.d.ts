import type { SecurityCheckConfig } from "./config.js";
import type { ScanResult } from "./finding.js";
export interface WrittenReports {
    json?: string;
    markdown?: string;
    sarif?: string;
}
export declare function writeConfiguredReports(result: ScanResult, config: SecurityCheckConfig, cwd: string): WrittenReports;
