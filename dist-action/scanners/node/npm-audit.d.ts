import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";
export declare class NpmAuditScanner implements Scanner {
    readonly name = "npm-audit";
    scan(context: ScannerContext): Promise<Finding[]>;
}
