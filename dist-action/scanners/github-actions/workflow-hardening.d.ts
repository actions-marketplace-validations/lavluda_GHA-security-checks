import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";
export declare class WorkflowHardeningScanner implements Scanner {
    readonly name = "github-actions-hardening";
    scan(context: ScannerContext): Promise<Finding[]>;
}
