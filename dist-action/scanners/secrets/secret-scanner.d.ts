import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";
export declare class SecretScanner implements Scanner {
    readonly name = "secret-scanner";
    scan(context: ScannerContext): Promise<Finding[]>;
}
