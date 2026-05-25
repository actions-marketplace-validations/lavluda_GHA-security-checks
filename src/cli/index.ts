#!/usr/bin/env node
import { Command } from "commander";
import { runSecurityCheck, type PolicyMode } from "../index.js";

const program = new Command();

program
  .name("gha-security-checks")
  .description("Run security audit checks for GitHub Actions and CI workflows.")
  .option("-c, --config <path>", "Path to a security check config file")
  .option("--cwd <path>", "Repository root to scan", process.cwd())
  .option(
    "--mode <mode>",
    "Policy mode: audit, warn, fail-on-high, fail-on-critical, strict, custom"
  )
  .option("--no-json", "Disable JSON report output")
  .option("--no-markdown", "Disable Markdown report output")
  .option("--no-sarif", "Disable SARIF report output")
  .option("--json-file <path>", "JSON report path")
  .option("--markdown-file <path>", "Markdown report path")
  .option("--sarif-file <path>", "SARIF report path")
  .action(async (options) => {
    const outputs = {
      json: options.json === false ? false : options.jsonFile,
      markdown: options.markdown === false ? false : options.markdownFile,
      sarif: options.sarif === false ? false : options.sarifFile
    };

    const { result, reports } = await runSecurityCheck({
      cwd: options.cwd,
      configPath: options.config,
      overrides: {
        mode: options.mode as PolicyMode | undefined,
        outputs
      }
    });

    console.log(`Security audit completed with ${result.summary.total} finding(s).`);
    console.log(`Mode: ${result.mode}`);
    console.log(`Status: ${result.failed ? "failed" : "passed"}`);

    for (const [kind, path] of Object.entries(reports)) {
      console.log(`${kind}: ${path}`);
    }

    if (result.failed) {
      process.exitCode = 1;
    }
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
