import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { WorkflowHardeningScanner } from "../src/scanners/github-actions/workflow-hardening.js";
import type { ToolRunner } from "../src/integrations/tool-runner.js";

const toolRunner: ToolRunner = {
  async run(command, args) {
    return { command, args, exitCode: 0, stdout: "", stderr: "" };
  }
};

describe("WorkflowHardeningScanner", () => {
  it("reports risky workflow settings", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gha-security-checks-"));
    mkdirSync(join(cwd, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(cwd, ".github", "workflows", "ci.yml"),
      [
        "on: pull_request_target",
        "permissions: write-all",
        "jobs:",
        "  test:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: third-party/action@v1",
        "      - run: echo \"${{ github.event.pull_request.title }}\""
      ].join("\n"),
      "utf8"
    );

    const config = loadConfig({ cwd });
    const scanner = new WorkflowHardeningScanner();
    const findings = await scanner.scan({ cwd, config, toolRunner });

    expect(findings.some((finding) => finding.id.includes("pull-request-target"))).toBe(true);
    expect(findings.some((finding) => finding.id.includes("write-all"))).toBe(true);
    expect(findings.some((finding) => finding.id.includes("action-unpinned"))).toBe(true);
    expect(findings.some((finding) => finding.id.includes("untrusted-expression"))).toBe(true);
  });
});
