import { hasFile } from "../../core/filesystem.js";
import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";

interface NpmOutdatedPackage {
  current?: string;
  wanted?: string;
  latest?: string;
  dependent?: string;
  type?: string;
}

export class NpmOutdatedScanner implements Scanner {
  readonly name = "npm-outdated";

  async scan(context: ScannerContext): Promise<Finding[]> {
    if (!context.config.scanners.node || !context.config.node.npmOutdated) {
      return [];
    }

    if (!hasFile(context.cwd, "package.json")) {
      return [];
    }

    // In diff mode, skip if no Node manifest was changed
    if (context.changedFiles !== undefined) {
      const manifests = ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
      if (!manifests.some((m) => context.changedFiles!.has(m))) {
        return [];
      }
    }

    const result = await context.toolRunner.run(
      context.config.tools.npm,
      ["outdated", "--json"],
      { cwd: context.cwd }
    );

    if (result.exitCode === 127) {
      return [
        {
          id: "tooling.npm.missing",
          title: "npm is not available",
          description: "npm outdated checks were skipped because the configured npm command was not found.",
          category: "tooling",
          severity: "info",
          scanner: this.name,
          status: "skipped"
        }
      ];
    }

    const parsed = parseJson<Record<string, NpmOutdatedPackage>>(result.stdout);
    if (!parsed) {
      return [];
    }

    return Object.entries(parsed)
      .filter(([, pkg]) => pkg.current && pkg.latest && pkg.current !== pkg.latest)
      .map(([packageName, pkg]) => ({
        id: `npm.outdated.${packageName}`,
        title: `Outdated npm package: ${packageName}`,
        description: `${packageName} is installed at ${pkg.current} and latest is ${pkg.latest}.`,
        category: "outdated-dependency" as const,
        severity: normalizeOutdatedSeverity(pkg),
        scanner: this.name,
        status: "open" as const,
        packageName,
        installedVersion: pkg.current,
        fixedVersion: pkg.latest,
        metadata: {
          wanted: pkg.wanted,
          dependent: pkg.dependent,
          type: pkg.type
        }
      }));
  }
}

function normalizeOutdatedSeverity(pkg: NpmOutdatedPackage): Finding["severity"] {
  if (pkg.current && pkg.wanted && pkg.current !== pkg.wanted) {
    return "medium";
  }
  return "low";
}

function parseJson<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}
