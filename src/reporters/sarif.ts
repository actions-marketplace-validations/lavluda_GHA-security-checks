import { writeFileSync } from "node:fs";
import type { Finding, ScanResult } from "../core/finding.js";

interface SarifLog {
  version: "2.1.0";
  $schema: string;
  runs: Array<{
    tool: {
      driver: {
        name: string;
        informationUri: string;
        rules: Array<{
          id: string;
          name: string;
          shortDescription: { text: string };
          fullDescription: { text: string };
          defaultConfiguration: { level: string };
        }>;
      };
    };
    results: Array<{
      ruleId: string;
      level: string;
      message: { text: string };
      locations?: Array<{
        physicalLocation: {
          artifactLocation: { uri: string };
          region?: { startLine: number };
        };
      }>;
      properties?: Record<string, unknown>;
    }>;
  }>;
}

export function writeSarifReport(result: ScanResult, path: string): void {
  writeFileSync(path, `${JSON.stringify(toSarif(result), null, 2)}\n`, "utf8");
}

export function toSarif(result: ScanResult): SarifLog {
  const rulesById = new Map<string, Finding>();

  for (const finding of result.findings) {
    rulesById.set(finding.id, finding);
  }

  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "gha-security-checks",
            informationUri: "https://github.com/",
            rules: [...rulesById.values()].map((finding) => ({
              id: finding.id,
              name: finding.title,
              shortDescription: { text: finding.title },
              fullDescription: { text: finding.description },
              defaultConfiguration: { level: sarifLevel(finding.severity) }
            }))
          }
        },
        results: result.findings.map((finding) => ({
          ruleId: finding.id,
          level: sarifLevel(finding.severity),
          message: { text: finding.description },
          locations: finding.location
            ? [
                {
                  physicalLocation: {
                    artifactLocation: { uri: finding.location.file },
                    region: finding.location.startLine
                      ? { startLine: finding.location.startLine }
                      : undefined
                  }
                }
              ]
            : undefined,
          properties: {
            category: finding.category,
            scanner: finding.scanner,
            status: finding.status,
            packageName: finding.packageName,
            installedVersion: finding.installedVersion,
            fixedVersion: finding.fixedVersion
          }
        }))
      }
    ]
  };
}

function sarifLevel(severity: Finding["severity"]): string {
  if (severity === "critical" || severity === "high") {
    return "error";
  }
  if (severity === "medium" || severity === "low") {
    return "warning";
  }
  return "note";
}
