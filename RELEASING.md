# Releasing

This document describes how to cut a new release of `gha-security-checks`.

## Prerequisites

- Push access to the `main` branch and the ability to push tags.
- `NPM_TOKEN` secret set in the repository settings (Settings → Secrets → Actions).  
  The token must have publish access to the `gha-security-checks` npm package.
- `GITHUB_TOKEN` is provided automatically by GitHub Actions; no extra setup needed.

## Step-by-step

### 1. Bump the version

```bash
# On main (or a release branch merged to main before tagging)
npm version patch   # or minor / major
# This edits package.json and creates a git commit + local tag.
# Do NOT push the tag yet.
```

Or edit `package.json` manually and commit:

```bash
git add package.json
git commit -m "chore: bump version to X.Y.Z"
```

### 2. Update CHANGELOG.md

Move the `## [Unreleased]` items to `## [X.Y.Z] - YYYY-MM-DD`.  
Add a new empty `## [Unreleased]` section at the top.  
Update the comparison links at the bottom.

```bash
git add CHANGELOG.md
git commit -m "chore: update changelog for vX.Y.Z"
```

### 3. Push to main

```bash
git push origin main
```

Wait for the CI workflow to go green before tagging.

### 4. Tag and push

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The `release.yml` workflow now runs automatically and:

1. Verifies the tag version matches `package.json`.
2. Runs lint + typecheck + tests.
3. Substitutes `__VERSION__` in `action.yml` with `X.Y.Z`.
4. Commits the substituted `action.yml` and force-moves the tag to that commit.
5. Builds and pushes a multi-arch image to GHCR:
   - `ghcr.io/lavluda/gha-security-checks:X.Y.Z`
   - `ghcr.io/lavluda/gha-security-checks:latest`
6. Publishes the npm package.
7. Creates a GitHub release with generated notes.

### 5. Verify

- [ ] `ghcr.io/lavluda/gha-security-checks:X.Y.Z` is visible in the GitHub Container Registry.
- [ ] `npm info gha-security-checks version` returns `X.Y.Z`.
- [ ] The GitHub release page is populated.
- [ ] `action.yml` on the `vX.Y.Z` tag references `:X.Y.Z` (not `__VERSION__`).

## Rollback

If something goes wrong after the image push but before the npm publish:

```bash
# Delete the tag locally and remotely
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z

# Delete the GHCR image via the GitHub UI or:
gh api -X DELETE /orgs/lavluda/packages/container/gha-security-checks/versions/<id>

# Reset package.json if needed, then re-do from step 1.
```

## Refreshing base image digests

When a new `node:24-bookworm-slim` or `composer:2` image is released, update the digests in `Dockerfile`:

```bash
docker buildx imagetools inspect node:24-bookworm-slim | grep Digest
docker buildx imagetools inspect composer:2 | grep Digest
```

Replace the `sha256:...` values in `Dockerfile` and open a PR.
