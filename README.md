# GHA Security Checks

Reusable security audit checks for GitHub Actions and CI workflows.

The project is built as a TypeScript library, CLI, and Docker-backed GitHub Action. The default mode is `audit`, which reports findings without failing CI.

## MVP Checks

- PHP Composer vulnerabilities via `composer audit`
- PHP Composer outdated and abandoned packages
- OSV-Scanner vulnerability results when `osv-scanner` is available
- Secret and sensitive-file checks
- GitHub Actions workflow hardening checks
- JSON, Markdown, and SARIF reports
- Pull request comment, job summary, and annotations

## GitHub Action

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
  security-events: write

steps:
  - uses: actions/checkout@v4
  - uses: lavluda/GHA-security-checks@v0.1.1
    with:
      mode: audit
      comment: true
      summary: true
      annotations: true
```

The action pulls the published GHCR image for the release version, so consumer workflows do not rebuild the container on every run. Composer and OSV-Scanner are included in the container.

## CLI

```bash
npx gha-security-checks --mode audit
```

## Policy Modes

- `audit`: report only
- `warn`: report and annotate only
- `fail-on-high`: fail on high or critical findings
- `fail-on-critical`: fail only on critical findings
- `strict`: fail on medium or higher findings, secrets, and workflow risks
- `custom`: use `failOn` settings from config

## Config

Copy `gha-security-checks.example.yml` to one of:

- `gha-security-checks.yml`
- `gha-security-checks.yaml`
- `.gha-security-checks.yml`
- `.gha-security-checks.yaml`

Example:

```yaml
mode: audit

scanners:
  php: true
  osv: true
  secrets: true
  githubActions: true

outputs:
  json: security-results.json
  markdown: security-summary.md
  sarif: security-results.sarif
  githubSummary: true
  prComment: true
  annotations: true
```

## Notes

Publish the matching Docker image before publishing a release. For example, release `v0.1.1` expects `ghcr.io/lavluda/gha-security-checks:0.1.1` to exist.
