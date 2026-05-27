import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";

interface OsvPackage {
  name?: string;
  version?: string;
  ecosystem?: string;
}

interface OsvVulnerability {
  id?: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  modified?: string;
  severity?: Array<{ type?: string; score?: string }>;
  affected?: Array<{ ranges?: Array<{ events?: Array<{ fixed?: string }> }> }>;
  database_specific?: Record<string, unknown>;
}

interface OsvResultPackage {
  package?: OsvPackage;
  vulnerabilities?: OsvVulnerability[];
  source?: { path?: string };
}

interface OsvJson {
  results?: OsvResultPackage[];
}

export class OsvScanner implements Scanner {
  readonly name = "osv-scanner";

  async scan(context: ScannerContext): Promise<Finding[]> {
    if (!context.config.scanners.osv) {
      return [];
    }

    // In diff mode, skip if no lockfile was changed
    if (context.changedFiles !== undefined) {
      const lockfiles = [
        "composer.lock",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "Pipfile.lock",
        "Gemfile.lock",
        "go.sum",
        "Cargo.lock"
      ];
      if (!lockfiles.some((f) => context.changedFiles!.has(f))) {
        return [];
      }
    }

    const result = await context.toolRunner.run(
      context.config.tools.osvScanner,
      ["scan", "source", "--format=json", "--recursive", context.cwd],
      { cwd: context.cwd }
    );

    if (result.exitCode === 127) {
      return [
        {
          id: "tooling.osv-scanner.missing",
          title: "OSV-Scanner is not available",
          description:
            "OSV scanning was skipped because the configured osv-scanner command was not found.",
          category: "tooling",
          severity: "info",
          scanner: this.name,
          status: "skipped"
        }
      ];
    }

    const parsed = parseJson<OsvJson>(result.stdout);
    if (!parsed) {
      return [];
    }

    const findings: Finding[] = [];
    for (const resultPackage of parsed.results ?? []) {
      for (const vulnerability of resultPackage.vulnerabilities ?? []) {
        const packageName = resultPackage.package?.name ?? "unknown-package";
        const vulnId = vulnerability.id ?? vulnerability.aliases?.[0] ?? "unknown";
        findings.push({
          id: `osv.${packageName}.${vulnId}`,
          title: vulnerability.summary ?? `Vulnerability in ${packageName}`,
          description: vulnerability.details ?? `OSV reported a vulnerability for ${packageName}.`,
          category: "vulnerability",
          severity: normalizeOsvSeverity(vulnerability),
          scanner: this.name,
          status: "open",
          packageName,
          installedVersion: resultPackage.package?.version,
          fixedVersion: findFixedVersion(vulnerability),
          location: resultPackage.source?.path ? { file: resultPackage.source.path } : undefined,
          references: vulnerability.id ? [`https://osv.dev/vulnerability/${vulnerability.id}`] : undefined,
          metadata: {
            aliases: vulnerability.aliases,
            ecosystem: resultPackage.package?.ecosystem,
            modified: vulnerability.modified,
            severity: vulnerability.severity,
            databaseSpecific: vulnerability.database_specific
          }
        });
      }
    }

    return findings;
  }
}

function normalizeOsvSeverity(vulnerability: OsvVulnerability): Finding["severity"] {
  const cvss = vulnerability.severity?.find((entry) => entry.score)?.score;
  const score = cvss ? Number(cvss.match(/\d+(?:\.\d+)?/)?.[0]) : Number.NaN;
  if (!Number.isNaN(score)) {
    if (score >= 9) return "critical";
    if (score >= 7) return "high";
    if (score >= 4) return "medium";
    return "low";
  }
  return "medium";
}

function findFixedVersion(vulnerability: OsvVulnerability): string | undefined {
  for (const affected of vulnerability.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) {
        if (event.fixed) {
          return event.fixed;
        }
      }
    }
  }
  return undefined;
}

function parseJson<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}
