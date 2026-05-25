import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";
export declare class ComposerAuditScanner implements Scanner {
    readonly name = "composer-audit";
    scan(context: ScannerContext): Promise<Finding[]>;
}
