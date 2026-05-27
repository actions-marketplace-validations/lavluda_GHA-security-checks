import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { ScannerEngine } from "../src/core/scanner-engine.js";
import type { Scanner, ScannerContext } from "../src/core/scanner.js";
import type { ToolRunner } from "../src/integrations/tool-runner.js";

const toolRunner: ToolRunner = {
  async run(command, args) {
    return { command, args, exitCode: 0, stdout: "", stderr: "" };
  }
};

function makeScanner(name: string, capturedContext: { ctx?: ScannerContext }): Scanner {
  return {
    name,
    async scan(ctx) {
      capturedContext.ctx = ctx;
      return [];
    }
  };
}

describe("diff mode — changedFiles propagation", () => {
  it("passes changedFiles to scanners when provided", async () => {
    const config = loadConfig({ cwd: process.cwd(), overrides: { mode: "diff" } });
    const captured: { ctx?: ScannerContext } = {};
    const scanner = makeScanner("test-scanner", captured);
    const engine = new ScannerEngine([scanner]);

    const changedFiles = new Set(["src/app.ts", "package.json"]);
    await engine.run({ cwd: process.cwd(), config, toolRunner, changedFiles });

    expect(captured.ctx?.changedFiles).toBe(changedFiles);
    expect(captured.ctx?.changedFiles?.has("package.json")).toBe(true);
  });

  it("does not set changedFiles in audit mode", async () => {
    const config = loadConfig({ cwd: process.cwd(), overrides: { mode: "audit" } });
    const captured: { ctx?: ScannerContext } = {};
    const scanner = makeScanner("test-scanner", captured);
    const engine = new ScannerEngine([scanner]);

    await engine.run({ cwd: process.cwd(), config, toolRunner });

    expect(captured.ctx?.changedFiles).toBeUndefined();
  });

  it("diff mode never fails the policy (behaves like audit)", async () => {
    const config = loadConfig({ cwd: process.cwd(), overrides: { mode: "diff" } });
    const scanner: Scanner = {
      name: "always-critical",
      async scan() {
        return [
          {
            id: "test.critical",
            title: "Critical finding",
            description: "Very bad.",
            category: "vulnerability",
            severity: "critical",
            scanner: "always-critical",
            status: "open"
          }
        ];
      }
    };

    const engine = new ScannerEngine([scanner]);
    const result = await engine.run({ cwd: process.cwd(), config, toolRunner });

    expect(result.failed).toBe(false);
    expect(result.findings[0]?.severity).toBe("critical");
  });
});

describe("diff mode — scanner filtering", () => {
  it("secret scanner skips files not in changedFiles", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const { SecretScanner } = await import(
      "../src/scanners/secrets/secret-scanner.js"
    );

    const cwd = await mkdtemp(join(tmpdir(), "gha-diff-"));
    writeFileSync(join(cwd, "secrets.php"), "api_key = \"AKIAIOSFODNN7EXAMPLE\";\n", "utf8");

    const config = loadConfig({ cwd });
    const scanner = new SecretScanner();

    // With changedFiles that does NOT include secrets.php — should return no findings
    const noMatch = await scanner.scan({
      cwd,
      config,
      toolRunner,
      changedFiles: new Set(["README.md"])
    });
    expect(noMatch).toHaveLength(0);

    // With changedFiles that DOES include secrets.php — should find the key
    const withMatch = await scanner.scan({
      cwd,
      config,
      toolRunner,
      changedFiles: new Set(["secrets.php"])
    });
    expect(withMatch.length).toBeGreaterThan(0);

    // Without changedFiles (full scan) — should also find it
    const fullScan = await scanner.scan({ cwd, config, toolRunner });
    expect(fullScan.length).toBeGreaterThan(0);
  });

  it("workflow scanner skips unchanged workflow files", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { writeFileSync, mkdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const { WorkflowHardeningScanner } = await import(
      "../src/scanners/github-actions/workflow-hardening.js"
    );

    const cwd = await mkdtemp(join(tmpdir(), "gha-diff-wf-"));
    mkdirSync(join(cwd, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(cwd, ".github", "workflows", "risky.yml"),
      "on: pull_request_target\npermissions: write-all\njobs:\n  x:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n",
      "utf8"
    );

    const config = loadConfig({ cwd });
    const scanner = new WorkflowHardeningScanner();

    // Changed files does NOT include the workflow → no findings
    const noMatch = await scanner.scan({
      cwd,
      config,
      toolRunner,
      changedFiles: new Set(["src/app.ts"])
    });
    expect(noMatch).toHaveLength(0);

    // Changed files includes the workflow → findings reported
    const withMatch = await scanner.scan({
      cwd,
      config,
      toolRunner,
      changedFiles: new Set([".github/workflows/risky.yml"])
    });
    expect(withMatch.length).toBeGreaterThan(0);
  });
});
