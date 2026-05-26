# Contributing

Thank you for considering a contribution to `gha-security-checks`!

## Local development

### Requirements

- Node.js ≥ 24 (see `.nvmrc`)
- npm ≥ 10

```bash
git clone https://github.com/lavluda/GHA-security-checks.git
cd GHA-security-checks
npm install
```

### Build

```bash
npm run build          # compile TypeScript → dist/
npm run prepare:action # bundle action entry point → dist-action/ (needs @vercel/ncc)
```

> `dist/` and `dist-action/` are gitignored. Do not commit them.

### Lint and typecheck

```bash
npm run lint    # ESLint
npm run check   # tsc --noEmit
```

### Tests

```bash
npm run test             # run all vitest tests
npm run test -- --coverage   # with coverage report
```

Tests live in `test/`. Fixtures are under `test/fixtures/`.

## Adding a new scanner

1. Create `src/scanners/<ecosystem>/<name>.ts` implementing the `Scanner` interface from `src/core/scanner.ts`:

```typescript
import type { Finding } from "../../core/finding.js";
import type { Scanner, ScannerContext } from "../../core/scanner.js";

export class MyScanner implements Scanner {
  readonly name = "my-scanner";

  async scan(context: ScannerContext): Promise<Finding[]> {
    if (!context.config.scanners.myScanner) return [];
    // ... run tool, parse output, return findings
  }
}
```

2. Register it in `src/core/create-scanners.ts` — add it to the array returned by `createScanners()`.

3. Add a toggle to the `scanners` block in `src/core/config.ts` (Zod schema + `SecurityCheckConfig` type).

4. Add the tool to `Dockerfile` if it needs to be bundled in the container image.

5. Add tests in `test/<name>.test.ts` with a fixture under `test/fixtures/`.

## Finding IDs

Every `Finding` must have a stable `id`. Convention:

```
<scanner-name>.<rule-slug>.<package-or-file-slug>
```

Examples: `composer-audit.GHSA-1234-5678-abcd`, `secret-pattern.github-token.src/config.php`.

IDs are used for suppressions and baselines — they must be deterministic across runs.

## PR checklist

- [ ] `npm run lint && npm run check && npm run test` all pass.
- [ ] New code paths have tests.
- [ ] `CHANGELOG.md` has an entry under `## [Unreleased]`.
- [ ] No new top-level runtime dependencies added without discussion in the PR description.
- [ ] `dist/` and `dist-action/` are **not** staged.

## Code style

ESLint config is in `eslint.config.js`. The project uses ESM (`"type": "module"` in `package.json`).  
Imports must use the `.js` extension even for `.ts` source files (TypeScript ESM requirement).
