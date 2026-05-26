import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";
export declare class NpmOutdatedScanner implements Scanner {
    readonly name = "npm-outdated";
    scan(context: ScannerContext): Promise<Finding[]>;
}
