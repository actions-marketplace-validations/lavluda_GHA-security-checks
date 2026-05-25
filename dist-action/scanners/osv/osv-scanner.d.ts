import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";
export declare class OsvScanner implements Scanner {
    readonly name = "osv-scanner";
    scan(context: ScannerContext): Promise<Finding[]>;
}
