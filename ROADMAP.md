# GHA Security Checks — Roadmap

Forward-looking implementation plan for v0.3.0 → v0.6.0. Each release has a single theme. Treat tasks within a release as one PR each unless noted.

This document is a handoff for an implementing agent. The agent does **not** have prior conversation context — every task below should be self-contained: it states the goal, the files involved, the steps, and the acceptance criteria.

---

## Conventions for the implementing agent

- Run `npm run check && npm run lint && npm run test` after each task. All must pass before commit.
- Do not commit generated artifacts in `dist/`, `dist-action/`, `security-results*`, or `security-summary*` (already in `.gitignore`).
- Keep `CHANGELOG.md` (created in v0.3.0) up to date with one entry per task under `## Unreleased`.
- Never bump `package.json` version mid-release — only the release task at the end of each milestone does that.
- Prefer Edit over Write for existing files. Do not introduce new top-level dependencies without flagging the addition in the PR description.
- Reference: project is a TypeScript library + CLI + Docker-backed GitHub Action. Entry points: [src/index.ts](src/index.ts), [src/cli/index.ts](src/cli/index.ts), [src/action/main.ts](src/action/main.ts). Action metadata at [action.yml](action.yml). Image built by [Dockerfile](Dockerfile).

---

## v0.3.0 — Foundation: ship reliably

**Theme:** make releases reproducible, documented, and CI-verified before adding new functionality.

### Task 0.3.1 — Restore CI workflow

**Why:** `.github/workflows/` is currently empty despite commits implying CI exists. Without CI we have no signal that any future change is safe.

**Files to create:**
- `.github/workflows/ci.yml`

**Steps:**
1. Workflow triggers: `pull_request` (any branch) + `push` to `main`.
2. Jobs:
   - `lint-and-test`: ubuntu-latest, Node 24, steps: `actions/checkout@v4` → `actions/setup-node@v4` with `node-version-file: .nvmrc` (create `.nvmrc` with `24` if missing) and `cache: npm` → `npm ci` → `npm run lint` → `npm run check` → `npm run test`.
   - `docker-smoke`: ubuntu-latest, steps: `actions/checkout@v4` → `docker/setup-buildx-action@v3` → `docker/build-push-action@v6` with `load: true, tags: gha-security-checks:smoke, push: false`. Then `docker run --rm gha-security-checks:smoke --help` should exit 0.
3. Use `permissions: { contents: read }` at workflow level.
4. Pin all third-party actions to a commit SHA (with a comment showing the tag).

**Acceptance:** workflow runs green on a sample PR. `docker-smoke` completes in under 5 minutes on a clean cache.

---

### Task 0.3.2 — Release workflow (tag-driven, atomic)

**Why:** the current process requires hand-editing the image tag in [action.yml:72](action.yml:72) and remembering to publish the image before tagging. That's fragile. Make tag push do everything in one atomic flow.

**Files to create:**
- `.github/workflows/release.yml`

**Steps:**
1. Trigger: `push` of tags matching `v*.*.*`.
2. Single job, ubuntu-latest, `permissions: { contents: write, packages: write, id-token: write }`.
3. Steps in order:
   1. Checkout with `fetch-depth: 0`.
   2. Setup Node 24 with `cache: npm`.
   3. `npm ci`.
   4. `npm run lint && npm run check && npm run test` — fail the release if any check fails.
   5. Extract version: `VERSION="${GITHUB_REF_NAME#v}"`. Sanity check it matches `package.json`'s `version` field; if not, fail with a clear message.
   6. Log in to GHCR with `docker/login-action@v3`, using `GITHUB_TOKEN`.
   7. `docker/setup-qemu-action@v3` + `docker/setup-buildx-action@v3`.
   8. `docker/build-push-action@v6` with `platforms: linux/amd64,linux/arm64`, `push: true`, `tags: ghcr.io/lavluda/gha-security-checks:${VERSION},ghcr.io/lavluda/gha-security-checks:latest`, `provenance: true`, `sbom: true`, `cache-from: type=gha`, `cache-to: type=gha,mode=max`.
   9. `npm run build` then `npm publish --access public` (requires `NPM_TOKEN` secret; document this in `RELEASING.md`).
   10. `gh release create "v${VERSION}" --title "v${VERSION}" --notes-from-tag` (or `--generate-notes` if no annotated tag).
4. If any step fails after the image push, the workflow must still surface the failure — do not silently continue.

**Acceptance:** pushing a test tag like `v0.3.0-rc.1` from a fork branch (or after dry-run with `act`) executes all steps. Multi-arch manifest visible at `ghcr.io/lavluda/gha-security-checks:0.3.0-rc.1`.

---

### Task 0.3.3 — Decouple action image tag from version

**Why:** [action.yml:72](action.yml:72) hardcodes `0.2.0`. Today every release requires editing both `package.json` and `action.yml`, easy to miss. The release workflow above can rewrite this at release time.

**Approach (pick one — recommended is A):**

**A. Substitute at release time.** Use a placeholder in `action.yml` and rewrite it in the release workflow:
1. Change [action.yml:72](action.yml:72) to `image: "docker://ghcr.io/lavluda/gha-security-checks:__VERSION__"`.
2. Add a step before `gh release create` in `release.yml` that does `sed -i "s/__VERSION__/${VERSION}/" action.yml`, commits the change on a release branch, and pushes the tag pointing at that commit. This is the same pattern `actions/checkout` uses with their "Update main version" workflow.
3. Add a guard in `ci.yml` that fails if `action.yml` contains anything other than `__VERSION__` for the image tag (prevents accidental commits of a pinned tag on `main`).

**B. Pin to `:latest` and rely on consumers pinning the action ref.** Simpler but riskier (latest can drift). Don't pick this unless A is blocked.

**Acceptance:** approach A — `main` always has `__VERSION__`; pushing `v0.3.0` produces a release commit with `:0.3.0`. Consumers using `@v0.3.0` get the matching image.

---

### Task 0.3.4 — Self-audit workflow (dogfood)

**Why:** the action should detect regressions in itself. Also a live demo for users browsing the repo.

**Files to create:**
- `.github/workflows/self-audit.yml`

**Steps:**
1. Trigger: `pull_request`, `push` to `main`, and `schedule: cron: '0 6 * * 1'` (weekly Monday).
2. Job uses `lavluda/GHA-security-checks@<current-major>` against itself with `mode: warn` (don't block merges on self-findings until the policy is dialed in).
3. Upload SARIF: add a follow-up step `github/codeql-action/upload-sarif@v3` with `sarif_file: security-results.sarif`. Requires `permissions: { security-events: write, contents: read, pull-requests: write }`.
4. On scheduled runs, fail the job on `high` or above so weekly drift gets noticed.

**Acceptance:** PR run posts a comment + summary; SARIF appears under Security → Code scanning.

---

### Task 0.3.5 — Pin Dockerfile base image by digest

**Why:** [Dockerfile](Dockerfile) currently uses `node:24-bookworm-slim` (tag, not digest). A security tool should pin to digests so its own supply chain is reproducible.

**Steps:**
1. Resolve current digests:
   - `docker buildx imagetools inspect node:24-bookworm-slim --raw | grep digest` — pick the manifest list digest.
   - Same for `composer:2`.
2. Edit [Dockerfile](Dockerfile):
   - `FROM node:24-bookworm-slim@sha256:<digest> AS build`
   - `FROM composer:2@sha256:<digest> AS composer`
   - `FROM node:24-bookworm-slim@sha256:<same-digest>` for the runtime stage.
3. Add a comment above each `FROM` line noting the tag it corresponds to.
4. Document in `RELEASING.md` how to refresh these digests (one-line command).
5. Optionally add a monthly Renovate/Dependabot config to bump base image digests (defer to Renovate's Docker datasource — out of scope for this task if Renovate isn't already configured).

**Acceptance:** `docker build .` succeeds; output of `docker inspect <image> --format '{{.Config.Image}}'` references the digest.

---

### Task 0.3.6 — Documentation: RELEASING / CONTRIBUTING / CHANGELOG

**Why:** there's no place that documents how to cut a release, how to contribute, or what changed between versions.

**Files to create:**
- `CHANGELOG.md` — keep-a-changelog format. Start with `## Unreleased` and historic entries reconstructed from `git log v0.1.0..HEAD --oneline` (group as Added/Changed/Fixed).
- `RELEASING.md` — sections: prerequisites (NPM_TOKEN secret), step-by-step (bump `package.json`, update CHANGELOG, commit, tag `v$VERSION`, push tag, observe workflow), rollback (delete tag + GHCR image), digest refresh (from 0.3.5).
- `CONTRIBUTING.md` — local dev (`npm install`, `npm run build`, `npm test`), how to add a new scanner (pointer to [src/core/scanner.ts](src/core/scanner.ts) interface and [src/core/create-scanners.ts](src/core/create-scanners.ts) registration), code style (eslint config), PR checklist.

**Acceptance:** all three files exist and pass markdown lint if configured. `CHANGELOG.md` lists every change since v0.1.0.

---

### Task 0.3.7 — Test coverage expansion

**Why:** current vitest suite has 5 files in [test/](test/) and skips reporters, config loading, and end-to-end CLI behavior. Each gap is a place a regression can land silently.

**Files to create:**
- `test/config.test.ts` — covers [src/core/config.ts](src/core/config.ts):
  - default config when no file present
  - parses each candidate filename ([config.ts:7](src/core/config.ts:7))
  - overrides merge correctly (top-level + nested objects)
  - schema rejects invalid severity / category
  - `shouldFailForSeverity` ordering
- `test/json-reporter.test.ts`, `test/markdown-reporter.test.ts`, `test/sarif-reporter.test.ts` — for each reporter under [src/reporters/](src/reporters/):
  - given a fixed `ScanResult` with one finding per severity and category, the output matches a snapshot
  - SARIF: validate the output against the SARIF JSON schema (use the schema URL or vendor a local copy in `test/fixtures/`)
- `test/cli.e2e.test.ts` — spawn `node dist/cli/index.js --cwd test/fixtures/sample-repo --mode audit` after `npm run build` (use vitest `beforeAll` to build, or run against `tsx src/cli/index.ts`):
  - exits 0 in `audit` mode even with findings
  - exits 1 in `strict` mode when findings exist
  - writes the three report files at the configured paths
- `test/fixtures/sample-repo/` — minimal fixture with a known vulnerable `composer.json` (use a pinned old version of a public package known to have an advisory) and a file containing a fake AWS access key matching the regex at [config.ts:101](src/core/config.ts:101).

**Acceptance:** `npm run test` reports >70% line coverage on `src/core/` and `src/reporters/`. Add `vitest --coverage` config to `vitest.config.ts` and a coverage threshold gate.

---

### Task 0.3.8 — Add `--version` and embedded build metadata

**Why:** consumers debugging a failing run need to know exactly which build they're on. Today there's no way to tell.

**Steps:**
1. In `package.json`, add a `prebuild` script that writes `src/core/version.ts` with `export const VERSION = "<package.json version>"; export const COMMIT = "<git rev-parse HEAD or 'unknown'>"; export const BUILD_DATE = "<ISO>";`. The release workflow already runs `npm run build`, which will pick this up.
2. Add `src/core/version.ts` to `.gitignore` (it's generated).
3. Wire `--version` into the commander program in [src/cli/index.ts](src/cli/index.ts) via `.version(\`${VERSION} (${COMMIT})\`)`.
4. In [src/action/main.ts](src/action/main.ts), log `[gha-security-checks] v${VERSION} (${COMMIT})` at the top of `main()` so action logs always show the build.
5. Export `VERSION` from [src/index.ts](src/index.ts) for library consumers.

**Acceptance:** `npx gha-security-checks --version` prints `0.3.0 (<sha>)`. Action log line appears in every run.

---

### Task 0.3.9 — Release v0.3.0

Final task only, after 0.3.1–0.3.8 are merged.

1. Bump `package.json` `version` to `0.3.0`.
2. Move `## Unreleased` entries in `CHANGELOG.md` under `## [0.3.0] - <date>`.
3. Commit `chore: release v0.3.0`.
4. Tag `git tag -a v0.3.0 -m "v0.3.0"` and push. Let `release.yml` do the rest.
5. Verify: image exists at both `:0.3.0` and `:latest`, npm package shows 0.3.0, GitHub release page populated, action.yml on the release commit references `:0.3.0`.

---

## v0.4.0 — Faster PR feedback

**Theme:** make the action fast and quiet on PRs, especially for repos with lots of pre-existing findings.

### Task 0.4.1 — Diff-only mode

Add `mode: diff` (or `--diff` CLI flag). Behavior:
- Resolve base ref: `GITHUB_BASE_REF` if set, else `git merge-base HEAD origin/main`.
- `git diff --name-only $BASE...HEAD` → set of changed paths.
- Pass that set to scanners as `context.changedFiles` (extend [ScannerContext](src/core/scanner.ts)).
- Each scanner filters findings: secret scanner only walks changed files; workflow-hardening only re-checks changed workflows; dependency scanners only run if a manifest file (`composer.json`, `composer.lock`, `package.json`, `package-lock.json`) is in the set.
- Document a recommended pattern: `mode: diff` on `pull_request`, full mode on `push` to default branch.

**Acceptance:** on a fixture PR touching a single non-manifest file, total run time drops to under 5 seconds; full scan unchanged.

---

### Task 0.4.2 — Stable finding IDs + baseline file

**Finding ID:** make `Finding.id` ([src/core/finding.ts:20](src/core/finding.ts:20)) deterministic: `sha256(scanner + ruleId + packageName + location.file + location.startLine).slice(0,16)`. Audit every scanner so it sets `id` via a shared helper, not ad-hoc strings.

**Baseline:** add `baseline: security-baseline.json` config option. On run:
- If file exists, load IDs and mark matching findings as `status: "suppressed"` with `metadata.baselined = true`.
- Add CLI `gha-security-checks baseline update` that writes current open finding IDs to the baseline.
- Reporters render baselined findings in a "Baselined (not shown)" collapsed section.

**Acceptance:** add IDs to repo, generate baseline, second run shows zero new findings. New finding added → it surfaces; baselined ones do not.

---

### Task 0.4.3 — Native JS action variant

Publish a second composite/JS action `lavluda/GHA-security-checks/js@v0.4.0` (or a top-level `js-action.yml`) that runs as `node20` (not Docker). Consumers responsible for `setup-php`/`setup-node`. Reuse [src/action/main.ts](src/action/main.ts) — it already works; the difference is `action.yml`'s `runs.using`. Use `dist-action/` which is already ncc-bundled ([package.json:prepare:action](package.json)).

Document both variants in README; recommend JS for repos that already have language toolchains installed in CI, Docker for batteries-included.

---

### Task 0.4.4 — Suppressions CLI

Schema already supports it ([config.ts:136](src/core/config.ts:136)). Add:
- `gha-security-checks suppress <id> --reason "..."` — appends a suppression entry to the config file (creates if missing).
- `gha-security-checks suppressions list` — prints current suppressions.
- `gha-security-checks suppressions remove <id>`.

Edit YAML in place using the `yaml` package; preserve comments and ordering.

---

### Task 0.4.5 — PR comment delta view

Modify [src/integrations/github.ts](src/integrations/github.ts) to:
- Read the previous comment (already-updated by this action — find by sentinel HTML comment marker).
- Diff finding IDs against the prior set.
- Render three sections: **New**, **Fixed since last run**, **Still open** (collapsed by default).

Cap the comment body at 60KB (GitHub limit is 65536 chars); overflow goes to an attached gist or the job summary only.

---

### Task 0.4.6 — Release v0.4.0

Same procedure as 0.3.9.

---

## v0.5.0 — Broader coverage

**Theme:** support more ecosystems and more check types.

### Task 0.5.1 — Python scanner

Add `src/scanners/python/pip-audit.ts`. Trigger detection: presence of `requirements*.txt`, `pyproject.toml`, or `Pipfile.lock` in repo root or `src/`. Shell out to `pip-audit --format json` if the binary is available; emit `tooling` info finding if not. Map to `Finding` with category `vulnerability`. Add Python to the Dockerfile (apt `python3 python3-pip pipx`, then `pipx install pip-audit`).

Tests: fixture repo with a known-vulnerable `requirements.txt`, snapshot of normalized findings.

### Task 0.5.2 — Ruby scanner

`src/scanners/ruby/bundle-audit.ts`. Same shape as Python: detect `Gemfile.lock`, shell out to `bundle-audit check --format json`. Add `ruby + bundler-audit` to Dockerfile.

### Task 0.5.3 — License compliance

New config block:
```yaml
licenses:
  allow: [MIT, Apache-2.0, BSD-3-Clause]
  deny: [GPL-3.0, AGPL-3.0]
  unknownPolicy: warn # or fail / ignore
```
Add category `license` to [FindingCategory](src/core/finding.ts:3). Parse package metadata from existing scanner outputs (composer + npm trees both expose licenses). Emit findings for any package in `deny` (severity high), packages outside `allow` (severity medium), and unknown licenses per `unknownPolicy`.

### Task 0.5.4 — SBOM emission

Add `outputs.sbom: "sbom.cdx.json"` option. Emit CycloneDX 1.5 JSON aggregating the dependency tree from all enabled scanners. Use `@cyclonedx/cyclonedx-library` rather than hand-rolling.

### Task 0.5.5 — Secret scanner: optional gitleaks + entropy

Two additions to [SecretScanner](src/scanners/secrets/secret-scanner.ts):
1. If `gitleaks` binary is present and `config.secrets.useGitleaks` (default true), run `gitleaks detect --no-banner --report-format json`. Merge findings under existing `secret` category. Avoid double-reporting by deduping on (file, line, value-hash).
2. Entropy heuristic: for any string ≥20 chars adjacent (same line) to identifiers matching `password|token|secret|api[_-]?key`, compute Shannon entropy. Flag at `medium` if entropy > 4.0. Already covered partially by the regex at [config.ts:107](src/core/config.ts:107) — generalize.

Add `secrets.allowlist` (array of regex) — skip findings whose value matches.

### Task 0.5.6 — Workflow hardening additions

Extend [src/scanners/github-actions/workflow-hardening.ts](src/scanners/github-actions/workflow-hardening.ts):
- Flag `pull_request_target` workflows that `actions/checkout` `github.event.pull_request.head.ref/sha` (RCE footgun). Severity: critical.
- Flag workflows with no top-level `permissions:` block AND no per-job blocks. Severity: medium.
- Flag `env:` or `with:` entries containing `${{ secrets.GITHUB_TOKEN }}` directly (encourages downstream leakage). Severity: low.
- Flag `uses: org/repo/.github/workflows/foo.yml@<branch>` (unpinned reusable workflow). Severity: medium.

Each new check gets its own test in `test/workflow-hardening.test.ts` with a YAML fixture demonstrating the trigger.

### Task 0.5.7 — Release v0.5.0

---

## v0.6.0 — Org-friendly

**Theme:** central deployment patterns for security teams managing many repos.

### Task 0.6.1 — Reusable workflow

Ship `.github/workflows/security-check.reusable.yml` with `on: workflow_call`, inputs mirroring `action.yml`. Consumers do:
```yaml
jobs:
  security:
    uses: lavluda/GHA-security-checks/.github/workflows/security-check.reusable.yml@v0.6.0
    with:
      mode: warn
```
Removes boilerplate from every consumer.

### Task 0.6.2 — Remote policy

Add `policy: <url-or-repo-ref>` config field. Loader recognizes:
- `https://...` → fetch (cache in `~/.cache/gha-security-checks/`).
- `org/repo@ref:path/to/file.yml` → resolve via `actions/checkout` style (need a token; respect `github-token` input).
Inheritance: remote policy is loaded first, local config overrides. Validate remote schema with the same Zod parser.

### Task 0.6.3 — Notifier outputs

New `notifiers:` config block:
```yaml
notifiers:
  slack:
    webhook: ${SLACK_WEBHOOK_URL}
    minSeverity: high
    onlyNew: true
  githubIssue:
    repo: org/security-issues
    minSeverity: critical
    onlyNew: true
```
Notifier only fires on default branch runs (not PRs). Use `onlyNew` to compare against baseline.

### Task 0.6.4 — Optional auto-fix PRs

For findings with a known `fixedVersion` where the manifest change is mechanical (`composer.json` or `package.json` version bump), open a follow-up PR. Gated behind `autofix: true`. Only operate on direct dependencies (skip transitive — Dependabot territory). Use [`@actions/github`](src/integrations/github.ts) to create branch + PR.

Compete with nothing: this is for Composer (where Dependabot is weak) and other ecosystems Dependabot doesn't cover well.

### Task 0.6.5 — Release v0.6.0

---

## Cross-cutting (every release)

- Keep `CHANGELOG.md` up to date as work lands.
- Run the action against itself (self-audit workflow from 0.3.4) — treat new findings as release blockers.
- Add or update tests for every new code path.
- Update README only when user-visible surface changes; otherwise prefer CHANGELOG.

## Out of scope (explicitly deferred past v0.6)

- IDE plugins / language server.
- Web UI / dashboard.
- Telemetry collection (don't add — would damage trust in a security tool).
- Replacing OSV-Scanner or Dependabot — we complement, not replace.
