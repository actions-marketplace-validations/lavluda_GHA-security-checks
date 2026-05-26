import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { z } from "zod";
import type { FindingCategory, FindingSeverity } from "./finding.js";

export const configFileCandidates = [
  "gha-security-checks.yml",
  "gha-security-checks.yaml",
  ".gha-security-checks.yml",
  ".gha-security-checks.yaml"
] as const;

export const defaultToolCommands = {
  composer: "composer",
  npm: "npm",
  osvScanner: "osv-scanner"
} as const;

export const defaultOutputFiles = {
  json: "security-results.json",
  markdown: "security-summary.md",
  sarif: "security-results.sarif"
} as const;

const severitySchema = z.enum(["info", "low", "medium", "high", "critical"]);
const categorySchema = z.enum([
  "vulnerability",
  "outdated-dependency",
  "secret",
  "workflow-risk",
  "configuration",
  "tooling"
]);

const configSchema = z.object({
  root: z.string().default("."),
  mode: z
    .enum(["audit", "warn", "fail-on-high", "fail-on-critical", "strict", "custom"])
    .default("audit"),
  failOn: z
    .object({
      severity: severitySchema.default("high"),
      categories: z.array(categorySchema).default([])
    })
    .default({ severity: "high", categories: [] }),
  scanners: z
    .object({
      php: z.boolean().default(true),
      node: z.boolean().default(true),
      osv: z.boolean().default(true),
      secrets: z.boolean().default(true),
      githubActions: z.boolean().default(true)
    })
    .default({ php: true, node: true, osv: true, secrets: true, githubActions: true }),
  php: z
    .object({
      composerAudit: z.boolean().default(true),
      composerOutdated: z.boolean().default(true),
      abandonedPackages: z.boolean().default(true)
    })
    .default({ composerAudit: true, composerOutdated: true, abandonedPackages: true }),
  node: z
    .object({
      npmAudit: z.boolean().default(true),
      npmOutdated: z.boolean().default(true)
    })
    .default({ npmAudit: true, npmOutdated: true }),
  secrets: z
    .object({
      maxFileBytes: z.number().int().positive().default(1024 * 1024),
      include: z.array(z.string()).default([]),
      exclude: z
        .array(z.string())
        .default([".git", "node_modules", "vendor", "dist", "dist-action", "coverage"]),
      patterns: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            regex: z.string(),
            severity: severitySchema.default("high")
          })
        )
        .default([
          {
            id: "private-key",
            label: "Private key material",
            regex: "-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----",
            severity: "critical"
          },
          {
            id: "github-token",
            label: "GitHub token",
            regex: "gh[pousr]_[A-Za-z0-9_]{36,255}",
            severity: "critical"
          },
          {
            id: "aws-access-key",
            label: "AWS access key",
            regex: "AKIA[0-9A-Z]{16}",
            severity: "high"
          },
          {
            id: "generic-secret-assignment",
            label: "Potential secret assignment",
            regex: "(api[_-]?key|secret|token|password)\\s*[:=]\\s*['\\\"][^'\\\"]{12,}['\\\"]",
            severity: "medium"
          }
        ])
    })
    .default({}),
  githubActions: z
    .object({
      workflowDir: z.string().default(".github/workflows"),
      allowUnpinnedOfficialActions: z.boolean().default(true)
    })
    .default({}),
  tools: z
    .object({
      composer: z.string().default(defaultToolCommands.composer),
      npm: z.string().default(defaultToolCommands.npm),
      osvScanner: z.string().default(defaultToolCommands.osvScanner)
    })
    .default(defaultToolCommands),
  outputs: z
    .object({
      json: z.union([z.boolean(), z.string()]).default(defaultOutputFiles.json),
      markdown: z.union([z.boolean(), z.string()]).default(defaultOutputFiles.markdown),
      sarif: z.union([z.boolean(), z.string()]).default(defaultOutputFiles.sarif),
      githubSummary: z.boolean().default(true),
      prComment: z.boolean().default(true),
      annotations: z.boolean().default(true)
    })
    .default({}),
  suppressions: z
    .array(
      z.object({
        id: z.string().optional(),
        category: categorySchema.optional(),
        path: z.string().optional(),
        reason: z.string().optional()
      })
    )
    .default([])
});

export type SecurityCheckConfig = z.infer<typeof configSchema>;
export type PolicyMode = SecurityCheckConfig["mode"];
export type SecurityCheckConfigOverrides = Omit<
  Partial<SecurityCheckConfig>,
  "failOn" | "scanners" | "outputs" | "php" | "node" | "secrets" | "githubActions" | "tools"
> & {
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

export function loadConfig(options: LoadConfigOptions): SecurityCheckConfig {
  const fileConfig = readConfigFile(options.cwd, options.configPath);
  return configSchema.parse({
    ...fileConfig,
    ...options.overrides,
    failOn: {
      ...objectValue(fileConfig.failOn),
      ...options.overrides?.failOn
    },
    scanners: {
      ...objectValue(fileConfig.scanners),
      ...options.overrides?.scanners
    },
    php: {
      ...objectValue(fileConfig.php),
      ...options.overrides?.php
    },
    node: {
      ...objectValue(fileConfig.node),
      ...options.overrides?.node
    },
    secrets: {
      ...objectValue(fileConfig.secrets),
      ...options.overrides?.secrets
    },
    githubActions: {
      ...objectValue(fileConfig.githubActions),
      ...options.overrides?.githubActions
    },
    tools: {
      ...objectValue(fileConfig.tools),
      ...options.overrides?.tools
    },
    outputs: {
      ...objectValue(fileConfig.outputs),
      ...options.overrides?.outputs
    }
  });
}

function readConfigFile(cwd: string, configPath?: string): Record<string, unknown> {
  const paths = configPath
    ? [resolve(cwd, configPath)]
    : configFileCandidates.map((candidate) => resolve(cwd, candidate));

  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    const raw = readFileSync(path, "utf8");
    const parsed = YAML.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  }

  return {};
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function shouldFailForSeverity(
  severity: FindingSeverity,
  threshold: FindingSeverity
): boolean {
  const order: FindingSeverity[] = ["info", "low", "medium", "high", "critical"];
  return order.indexOf(severity) >= order.indexOf(threshold);
}

export function categorySet(categories: FindingCategory[]): Set<FindingCategory> {
  return new Set(categories);
}
