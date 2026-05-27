import { hasFile } from "../../core/filesystem.js";
import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";

interface NpmAuditVulnerability {
  name?: string;
  severity?: string;
  title?: string;
  url?: string;
  range?: string;
  via?: Array<string | { title?: string; url?: string; severity?: string; range?: string }>;
  fixAvailable?: boolean | { name?: string; version?: string; isSemVerMajor?: boolean };
}

interface NpmAuditJson {
  vulnerabilities?: Record<string, NpmAuditVulnerability>;
}

export class NpmAuditScanner implements Scanner {
  readonly name = "npm-audit";

  async scan(context: ScannerContext): Promise<Finding[]> {
    if (!context.config.scanners.node || !context.config.node.npmAudit) {
      return [];
    }

    if (!hasFile(context.cwd, "package.json")) {
      return [];
    }

    // In diff mode, skip if no Node manifest was changed
    if (context.changedFiles !== undefined) {
      const manifests = ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
      if (!manifests.some((m) => context.changedFiles!.has(m))) {
        return [];
      }
    }

    const result = await context.toolRunner.run(
      context.config.tools.npm,
      ["audit", "--json"],
      { cwd: context.cwd }
    );

    if (result.exitCode === 127) {
      return [
        {
          id: "tooling.npm.missing",
          title: "npm is not available",
          description: "npm audit was skipped because the configured npm command was not found.",
          category: "tooling",
          severity: "info",
          scanner: this.name,
          status: "skipped"
        }
      ];
    }

    const parsed = parseJson<NpmAuditJson>(result.stdout);
    if (!parsed) {
      return [];
    }

    return Object.entries(parsed.vulnerabilities ?? {}).map(([packageName, vulnerability]) => {
      const advisory = firstAdvisory(vulnerability);
      const fixedVersion = fixedVersionFrom(vulnerability.fixAvailable);

      const reference = advisory?.url ?? vulnerability.url;

      return {
        id: `npm.audit.${packageName}`,
        title: advisory?.title ?? vulnerability.title ?? `Vulnerability in ${packageName}`,
        description: buildDescription(packageName, vulnerability, advisory),
        category: "vulnerability" as const,
        severity: normalizeSeverity(advisory?.severity ?? vulnerability.severity),
        scanner: this.name,
        status: "open" as const,
        packageName: vulnerability.name ?? packageName,
        fixedVersion,
        references: reference ? [reference] : undefined,
        metadata: {
          range: advisory?.range ?? vulnerability.range,
          fixAvailable: vulnerability.fixAvailable
        }
      };
    });
  }
}

function firstAdvisory(
  vulnerability: NpmAuditVulnerability
): { title?: string; url?: string; severity?: string; range?: string } | undefined {
  return vulnerability.via?.find((entry) => typeof entry === "object") as
    | { title?: string; url?: string; severity?: string; range?: string }
    | undefined;
}

function buildDescription(
  packageName: string,
  vulnerability: NpmAuditVulnerability,
  advisory?: { range?: string }
): string {
  const range = advisory?.range ?? vulnerability.range;
  const parts = [`npm reported a vulnerability for ${packageName}.`];
  if (range) {
    parts.push(`Affected versions: ${range}.`);
  }
  return parts.join(" ");
}

function fixedVersionFrom(value: NpmAuditVulnerability["fixAvailable"]): string | undefined {
  if (value && typeof value === "object") {
    return value.version;
  }
  return undefined;
}

function normalizeSeverity(value?: string): Finding["severity"] {
  const normalized = value?.toLowerCase();
  if (
    normalized === "critical" ||
    normalized === "high" ||
    normalized === "medium" ||
    normalized === "low"
  ) {
    return normalized;
  }
  return "medium";
}

function parseJson<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}
