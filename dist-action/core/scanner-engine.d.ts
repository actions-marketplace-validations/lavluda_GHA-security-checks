import { type ScanResult } from "./finding.js";
import type { Scanner, ScannerContext } from "./scanner.js";
export declare class ScannerEngine {
    private readonly scanners;
    constructor(scanners: Scanner[]);
    run(context: ScannerContext): Promise<ScanResult>;
}
