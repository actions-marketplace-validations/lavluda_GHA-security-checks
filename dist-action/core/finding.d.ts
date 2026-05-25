export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";
export type FindingCategory = "vulnerability" | "outdated-dependency" | "secret" | "workflow-risk" | "configuration" | "tooling";
export type FindingStatus = "open" | "suppressed" | "fixed" | "skipped";
export interface FindingLocation {
    file: string;
    startLine?: number;
    endLine?: number;
}
export interface Finding {
    id: string;
    title: string;
    description: string;
    category: FindingCategory;
    severity: FindingSeverity;
    scanner: string;
    status: FindingStatus;
    location?: FindingLocation;
    packageName?: string;
    installedVersion?: string;
    fixedVersion?: string;
    references?: string[];
    metadata?: Record<string, unknown>;
}
export interface ScanSummary {
    total: number;
    bySeverity: Record<FindingSeverity, number>;
    byCategory: Record<FindingCategory, number>;
}
export interface ScanResult {
    findings: Finding[];
    summary: ScanSummary;
    failed: boolean;
    mode: string;
    generatedAt: string;
}
export declare const severityRank: Record<FindingSeverity, number>;
export declare function createSummary(findings: Finding[]): ScanSummary;
