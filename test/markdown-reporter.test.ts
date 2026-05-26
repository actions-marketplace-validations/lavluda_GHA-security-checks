import { mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { renderMarkdownReport, writeMarkdownReport } from "../src/reporters/markdown.js";
import type { ScanResult } from "../src/core/finding.js";

const sampleResult: ScanResult = {
  mode: "warn",
  failed: false,
  generatedAt: "2026-01-01T00:00:00.000Z",
  findings: [
    {
      id: "test.vuln.pkg-a",
      title: "Vulnerable package pkg-a",
      description: "Package A has a known vulnerability.",
      category: "vulnerability",
      severity: "high",
      scanner: "composer-audit",
      status: "open",
      packageName: "vendor/pkg-a",
      installedVersion: "1.0.0",
      fixedVersion: "1.0.1",
      location: { file: "composer.lock", startLine: 12 },
      references: ["https://example.com/advisory/123"]
    },
    {
      id: "test.secret",
      title: "GitHub token detected",
      description: "A GitHub personal access token was found in source code.",
      category: "secret",
      severity: "critical",
      scanner: "secret-scanner",
      status: "open",
      location: { file: "src/config.php", startLine: 5 }
    }
  ],
  summary: {
    total: 2,
    bySeverity: { info: 0, low: 0, medium: 0, high: 1, critical: 1 },
    byCategory: {
      vulnerability: 1,
      "outdated-dependency": 0,
      secret: 1,
      "workflow-risk": 0,
      configuration: 0,
      tooling: 0
    }
  }
};

describe("renderMarkdownReport", () => {
  it("contains a top-level heading", () => {
    const md = renderMarkdownReport(sampleResult);
    expect(md).toContain("# Security Audit Report");
  });

  it("includes mode and status", () => {
    const md = renderMarkdownReport(sampleResult);
    expect(md).toContain("Mode: warn");
    expect(md).toContain("Status: passed");
  });

  it("includes total finding count in summary", () => {
    const md = renderMarkdownReport(sampleResult);
    expect(md).toContain("Total findings: 2");
  });

  it("includes each finding title", () => {
    const md = renderMarkdownReport(sampleResult);
    expect(md).toContain("Vulnerable package pkg-a");
    expect(md).toContain("GitHub token detected");
  });

  it("includes location when present", () => {
    const md = renderMarkdownReport(sampleResult);
    expect(md).toContain("composer.lock:12");
    expect(md).toContain("src/config.php:5");
  });

  it("includes package name when present", () => {
    const md = renderMarkdownReport(sampleResult);
    expect(md).toContain("vendor/pkg-a");
  });

  it("includes references when present", () => {
    const md = renderMarkdownReport(sampleResult);
    expect(md).toContain("https://example.com/advisory/123");
  });

  it("shows 'No findings reported' for empty results", () => {
    const emptyResult: ScanResult = {
      mode: "audit",
      failed: false,
      generatedAt: "2026-01-01T00:00:00.000Z",
      findings: [],
      summary: {
        total: 0,
        bySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 0 },
        byCategory: {
          vulnerability: 0,
          "outdated-dependency": 0,
          secret: 0,
          "workflow-risk": 0,
          configuration: 0,
          tooling: 0
        }
      }
    };
    const md = renderMarkdownReport(emptyResult);
    expect(md).toContain("No findings reported");
  });

  it("ends with a newline", () => {
    const md = renderMarkdownReport(sampleResult);
    expect(md.endsWith("\n")).toBe(true);
  });
});

describe("writeMarkdownReport", () => {
  it("writes the rendered content to the given path", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gha-md-test-"));
    const path = join(cwd, "report.md");

    writeMarkdownReport(sampleResult, path);

    const content = readFileSync(path, "utf8");
    expect(content).toContain("# Security Audit Report");
    expect(content).toContain("Vulnerable package pkg-a");
  });
});
