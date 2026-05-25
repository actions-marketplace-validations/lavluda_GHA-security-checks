# GHA Security Checks

Reusable security audit checks for GitHub Actions and CI workflows.

The project is built as a TypeScript library, CLI, JavaScript action, and Docker action. The default mode is `audit`, which reports findings without failing CI.

## MVP Checks

- PHP Composer vulnerabilities via `composer audit`
- PHP Composer outdated and abandoned packages
- OSV-Scanner vulnerability results when `osv-scanner` is available
- Secret and sensitive-file checks
- GitHub Actions workflow hardening checks
- JSON, Markdown, and SARIF reports
- Pull request comment, job summary, and annotations

## JavaScript Action

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
  security-events: write

steps:
  - uses: actions/checkout@v4
  - uses: lavluda/GHA-security-checks@v1
    with:
      mode: audit
      comment: true
      summary: true
      annotations: true
```

## Docker Action

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: lavluda/GHA-security-checks/docker@v1
    with:
      mode: audit
```

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

The JavaScript action expects external tools such as Composer and OSV-Scanner to be available on the runner. The Docker action includes Composer and OSV-Scanner.
