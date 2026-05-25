import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { evaluatePolicy } from "../src/core/policy-engine.js";
import type { Finding } from "../src/core/finding.js";

const finding: Finding = {
  id: "test.high",
  title: "High finding",
  description: "A high severity finding.",
  category: "vulnerability",
  severity: "high",
  scanner: "test",
  status: "open"
};

describe("evaluatePolicy", () => {
  it("does not fail in audit mode", () => {
    const config = loadConfig({ cwd: process.cwd(), overrides: { mode: "audit" } });
    const decision = evaluatePolicy([finding], config);
    expect(decision.failed).toBe(false);
  });

  it("fails on high findings in fail-on-high mode", () => {
    const config = loadConfig({ cwd: process.cwd(), overrides: { mode: "fail-on-high" } });
    const decision = evaluatePolicy([finding], config);
    expect(decision.failed).toBe(true);
  });
});
