import { mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { writeJsonReport } from "../src/reporters/json.js";
import type { ScanResult } from "../src/core/finding.js";

const sampleResult: ScanResult = {
  mode: "audit",
  failed: false,
  generatedAt: "2026-01-01T00:00:00.000Z",
  findings: [
    {
      id: "test.vuln.pkg-a",
      title: "Vulnerable package",
      description: "Package A has a known vulnerability.",
      category: "vulnerability",
      severity: "high",
      scanner: "test",
      status: "open",
      packageName: "pkg-a",
      installedVersion: "1.0.0",
      fixedVersion: "1.0.1",
      references: ["https://example.com/advisory/123"]
    },
    {
      id: "test.secret.file",
      title: "Secret detected",
      description: "A secret was found.",
      category: "secret",
      severity: "critical",
      scanner: "secret-scanner",
      status: "open",
      location: { file: "src/config.php", startLine: 42 }
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

describe("writeJsonReport", () => {
  it("writes valid JSON that round-trips back to the original structure", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gha-json-test-"));
    const path = join(cwd, "out.json");

    writeJsonReport(sampleResult, path);

    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as ScanResult;

    expect(parsed.mode).toBe(sampleResult.mode);
    expect(parsed.failed).toBe(sampleResult.failed);
    expect(parsed.generatedAt).toBe(sampleResult.generatedAt);
    expect(parsed.findings).toHaveLength(2);
    expect(parsed.findings[0]?.id).toBe("test.vuln.pkg-a");
    expect(parsed.findings[1]?.id).toBe("test.secret.file");
    expect(parsed.summary.total).toBe(2);
    expect(parsed.summary.bySeverity.high).toBe(1);
    expect(parsed.summary.bySeverity.critical).toBe(1);
  });

  it("ends with a newline", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gha-json-test-"));
    const path = join(cwd, "out.json");

    writeJsonReport(sampleResult, path);

    const raw = readFileSync(path, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
  });

  it("writes valid JSON for an empty result", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gha-json-test-"));
    const path = join(cwd, "empty.json");

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

    writeJsonReport(emptyResult, path);

    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as ScanResult;
    expect(parsed.findings).toHaveLength(0);
    expect(parsed.summary.total).toBe(0);
  });
});
