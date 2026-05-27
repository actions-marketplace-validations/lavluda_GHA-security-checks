import { createSummary, type ScanResult } from "./finding.js";
import { evaluatePolicy } from "./policy-engine.js";
import { loadBaseline, applyBaseline } from "./baseline.js";
import type { Scanner, ScannerContext } from "./scanner.js";

export class ScannerEngine {
  constructor(private readonly scanners: Scanner[]) {}

  async run(context: ScannerContext): Promise<ScanResult> {
    const rawFindings = [];

    for (const scanner of this.scanners) {
      try {
        rawFindings.push(...(await scanner.scan(context)));
      } catch (error) {
        rawFindings.push({
          id: `tooling.${scanner.name}.failed`,
          title: `${scanner.name} failed`,
          description: error instanceof Error ? error.message : String(error),
          category: "tooling" as const,
          severity: "info" as const,
          scanner: scanner.name,
          status: "skipped" as const
        });
      }
    }

    // Apply baseline suppression when configured
    const findings = context.config.baseline
      ? applyBaseline(rawFindings, loadBaseline(context.cwd, context.config.baseline))
      : rawFindings;

    const decision = evaluatePolicy(findings, context.config);

    return {
      findings,
      summary: createSummary(findings),
      failed: decision.failed,
      mode: context.config.mode,
      generatedAt: new Date().toISOString()
    };
  }
}
