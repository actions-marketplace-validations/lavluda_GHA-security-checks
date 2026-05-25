import type { Finding } from "./finding.js";
import type { SecurityCheckConfig } from "./config.js";
export interface PolicyDecision {
    failed: boolean;
    blockingFindings: Finding[];
}
export declare function evaluatePolicy(findings: Finding[], config: SecurityCheckConfig): PolicyDecision;
