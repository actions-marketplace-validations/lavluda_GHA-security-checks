import type { Scanner } from "./scanner.js";
import type { SecurityCheckConfig } from "./config.js";
import { ComposerAuditScanner } from "../scanners/php/composer-audit.js";
import { ComposerOutdatedScanner } from "../scanners/php/composer-outdated.js";
import { NpmAuditScanner } from "../scanners/node/npm-audit.js";
import { NpmOutdatedScanner } from "../scanners/node/npm-outdated.js";
import { OsvScanner } from "../scanners/osv/osv-scanner.js";
import { SecretScanner } from "../scanners/secrets/secret-scanner.js";
import { WorkflowHardeningScanner } from "../scanners/github-actions/workflow-hardening.js";

export function createScanners(config: SecurityCheckConfig): Scanner[] {
  const scanners: Scanner[] = [];

  if (config.scanners.php) {
    scanners.push(new ComposerAuditScanner(), new ComposerOutdatedScanner());
  }

  if (config.scanners.node) {
    scanners.push(new NpmAuditScanner(), new NpmOutdatedScanner());
  }

  if (config.scanners.osv) {
    scanners.push(new OsvScanner());
  }

  if (config.scanners.secrets) {
    scanners.push(new SecretScanner());
  }

  if (config.scanners.githubActions) {
    scanners.push(new WorkflowHardeningScanner());
  }

  return scanners;
}
