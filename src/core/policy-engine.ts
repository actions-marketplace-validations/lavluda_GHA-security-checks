import type { Finding } from "./finding.js";
import { severityRank } from "./finding.js";
import type { SecurityCheckConfig } from "./config.js";

export interface PolicyDecision {
  failed: boolean;
  blockingFindings: Finding[];
}

export function evaluatePolicy(findings: Finding[], config: SecurityCheckConfig): PolicyDecision {
  if (config.mode === "audit" || config.mode === "warn") {
    return { failed: false, blockingFindings: [] };
  }

  const blockingFindings = findings.filter((finding) => {
    if (finding.status !== "open") {
      return false;
    }

    if (config.mode === "fail-on-critical") {
      return finding.severity === "critical";
    }

    if (config.mode === "fail-on-high") {
      return severityRank[finding.severity] >= severityRank.high;
    }

    if (config.mode === "strict") {
      return (
        severityRank[finding.severity] >= severityRank.medium ||
        finding.category === "secret" ||
        finding.category === "workflow-risk"
      );
    }

    if (config.mode === "custom") {
      const matchesSeverity =
        severityRank[finding.severity] >= severityRank[config.failOn.severity];
      const categoryConfigured = config.failOn.categories.length > 0;
      const matchesCategory =
        !categoryConfigured || config.failOn.categories.includes(finding.category);
      return matchesSeverity && matchesCategory;
    }

    return false;
  });

  return {
    failed: blockingFindings.length > 0,
    blockingFindings
  };
}
