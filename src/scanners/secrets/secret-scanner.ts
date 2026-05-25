import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listFiles } from "../../core/filesystem.js";
import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";

export class SecretScanner implements Scanner {
  readonly name = "secret-scanner";

  async scan(context: ScannerContext): Promise<Finding[]> {
    if (!context.config.scanners.secrets) {
      return [];
    }

    const patterns = context.config.secrets.patterns.map((pattern) => ({
      ...pattern,
      expression: new RegExp(pattern.regex, "gi")
    }));

    const files = listFiles({
      root: context.cwd,
      exclude: context.config.secrets.exclude,
      maxFileBytes: context.config.secrets.maxFileBytes
    });

    const findings: Finding[] = [];

    for (const file of files) {
      if (isExplicitSecretFile(file)) {
        findings.push({
          id: `secret.file.${file}`,
          title: `Sensitive file committed: ${file}`,
          description: "A file commonly used for local secrets is present in the repository.",
          category: "secret",
          severity: "high",
          scanner: this.name,
          status: "open",
          location: { file }
        });
      }

      const content = safeRead(join(context.cwd, file));
      if (content === undefined || isProbablyBinary(content)) {
        continue;
      }

      for (const pattern of patterns) {
        pattern.expression.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.expression.exec(content)) !== null) {
          findings.push({
            id: `secret.pattern.${pattern.id}.${file}.${lineForIndex(content, match.index)}`,
            title: pattern.label,
            description:
              "Potential secret material was found. Rotate the value if it has ever been committed.",
            category: "secret",
            severity: pattern.severity,
            scanner: this.name,
            status: "open",
            location: {
              file,
              startLine: lineForIndex(content, match.index)
            },
            metadata: {
              pattern: pattern.id,
              matchPreview: redact(match[0])
            }
          });
        }
      }
    }

    return findings;
  }
}

function isExplicitSecretFile(file: string): boolean {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  const name = normalized.split("/").at(-1);
  return (
    name === ".env" ||
    name === ".env.local" ||
    name === ".npmrc" ||
    name === "id_rsa" ||
    name === "id_dsa" ||
    name === "id_ecdsa" ||
    name === "id_ed25519"
  );
}

function safeRead(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

function isProbablyBinary(value: string): boolean {
  return value.includes("\u0000");
}

function lineForIndex(content: string, index: number): number {
  return content.slice(0, index).split(/\r?\n/).length;
}

function redact(value: string): string {
  if (value.length <= 8) {
    return "[redacted]";
  }
  return `${value.slice(0, 4)}...[redacted]`;
}
