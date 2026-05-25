import { hasFile } from "../../core/filesystem.js";
import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";

interface ComposerAuditAdvisory {
  advisoryId?: string;
  advisory_id?: string;
  cve?: string;
  title?: string;
  link?: string;
  affectedVersions?: string;
  affected_versions?: string;
  reportedAt?: string;
  severity?: string;
  sources?: Array<{ name?: string; remoteId?: string }>;
}

interface ComposerAuditJson {
  advisories?: Record<string, ComposerAuditAdvisory[]>;
  abandoned?: Record<string, string | null | boolean>;
}

export class ComposerAuditScanner implements Scanner {
  readonly name = "composer-audit";

  async scan(context: ScannerContext): Promise<Finding[]> {
    if (!context.config.scanners.php || !context.config.php.composerAudit) {
      return [];
    }

    if (!hasFile(context.cwd, "composer.json")) {
      return [];
    }

    const result = await context.toolRunner.run(
      context.config.tools.composer,
      ["audit", "--format=json", "--no-interaction"],
      { cwd: context.cwd }
    );

    if (result.exitCode === 127) {
      return [
        {
          id: "tooling.composer.missing",
          title: "Composer is not available",
          description: "Composer audit was skipped because the configured composer command was not found.",
          category: "tooling",
          severity: "info",
          scanner: this.name,
          status: "skipped"
        }
      ];
    }

    const parsed = parseJson<ComposerAuditJson>(result.stdout);
    if (!parsed) {
      return [
        {
          id: "tooling.composer.audit.parse-failed",
          title: "Composer audit output could not be parsed",
          description: result.stderr || "Composer did not return valid JSON output.",
          category: "tooling",
          severity: "info",
          scanner: this.name,
          status: "skipped"
        }
      ];
    }

    const findings: Finding[] = [];

    for (const [packageName, advisories] of Object.entries(parsed.advisories ?? {})) {
      for (const advisory of advisories) {
        const advisoryId = advisory.advisoryId ?? advisory.advisory_id ?? advisory.cve ?? packageName;
        findings.push({
          id: `composer.audit.${packageName}.${advisoryId}`,
          title: advisory.title ?? `Vulnerability in ${packageName}`,
          description: buildDescription(packageName, advisory),
          category: "vulnerability",
          severity: normalizeSeverity(advisory.severity),
          scanner: this.name,
          status: "open",
          packageName,
          references: advisory.link ? [advisory.link] : undefined,
          metadata: {
            advisoryId,
            cve: advisory.cve,
            affectedVersions: advisory.affectedVersions ?? advisory.affected_versions,
            reportedAt: advisory.reportedAt,
            sources: advisory.sources
          }
        });
      }
    }

    if (context.config.php.abandonedPackages) {
      for (const [packageName, replacement] of Object.entries(parsed.abandoned ?? {})) {
        findings.push({
          id: `composer.abandoned.${packageName}`,
          title: `Abandoned Composer package: ${packageName}`,
          description:
            typeof replacement === "string" && replacement.length > 0
              ? `The package is abandoned. Suggested replacement: ${replacement}.`
              : "The package is abandoned and should be replaced or removed.",
          category: "outdated-dependency",
          severity: "medium",
          scanner: this.name,
          status: "open",
          packageName,
          metadata: { replacement }
        });
      }
    }

    return findings;
  }
}

function buildDescription(packageName: string, advisory: ComposerAuditAdvisory): string {
  const affected = advisory.affectedVersions ?? advisory.affected_versions;
  const parts = [`Composer reported a vulnerability for ${packageName}.`];
  if (affected) {
    parts.push(`Affected versions: ${affected}.`);
  }
  if (advisory.cve) {
    parts.push(`CVE: ${advisory.cve}.`);
  }
  return parts.join(" ");
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
