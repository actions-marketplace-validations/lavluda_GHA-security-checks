import type { ScanResult } from "../core/finding.js";
export declare function renderMarkdownReport(result: ScanResult): string;
export declare function writeMarkdownReport(result: ScanResult, path: string): void;
