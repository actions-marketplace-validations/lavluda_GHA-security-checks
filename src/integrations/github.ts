import * as core from "@actions/core";
import * as github from "@actions/github";
import type { Finding, ScanResult } from "../core/finding.js";
import { renderMarkdownReport } from "../reporters/markdown.js";

const prCommentMarker = "<!-- gha-security-checks-report -->";

export interface GitHubReportOptions {
  token?: string;
  prComment: boolean;
  jobSummary: boolean;
  annotations: boolean;
}

export async function publishGitHubReport(
  result: ScanResult,
  options: GitHubReportOptions
): Promise<void> {
  if (options.annotations) {
    annotateFindings(result.findings);
  }

  if (options.jobSummary) {
    await core.summary.addRaw(renderMarkdownReport(result)).write();
  }

  if (!options.prComment || !options.token) {
    return;
  }

  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return;
  }

  const octokit = github.getOctokit(options.token);
  const owner = github.context.repo.owner;
  const repo = github.context.repo.repo;
  const issueNumber = pullRequest.number;
  const body = `${prCommentMarker}\n${renderMarkdownReport(result)}`;

  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100
  });

  const existing = comments.data.find((comment) => comment.body?.includes(prCommentMarker));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body
    });
    return;
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body
  });
}

function annotateFindings(findings: Finding[]): void {
  for (const finding of findings) {
    const annotation = finding.location
      ? {
          file: finding.location.file,
          startLine: finding.location.startLine,
          endLine: finding.location.endLine
        }
      : undefined;

    const message = `${finding.title}: ${finding.description}`;

    if (finding.severity === "critical" || finding.severity === "high") {
      core.error(message, annotation);
    } else if (finding.severity === "medium" || finding.severity === "low") {
      core.warning(message, annotation);
    } else {
      core.notice(message, annotation);
    }
  }
}
