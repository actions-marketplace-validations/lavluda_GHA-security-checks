import { writeFileSync } from "node:fs";
import type { ScanResult } from "../core/finding.js";

export function writeJsonReport(result: ScanResult, path: string): void {
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
