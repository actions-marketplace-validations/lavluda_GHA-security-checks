import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { NpmAuditScanner } from "../src/scanners/node/npm-audit.js";
import { NpmOutdatedScanner } from "../src/scanners/node/npm-outdated.js";
import type { ToolRunner } from "../src/integrations/tool-runner.js";

describe("Node npm scanners", () => {
  it("reports npm audit vulnerabilities", async () => {
    const cwd = await createNodeProject();
    const toolRunner: ToolRunner = {
      async run(command, args) {
        return {
          command,
          args,
          exitCode: 1,
          stdout: JSON.stringify({
            vulnerabilities: {
              lodash: {
                name: "lodash",
                severity: "high",
                range: "<4.17.21",
                via: [
                  {
                    title: "Command Injection in lodash",
                    severity: "high",
                    range: "<4.17.21",
                    url: "https://github.com/advisories/GHSA-test"
                  }
                ],
                fixAvailable: {
                  name: "lodash",
                  version: "4.17.21",
                  isSemVerMajor: false
                }
              }
            }
          }),
          stderr: ""
        };
      }
    };

    const config = loadConfig({ cwd });
    const findings = await new NpmAuditScanner().scan({ cwd, config, toolRunner });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.id).toBe("npm.audit.lodash");
    expect(findings[0]?.severity).toBe("high");
    expect(findings[0]?.fixedVersion).toBe("4.17.21");
  });

  it("reports outdated npm packages", async () => {
    const cwd = await createNodeProject();
    const toolRunner: ToolRunner = {
      async run(command, args) {
        return {
          command,
          args,
          exitCode: 1,
          stdout: JSON.stringify({
            express: {
              current: "4.18.0",
              wanted: "4.18.3",
              latest: "5.1.0",
              dependent: "app",
              type: "dependencies"
            }
          }),
          stderr: ""
        };
      }
    };

    const config = loadConfig({ cwd });
    const findings = await new NpmOutdatedScanner().scan({ cwd, config, toolRunner });

    expect(findings).toHaveLength(1);
    expect(findings[0]?.id).toBe("npm.outdated.express");
    expect(findings[0]?.severity).toBe("medium");
    expect(findings[0]?.installedVersion).toBe("4.18.0");
    expect(findings[0]?.fixedVersion).toBe("5.1.0");
  });
});

async function createNodeProject(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "gha-security-checks-node-"));
  mkdirSync(cwd, { recursive: true });
  writeFileSync(join(cwd, "package.json"), JSON.stringify({ name: "app" }), "utf8");
  return cwd;
}
