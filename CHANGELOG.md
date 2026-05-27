# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-05-27

### Added
- `diff` mode: scanners limit scope to changed files only (secret scanner, workflow hardening, dependency scanners all filter by `changedFiles`)
- `changedFiles` context field on `ScannerContext` — populated from `GITHUB_BASE_REF` or `git merge-base HEAD origin/main` in diff mode
- `baseline` config option: suppress pre-existing findings; `baseline update` CLI command writes the current findings to a baseline file
- `gha-security-checks baseline update` — runs a full scan and writes all open findings to baseline
- `gha-security-checks suppress <id> --reason` and `suppressions add/list/remove` CLI subcommands
- JS action variant at `js/action.yml` (node20, no Docker pull) for repos with toolchains pre-installed
- PR comment delta view: **New** / **Fixed since last run** / **Still open** sections; finding IDs persisted in HTML comment for cross-run diffing; 60KB truncation guard
- `src/core/diff.ts`, `src/core/baseline.ts`, `src/core/config-editor.ts` — new core modules
- Release workflow now builds and commits `dist-action/` bundle so JS action always matches the tag
- 14 new tests (baseline round-trips, diff-mode scanner filtering, scanner context propagation) — 68 total

## [0.3.0] - 2026-05-27

### Added
- CI workflow: lint, typecheck, vitest, and Docker smoke test on every PR and push to main
- Release workflow: tag-driven, atomic — builds multi-arch GHCR image, publishes to npm, creates GitHub release
- Self-audit workflow: dogfoods the action against this repo on PRs, pushes, and weekly schedule; uploads SARIF to GitHub Security
- `action.yml` now uses `__VERSION__` placeholder substituted at release time (prevents version drift between package.json and the image tag)
- `action-yml-guard` CI job rejects any push to main where `action.yml` has a pinned tag instead of the placeholder
- Dockerfile base images pinned by digest for reproducible builds
- `.nvmrc` pinning Node 24
- `CHANGELOG.md`, `RELEASING.md`, `CONTRIBUTING.md`
- `--version` CLI flag with embedded build SHA
- Version log line at the start of every action run
- `scripts/generate-version.mjs` prebuild script generating `src/core/version.ts`
- Test coverage: config schema, reporter round-trips (JSON / Markdown / SARIF), CLI e2e
- Vitest coverage reporting with threshold gates

## [0.2.0] - 2026-05-25

### Added
- Node.js npm vulnerability scanner (`npm audit`)
- Node.js outdated package scanner (`npm outdated`)
- Multi-architecture Docker image (`linux/amd64`, `linux/arm64`)

### Fixed
- Scoped workflow permission handling (e.g. `pull-requests: write` no longer triggers write-all warning)
- Action metadata parsing for CLI arguments

## [0.1.0] - 2026-05-24

### Added
- PHP Composer vulnerability scanner (`composer audit`)
- PHP outdated and abandoned package detection (`composer outdated`)
- OSV-Scanner integration (when binary is present)
- Secret and sensitive-file scanner with configurable regex patterns
- GitHub Actions workflow hardening scanner
- JSON, Markdown, and SARIF reporters
- Pull request comment, job summary, and annotation outputs
- Policy modes: `audit`, `warn`, `fail-on-high`, `fail-on-critical`, `strict`, `custom`
- YAML config file with Zod schema validation
- CLI (`npx gha-security-checks`)
- Docker-backed GitHub Action published to GitHub Marketplace

[Unreleased]: https://github.com/lavluda/GHA-security-checks/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/lavluda/GHA-security-checks/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/lavluda/GHA-security-checks/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/lavluda/GHA-security-checks/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/lavluda/GHA-security-checks/releases/tag/v0.1.0
