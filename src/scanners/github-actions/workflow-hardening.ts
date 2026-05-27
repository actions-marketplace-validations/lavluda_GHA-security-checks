import { readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { listWorkflowFiles } from "../../core/filesystem.js";
import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";

interface WorkflowJob {
  permissions?: unknown;
  steps?: Array<Record<string, unknown>>;
}

interface WorkflowDocument {
  on?: unknown;
  permissions?: unknown;
  jobs?: Record<string, WorkflowJob>;
}

const fullShaPattern = /^[a-f0-9]{40}$/i;

export class WorkflowHardeningScanner implements Scanner {
  readonly name = "github-actions-hardening";

  async scan(context: ScannerContext): Promise<Finding[]> {
    if (!context.config.scanners.githubActions) {
      return [];
    }

    const allFiles = listWorkflowFiles(context.cwd, context.config.githubActions.workflowDir);

    // In diff mode, only check workflow files that were changed
    const files =
      context.changedFiles !== undefined
        ? allFiles.filter((f) => context.changedFiles!.has(f))
        : allFiles;

    const findings: Finding[] = [];

    for (const file of files) {
      const raw = readFileSync(join(context.cwd, file), "utf8");
      const workflow = YAML.parse(raw) as WorkflowDocument | null;
      if (!workflow || typeof workflow !== "object") {
        continue;
      }

      findings.push(...checkWorkflowTriggers(file, workflow));
      findings.push(...checkPermissions(file, workflow));
      findings.push(...checkSteps(file, workflow, context.config.githubActions.allowUnpinnedOfficialActions));
    }

    return findings;
  }
}

function checkWorkflowTriggers(file: string, workflow: WorkflowDocument): Finding[] {
  const events = normalizeEvents(workflow.on);
  if (!events.includes("pull_request_target")) {
    return [];
  }

  return [
    {
      id: `workflow.pull-request-target.${file}`,
      title: "Workflow uses pull_request_target",
      description:
        "pull_request_target runs with elevated repository context. Review checkout and script steps carefully.",
      category: "workflow-risk",
      severity: "high",
      scanner: "github-actions-hardening",
      status: "open",
      location: { file }
    }
  ];
}

function checkPermissions(file: string, workflow: WorkflowDocument): Finding[] {
  const findings: Finding[] = [];

  if (workflow.permissions === undefined) {
    findings.push({
      id: `workflow.permissions.missing.${file}`,
      title: "Workflow does not set top-level permissions",
      description: "Set least-privilege GITHUB_TOKEN permissions at workflow or job level.",
      category: "workflow-risk",
      severity: "medium",
      scanner: "github-actions-hardening",
      status: "open",
      location: { file }
    });
  }

  if (hasWriteAllPermissions(workflow.permissions)) {
    findings.push({
      id: `workflow.permissions.write-all.${file}`,
      title: "Workflow grants broad write permissions",
      description: "Avoid write-all permissions unless every permission is required.",
      category: "workflow-risk",
      severity: "high",
      scanner: "github-actions-hardening",
      status: "open",
      location: { file }
    });
  }

  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    if (hasWriteAllPermissions(job.permissions)) {
      findings.push({
        id: `workflow.job-permissions.write-all.${file}.${jobName}`,
        title: `Job grants broad write permissions: ${jobName}`,
        description: "Avoid write-all job permissions unless every permission is required.",
        category: "workflow-risk",
        severity: "high",
        scanner: "github-actions-hardening",
        status: "open",
        location: { file }
      });
    }
  }

  return findings;
}

function checkSteps(file: string, workflow: WorkflowDocument, allowOfficialTags: boolean): Finding[] {
  const findings: Finding[] = [];

  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    for (const [index, step] of (job.steps ?? []).entries()) {
      const uses = typeof step.uses === "string" ? step.uses : undefined;
      if (uses && shouldFlagActionRef(uses, allowOfficialTags)) {
        findings.push({
          id: `workflow.action-unpinned.${file}.${jobName}.${index}`,
          title: `Action is not pinned to a full commit SHA: ${uses}`,
          description:
            "Pin third-party actions to a full commit SHA to reduce supply-chain risk.",
          category: "workflow-risk",
          severity: "medium",
          scanner: "github-actions-hardening",
          status: "open",
          location: { file }
        });
      }

      const run = typeof step.run === "string" ? step.run : undefined;
      if (run && containsUntrustedGithubExpression(run)) {
        findings.push({
          id: `workflow.untrusted-expression.${file}.${jobName}.${index}`,
          title: "Run step references untrusted pull request data",
          description:
            "Avoid injecting untrusted GitHub context directly into shell commands.",
          category: "workflow-risk",
          severity: "high",
          scanner: "github-actions-hardening",
          status: "open",
          location: { file }
        });
      }
    }
  }

  return findings;
}

function normalizeEvents(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((event): event is string => typeof event === "string");
  }
  if (value && typeof value === "object") {
    return Object.keys(value);
  }
  return [];
}

function hasWriteAllPermissions(value: unknown): boolean {
  return value === "write-all";
}

function shouldFlagActionRef(uses: string, allowOfficialTags: boolean): boolean {
  if (uses.startsWith("./") || uses.startsWith("docker://")) {
    return false;
  }

  const [ownerRepo, ref] = uses.split("@");
  if (!ref) {
    return true;
  }

  if (fullShaPattern.test(ref)) {
    return false;
  }

  if (allowOfficialTags && ownerRepo.startsWith("actions/")) {
    return false;
  }

  return true;
}

function containsUntrustedGithubExpression(value: string): boolean {
  return /\$\{\{\s*github\.event\.pull_request\.(title|body|head\.ref|head\.label)/.test(value);
}
