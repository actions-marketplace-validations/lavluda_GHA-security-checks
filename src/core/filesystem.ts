import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface WalkOptions {
  root: string;
  exclude: string[];
  maxFileBytes?: number;
}

export function hasFile(root: string, file: string): boolean {
  return existsSync(join(root, file));
}

export function listFiles(options: WalkOptions): string[] {
  const files: string[] = [];
  const excluded = new Set(options.exclude);

  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (excluded.has(entry.name)) {
        continue;
      }

      const absolute = join(directory, entry.name);
      const repoRelative = relative(options.root, absolute);

      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (options.maxFileBytes !== undefined && statSync(absolute).size > options.maxFileBytes) {
        continue;
      }

      files.push(repoRelative);
    }
  }

  if (existsSync(options.root)) {
    walk(options.root);
  }

  return files;
}

export function listWorkflowFiles(root: string, workflowDir: string): string[] {
  const absolute = join(root, workflowDir);
  if (!existsSync(absolute)) {
    return [];
  }

  return listFiles({
    root,
    exclude: [],
    maxFileBytes: 512 * 1024
  }).filter((file) => {
    if (!file.startsWith(`${workflowDir}/`)) {
      return false;
    }
    return file.endsWith(".yml") || file.endsWith(".yaml");
  });
}
