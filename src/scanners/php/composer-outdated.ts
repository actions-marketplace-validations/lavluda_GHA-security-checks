import { hasFile } from "../../core/filesystem.js";
import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";

interface ComposerOutdatedPackage {
  name?: string;
  version?: string;
  latest?: string;
  "latest-status"?: string;
  description?: string;
}

interface ComposerOutdatedJson {
  installed?: ComposerOutdatedPackage[];
}

export class ComposerOutdatedScanner implements Scanner {
  readonly name = "composer-outdated";

  async scan(context: ScannerContext): Promise<Finding[]> {
    if (!context.config.scanners.php || !context.config.php.composerOutdated) {
      return [];
    }

    if (!hasFile(context.cwd, "composer.json")) {
      return [];
    }

    // In diff mode, skip if no PHP manifest was changed
    if (context.changedFiles !== undefined) {
      const manifests = ["composer.json", "composer.lock"];
      if (!manifests.some((m) => context.changedFiles!.has(m))) {
        return [];
      }
    }

    const result = await context.toolRunner.run(
      context.config.tools.composer,
      ["outdated", "--format=json", "--no-interaction"],
      { cwd: context.cwd }
    );

    if (result.exitCode === 127) {
      return [
        {
          id: "tooling.composer.missing",
          title: "Composer is not available",
          description:
            "Composer outdated checks were skipped because the configured composer command was not found.",
          category: "tooling",
          severity: "info",
          scanner: this.name,
          status: "skipped"
        }
      ];
    }

    const parsed = parseJson<ComposerOutdatedJson>(result.stdout);
    if (!parsed) {
      return [];
    }

    return (parsed.installed ?? [])
      .filter((pkg) => pkg.name && pkg.version && pkg.latest && pkg.version !== pkg.latest)
      .map((pkg) => ({
        id: `composer.outdated.${pkg.name}`,
        title: `Outdated Composer package: ${pkg.name}`,
        description: `${pkg.name} is installed at ${pkg.version} and latest is ${pkg.latest}.`,
        category: "outdated-dependency" as const,
        severity: normalizeLatestStatus(pkg["latest-status"]),
        scanner: this.name,
        status: "open" as const,
        packageName: pkg.name,
        installedVersion: pkg.version,
        fixedVersion: pkg.latest,
        metadata: {
          latestStatus: pkg["latest-status"],
          description: pkg.description
        }
      }));
  }
}

function normalizeLatestStatus(status?: string): Finding["severity"] {
  if (status === "semver-safe-update") {
    return "low";
  }
  if (status === "update-possible") {
    return "medium";
  }
  return "info";
}

function parseJson<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}
