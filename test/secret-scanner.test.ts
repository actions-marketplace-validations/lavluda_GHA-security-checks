import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { SecretScanner } from "../src/scanners/secrets/secret-scanner.js";
import type { ToolRunner } from "../src/integrations/tool-runner.js";

const toolRunner: ToolRunner = {
  async run(command, args) {
    return { command, args, exitCode: 0, stdout: "", stderr: "" };
  }
};

describe("SecretScanner", () => {
  it("reports explicit secret files and configured patterns", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "gha-security-checks-"));
    mkdirSync(join(cwd, "src"));
    writeFileSync(join(cwd, ".env"), "TOKEN=abc\n", "utf8");
    writeFileSync(
      join(cwd, "src", "config.php"),
      "api_key = \"12345678901234567890\";\n",
      "utf8"
    );

    const config = loadConfig({ cwd });
    const scanner = new SecretScanner();
    const findings = await scanner.scan({ cwd, config, toolRunner });

    expect(findings.some((finding) => finding.id.startsWith("secret.file."))).toBe(true);
    expect(findings.some((finding) => finding.id.startsWith("secret.pattern."))).toBe(true);
  });
});
