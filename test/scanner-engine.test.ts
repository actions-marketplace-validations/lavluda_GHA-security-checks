import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { ScannerEngine } from "../src/core/scanner-engine.js";
import type { Scanner } from "../src/core/scanner.js";
import type { ToolRunner } from "../src/integrations/tool-runner.js";

const toolRunner: ToolRunner = {
  async run(command, args) {
    return { command, args, exitCode: 0, stdout: "", stderr: "" };
  }
};

describe("ScannerEngine", () => {
  it("turns scanner errors into skipped tooling findings", async () => {
    const scanner: Scanner = {
      name: "broken-scanner",
      async scan() {
        throw new Error("boom");
      }
    };
    const config = loadConfig({ cwd: process.cwd() });
    const engine = new ScannerEngine([scanner]);

    const result = await engine.run({ cwd: process.cwd(), config, toolRunner });

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.category).toBe("tooling");
    expect(result.findings[0]?.status).toBe("skipped");
  });
});
