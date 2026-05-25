import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";
export declare class ComposerOutdatedScanner implements Scanner {
    readonly name = "composer-outdated";
    scan(context: ScannerContext): Promise<Finding[]>;
}
