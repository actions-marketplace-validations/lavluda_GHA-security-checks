import { z } from "zod";
import type { FindingCategory, FindingSeverity } from "./finding.js";
export declare const configFileCandidates: readonly ["gha-security-checks.yml", "gha-security-checks.yaml", ".gha-security-checks.yml", ".gha-security-checks.yaml"];
export declare const defaultToolCommands: {
    readonly composer: "composer";
    readonly npm: "npm";
    readonly osvScanner: "osv-scanner";
};
export declare const defaultOutputFiles: {
    readonly json: "security-results.json";
    readonly markdown: "security-summary.md";
    readonly sarif: "security-results.sarif";
};
declare const configSchema: z.ZodObject<{
    root: z.ZodDefault<z.ZodString>;
    mode: z.ZodDefault<z.ZodEnum<["audit", "warn", "fail-on-high", "fail-on-critical", "strict", "custom"]>>;
    failOn: z.ZodDefault<z.ZodObject<{
        severity: z.ZodDefault<z.ZodEnum<["info", "low", "medium", "high", "critical"]>>;
        categories: z.ZodDefault<z.ZodArray<z.ZodEnum<["vulnerability", "outdated-dependency", "secret", "workflow-risk", "configuration", "tooling"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        severity: "info" | "low" | "medium" | "high" | "critical";
        categories: ("vulnerability" | "outdated-dependency" | "secret" | "workflow-risk" | "configuration" | "tooling")[];
    }, {
        severity?: "info" | "low" | "medium" | "high" | "critical" | undefined;
        categories?: ("vulnerability" | "outdated-dependency" | "secret" | "workflow-risk" | "configuration" | "tooling")[] | undefined;
    }>>;
    scanners: z.ZodDefault<z.ZodObject<{
        php: z.ZodDefault<z.ZodBoolean>;
        node: z.ZodDefault<z.ZodBoolean>;
        osv: z.ZodDefault<z.ZodBoolean>;
        secrets: z.ZodDefault<z.ZodBoolean>;
        githubActions: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        php: boolean;
        node: boolean;
        osv: boolean;
        secrets: boolean;
        githubActions: boolean;
    }, {
        php?: boolean | undefined;
        node?: boolean | undefined;
        osv?: boolean | undefined;
        secrets?: boolean | undefined;
        githubActions?: boolean | undefined;
    }>>;
    php: z.ZodDefault<z.ZodObject<{
        composerAudit: z.ZodDefault<z.ZodBoolean>;
        composerOutdated: z.ZodDefault<z.ZodBoolean>;
        abandonedPackages: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        composerAudit: boolean;
        composerOutdated: boolean;
        abandonedPackages: boolean;
    }, {
        composerAudit?: boolean | undefined;
        composerOutdated?: boolean | undefined;
        abandonedPackages?: boolean | undefined;
    }>>;
    node: z.ZodDefault<z.ZodObject<{
        npmAudit: z.ZodDefault<z.ZodBoolean>;
        npmOutdated: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        npmAudit: boolean;
        npmOutdated: boolean;
    }, {
        npmAudit?: boolean | undefined;
        npmOutdated?: boolean | undefined;
    }>>;
    secrets: z.ZodDefault<z.ZodObject<{
        maxFileBytes: z.ZodDefault<z.ZodNumber>;
        include: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        exclude: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        patterns: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            label: z.ZodString;
            regex: z.ZodString;
            severity: z.ZodDefault<z.ZodEnum<["info", "low", "medium", "high", "critical"]>>;
        }, "strip", z.ZodTypeAny, {
            severity: "info" | "low" | "medium" | "high" | "critical";
            id: string;
            label: string;
            regex: string;
        }, {
            id: string;
            label: string;
            regex: string;
            severity?: "info" | "low" | "medium" | "high" | "critical" | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        maxFileBytes: number;
        include: string[];
        exclude: string[];
        patterns: {
            severity: "info" | "low" | "medium" | "high" | "critical";
            id: string;
            label: string;
            regex: string;
        }[];
    }, {
        maxFileBytes?: number | undefined;
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        patterns?: {
            id: string;
            label: string;
            regex: string;
            severity?: "info" | "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
    }>>;
    githubActions: z.ZodDefault<z.ZodObject<{
        workflowDir: z.ZodDefault<z.ZodString>;
        allowUnpinnedOfficialActions: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        workflowDir: string;
        allowUnpinnedOfficialActions: boolean;
    }, {
        workflowDir?: string | undefined;
        allowUnpinnedOfficialActions?: boolean | undefined;
    }>>;
    tools: z.ZodDefault<z.ZodObject<{
        composer: z.ZodDefault<z.ZodString>;
        npm: z.ZodDefault<z.ZodString>;
        osvScanner: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        composer: string;
        npm: string;
        osvScanner: string;
    }, {
        composer?: string | undefined;
        npm?: string | undefined;
        osvScanner?: string | undefined;
    }>>;
    outputs: z.ZodDefault<z.ZodObject<{
        json: z.ZodDefault<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
        markdown: z.ZodDefault<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
        sarif: z.ZodDefault<z.ZodUnion<[z.ZodBoolean, z.ZodString]>>;
        githubSummary: z.ZodDefault<z.ZodBoolean>;
        prComment: z.ZodDefault<z.ZodBoolean>;
        annotations: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        json: string | boolean;
        markdown: string | boolean;
        sarif: string | boolean;
        githubSummary: boolean;
        prComment: boolean;
        annotations: boolean;
    }, {
        json?: string | boolean | undefined;
        markdown?: string | boolean | undefined;
        sarif?: string | boolean | undefined;
        githubSummary?: boolean | undefined;
        prComment?: boolean | undefined;
        annotations?: boolean | undefined;
    }>>;
    suppressions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodEnum<["vulnerability", "outdated-dependency", "secret", "workflow-risk", "configuration", "tooling"]>>;
        path: z.ZodOptional<z.ZodString>;
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path?: string | undefined;
        id?: string | undefined;
        category?: "vulnerability" | "outdated-dependency" | "secret" | "workflow-risk" | "configuration" | "tooling" | undefined;
        reason?: string | undefined;
    }, {
        path?: string | undefined;
        id?: string | undefined;
        category?: "vulnerability" | "outdated-dependency" | "secret" | "workflow-risk" | "configuration" | "tooling" | undefined;
        reason?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    root: string;
    mode: "audit" | "warn" | "fail-on-high" | "fail-on-critical" | "strict" | "custom";
    failOn: {
        severity: "info" | "low" | "medium" | "high" | "critical";
        categories: ("vulnerability" | "outdated-dependency" | "secret" | "workflow-risk" | "configuration" | "tooling")[];
    };
    php: {
        composerAudit: boolean;
        composerOutdated: boolean;
        abandonedPackages: boolean;
    };
    node: {
        npmAudit: boolean;
        npmOutdated: boolean;
    };
    secrets: {
        maxFileBytes: number;
        include: string[];
        exclude: string[];
        patterns: {
            severity: "info" | "low" | "medium" | "high" | "critical";
            id: string;
            label: string;
            regex: string;
        }[];
    };
    githubActions: {
        workflowDir: string;
        allowUnpinnedOfficialActions: boolean;
    };
    scanners: {
        php: boolean;
        node: boolean;
        osv: boolean;
        secrets: boolean;
        githubActions: boolean;
    };
    tools: {
        composer: string;
        npm: string;
        osvScanner: string;
    };
    outputs: {
        json: string | boolean;
        markdown: string | boolean;
        sarif: string | boolean;
        githubSummary: boolean;
        prComment: boolean;
        annotations: boolean;
    };
    suppressions: {
        path?: string | undefined;
        id?: string | undefined;
        category?: "vulnerability" | "outdated-dependency" | "secret" | "workflow-risk" | "configuration" | "tooling" | undefined;
        reason?: string | undefined;
    }[];
}, {
    root?: string | undefined;
    mode?: "audit" | "warn" | "fail-on-high" | "fail-on-critical" | "strict" | "custom" | undefined;
    failOn?: {
        severity?: "info" | "low" | "medium" | "high" | "critical" | undefined;
        categories?: ("vulnerability" | "outdated-dependency" | "secret" | "workflow-risk" | "configuration" | "tooling")[] | undefined;
    } | undefined;
    php?: {
        composerAudit?: boolean | undefined;
        composerOutdated?: boolean | undefined;
        abandonedPackages?: boolean | undefined;
    } | undefined;
    node?: {
        npmAudit?: boolean | undefined;
        npmOutdated?: boolean | undefined;
    } | undefined;
    secrets?: {
        maxFileBytes?: number | undefined;
        include?: string[] | undefined;
        exclude?: string[] | undefined;
        patterns?: {
            id: string;
            label: string;
            regex: string;
            severity?: "info" | "low" | "medium" | "high" | "critical" | undefined;
        }[] | undefined;
    } | undefined;
    githubActions?: {
        workflowDir?: string | undefined;
        allowUnpinnedOfficialActions?: boolean | undefined;
    } | undefined;
    scanners?: {
        php?: boolean | undefined;
        node?: boolean | undefined;
        osv?: boolean | undefined;
        secrets?: boolean | undefined;
        githubActions?: boolean | undefined;
    } | undefined;
    tools?: {
        composer?: string | undefined;
        npm?: string | undefined;
        osvScanner?: string | undefined;
    } | undefined;
    outputs?: {
        json?: string | boolean | undefined;
        markdown?: string | boolean | undefined;
        sarif?: string | boolean | undefined;
        githubSummary?: boolean | undefined;
        prComment?: boolean | undefined;
        annotations?: boolean | undefined;
    } | undefined;
    suppressions?: {
        path?: string | undefined;
        id?: string | undefined;
        category?: "vulnerability" | "outdated-dependency" | "secret" | "workflow-risk" | "configuration" | "tooling" | undefined;
        reason?: string | undefined;
    }[] | undefined;
}>;
export type SecurityCheckConfig = z.infer<typeof configSchema>;
export type PolicyMode = SecurityCheckConfig["mode"];
export type SecurityCheckConfigOverrides = Omit<Partial<SecurityCheckConfig>, "failOn" | "scanners" | "outputs" | "php" | "node" | "secrets" | "githubActions" | "tools"> & {
    failOn?: Partial<SecurityCheckConfig["failOn"]>;
    scanners?: Partial<SecurityCheckConfig["scanners"]>;
    outputs?: Partial<SecurityCheckConfig["outputs"]>;
    php?: Partial<SecurityCheckConfig["php"]>;
    node?: Partial<SecurityCheckConfig["node"]>;
    secrets?: Partial<SecurityCheckConfig["secrets"]>;
    githubActions?: Partial<SecurityCheckConfig["githubActions"]>;
    tools?: Partial<SecurityCheckConfig["tools"]>;
};
export interface LoadConfigOptions {
    cwd: string;
    configPath?: string;
    overrides?: SecurityCheckConfigOverrides;
}
export declare function loadConfig(options: LoadConfigOptions): SecurityCheckConfig;
export declare function shouldFailForSeverity(severity: FindingSeverity, threshold: FindingSeverity): boolean;
export declare function categorySet(categories: FindingCategory[]): Set<FindingCategory>;
export {};
