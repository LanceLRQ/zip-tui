# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

The MVP is implemented. All of Phase 0–11 in `plans/tasks.md` has landed, and the local gate (`bun run lint && bun run typecheck && bun run test:coverage`) is green.

- **Formats shipped**: zip, 7z, tar, tar.gz, tar.bz2, tar.xz, tar.zst, gz, bz2 — nine adapters under `src/engine/adapters/`, beyond the three the MVP originally scoped
- **CLI subcommands routed**: `a` / `x` / `l` / `deps` / `config`. `t` and `update` are declared in the design but not yet wired into `src/index.ts` — they remain V1 scope
- **Not yet released**: the repo has no git tag, so the 4-platform release matrix in `.github/workflows/release.yml` has never actually run. Only the host-platform binary is verified, via `tests/e2e/binary-smoke.test.ts`

The TUI has since been rebuilt around a single unified browser. The main menu and
the four wizard pages are gone; `src/tui/pages/` now holds `BrowserPage`,
`DependenciesPage` and `SettingsPage` only. Integrity testing (`t`) and selective
extraction, both listed as V1 in the original plan, arrived with it — the engine
already supported them.

## What this project is

zip-tui is a TUI-driven dispatcher for system archive commands (`zip` / `unzip` / `7z` / `tar` / `gzip` / `bzip2` / `xz` / `zstd`). It does not implement compression algorithms — it generates and executes the underlying shell commands transparently, with an Ink (React) TUI for interactive use and a 7z-style CLI (`zt a/x/l/t`) for scripts.

Target platforms: macOS 13+ and Linux (glibc, mainstream distros). Windows is explicitly out of scope for v0.1.

## Tech stack

- **Runtime / bundler**: Bun (compile to standalone binary via `bun build --compile`)
- **Language**: TypeScript (strict, `noUncheckedIndexedAccess`)
- **TUI**: Ink + ink-text-input / ink-select-input / ink-spinner / ink-table
- **State**: Zustand
- **CLI**: commander
- **Subprocess**: execa (array-form args, never shell strings)
- **Tests**: Vitest + ink-testing-library (coverage threshold 80% lines/functions/statements, 75% branches, CI-blocking)
- **Lint/format**: Biome
- **Other**: pino (logger), conf (config), zod (schema), iconv-lite (encoding), i18next (i18n), globby, which, clipboardy

Open-source distribution: GitHub Releases via Actions matrix (`macos-14` / `macos-13` / `ubuntu-22.04` / `ubuntu-22.04-arm`). Alpine / musl users run from source with Bun installed.

## Common commands

```bash
bun run dev           # run the TUI from source
bun run build         # bun build --compile → dist/zt single binary
bun run test          # vitest run
bun run test:watch    # interactive test runner
bun run test:coverage # enforce coverage thresholds (CI gate)
bun run lint          # biome check src tests
bun run format        # biome format --write src tests
bun run typecheck     # tsc --noEmit
```

Run a single test file:

```bash
bun run test tests/unit/engine/adapters/zip.test.ts
```

Manual smoke:

```bash
ZT_NO_TUI=1 bun run src/index.ts a out.zip src/ --dry-run
```

## Architecture

Three-layer design with shared infrastructure:

```
Entry (src/index.ts)
  ├─ parse argv → check TTY → dispatch to TUI or Direct Runner
  │
  ├─→ TUI Layer (src/tui/)
  │     browser/ (pure logic) + components/ + pages/, consuming Engine
  │     via Zustand slices (src/store/)
  │
  ├─→ Direct Runner (src/runner/direct.ts)
  │     non-TTY path; calls Engine directly; streams stdout/stderr to terminal
  │
  └─→ Command Engine (src/engine/)
        FormatRegistry → FormatAdapter (zip/7z/tar.gz/…) → CommandBuilder → Executor (execa)
        + Dependency Manager (src/deps/)
        + Infra (src/infra/: env, fs, logger, config, i18n)
```

Key boundaries:

- **`FormatAdapter` is the only abstraction over compression tools.** Adding a new format = one file under `src/engine/adapters/`, register in `src/engine/builder.ts`. No other module should know about specific archive formats — they should operate on `BuiltCommand` and `FormatId` only.
- **TUI never spawns subprocesses directly.** Always goes through `Executor` (`runCommand` / `streamCommand`). Direct Runner does the same.
- **No `shell: true` anywhere.** All command execution uses `execa(cmd, args)` with array-form arguments to prevent injection.
- **Most engine functions are pure.** `CommandBuilder`, format detectors, list parsers, progress parsers — all pure. The only impure module is `Executor`, which centralizes all `execa` interaction.

## Project-specific conventions

### TTY-aware dispatch (no manual flag)

The entry point detects `process.stdin.isTTY` plus env vars `CI` and `ZT_NO_TUI`. Non-TTY contexts (scripts, pipes) **never** open the TUI; in such contexts, missing required args cause `exit 2` rather than prompting.

There is intentionally **no `--no-tui` / `--silence` / `--auto` flag** — this was discussed and explicitly rejected. If you find yourself adding one, that's a regression.

### Location-derived actions, not modes

The TUI is one browser. Compression and extraction are not two modes: they fall
out of `Location` (`fs` or `archive`), the row under the cursor, and what is
marked in the current domain. Entering a `.zip` *is* viewing it; extracting is an
action taken from inside. If you find yourself adding a mode state or an
`isExtractMode` boolean, that is a step backwards.

The marked set is split by location kind. The filesystem domain holds absolute
paths (material to compress), the archive domain holds archive-internal paths
(entries to pull out), and the two are never merged — feeding one to the other
builds a nonsensical command.

Contextual keys (`a` / `x` / `t` / `Enter` / `←`) have a single source of truth:
`availableActions` in `src/tui/browser/actions.ts` returns them, `matchesKey`
maps the displayed key to Ink's flags, and the page dispatches by action id. Do
not re-derive them from `isDir` / `isArchive` inside `useInput` — the hint line
and the handler would then drift apart with nothing to catch it.

Keys are lowercase and never distinguish case (`g` / `G` is the one exception,
being the vi convention). The TUI keys line up with the CLI subcommands: `a`,
`x` and `t` mean the same thing in both places.

### Height budgets are constants, and they are tested

`CHROME_ROWS` and `PANEL_CHROME` in `BrowserPage.tsx` say how many rows are
spent on things that are not the list or the command preview. Get one wrong and
the screen breaks silently: Ink's fixed-height box leaves Yoga no room to spill
into, so overflow shows up as *squeezed-out rows*, not as a scrollbar or a
visible cut. `tests/unit/tui/browserLayout.test.tsx` imports both constants and
asserts on the field labels that disappear first. Assert on those, not on the
hint line — the hint survives overflow as overwritten text.

### Password handling

- Passwords pass inline (`-pPASSWORD` / `-PPASS`) and **will** appear in `ps`. This is an accepted trade-off; do not introduce pty-based prompts to "fix" it.
- Every code path that touches passwords MUST run them through `redactPassword(args)` from `src/infra/logger.ts` before logging.
- Passwords never enter config storage.

### i18n scope

`locales/{zh,en}.json` only translates **UI strings** (labels, buttons, hints). Subprocess stdout/stderr, log lines, and command previews are passed through verbatim. This is deliberate — users debugging tool errors should see the raw English message and be able to grep / paste it elsewhere. Adapter errors surfaced in the action panel follow the same rule.

Before deleting a key that looks unused, note that `HelpPanel` builds some as
`` t(`help.${entry}`) ``, which a whole-key search will not find.
`tests/unit/infra/i18n.test.ts` scans the source for key references and asserts
each one resolves, so run it rather than trusting a grep.

### Virtual scrolling is required

The `VirtualTree` component must do windowed rendering. The performance budget (10k files ≤ 200ms render) cannot be hit with naive React iteration. Features that bypass virtualization regress the project's performance targets.

### Subcommand naming is fixed

CLI uses 7z-style single-letter subcommands: `a` (add/compress), `x` (extract), `l` (list/view), `t` (test). Multi-letter for app management: `deps`, `config`, `update`. Do not rename these.

## TDD workflow

Tasks follow a strict 5-step TDD cycle: write failing test → run to confirm failure → implement → run to confirm pass → commit. Do **not** skip the failure-verification step; do **not** batch multiple tasks into a single commit. Commit messages follow Conventional Commits (`feat:` / `fix:` / `chore:` / `test:` / `ci:` / `docs:` / `refactor:`).

## Pre-commit verification (mandatory)

Before **every** `git commit`, run the same checks CI does and only commit when all three pass:

```bash
bun run lint && bun run typecheck && bun run test:coverage
```

This is non-negotiable — CI on GitHub runs the same three steps, and a red CI on `main` blocks releases. The compiled-binary smoke test (`tests/e2e/binary-smoke.test.ts`) is included in `test:coverage`, so a broken build is caught locally before it ever reaches CI.

If any of the three fails, fix the underlying issue and rerun — never `--no-verify`, never skip tests, never lower coverage thresholds to make red turn green.

## CI policy

`.github/workflows/ci.yml` runs only on:
- pushes to `main`
- any pull request

Feature/dev branches don't trigger CI on every push — the pre-commit verification above is what catches regressions there. CI on `main` and PR is the final gate before merge/release.
