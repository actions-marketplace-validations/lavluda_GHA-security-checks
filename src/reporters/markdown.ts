import { writeFileSync } from "node:fs";
import type { Finding, ScanResult } from "../core/finding.js";

export function renderMarkdownReport(result: ScanResult): string {
  const lines = [
    "# Security Audit Report",
    "",
    `Generated: ${result.generatedAt}`,
    `Mode: ${result.mode}`,
    `Status: ${result.failed ? "failed" : "passed"}`,
    "",
    "## Summary",
    "",
    `Total findings: ${result.summary.total}`,
    "",
    "| Severity | Count |",
    "| --- | ---: |",
    ...Object.entries(result.summary.bySeverity).map(([severity, count]) => `| ${severity} | ${count} |`),
    "",
    "## Findings",
    ""
  ];

  if (result.findings.length === 0) {
    lines.push("No findings reported.");
    return `${lines.join("\n")}\n`;
  }

  for (const finding of result.findings) {
    lines.push(...renderFinding(finding));
  }

  return `${lines.join("\n")}\n`;
}

export function writeMarkdownReport(result: ScanResult, path: string): void {
  writeFileSync(path, renderMarkdownReport(result), "utf8");
}

function renderFinding(finding: Finding): string[] {
  const lines = [
    `### ${finding.title}`,
    "",
    `- Severity: ${finding.severity}`,
    `- Category: ${finding.category}`,
    `- Scanner: ${finding.scanner}`,
    `- Status: ${finding.status}`
  ];

  if (finding.location) {
    lines.push(
      `- Location: ${finding.location.file}${
        finding.location.startLine ? `:${finding.location.startLine}` : ""
      }`
    );
  }

  if (finding.packageName) {
    lines.push(`- Package: ${finding.packageName}`);
  }

  lines.push("", finding.description, "");

  if (finding.references?.length) {
    lines.push("References:");
    for (const reference of finding.references) {
      lines.push(`- ${reference}`);
    }
    lines.push("");
  }

  return lines;
}
