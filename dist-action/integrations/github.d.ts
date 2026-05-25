import type { ScanResult } from "../core/finding.js";
export interface GitHubReportOptions {
    token?: string;
    prComment: boolean;
    jobSummary: boolean;
    annotations: boolean;
}
export declare function publishGitHubReport(result: ScanResult, options: GitHubReportOptions): Promise<void>;
