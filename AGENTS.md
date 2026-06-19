# aliou/keebs

Personal QMK keyboard configs (keymaps + one custom keyboard) built as an
external userspace against pinned upstream QMK firmware -- no fork, no
submodule.

## Layout

- `flake.nix` -- Nix flake. Fetches pinned upstream `qmk/qmk_firmware` (with
  submodules) as a read-only nix-store source, applies local patches, and
  layers our custom keyboards onto it. Provides a devShell with `qmk`,
  `gcc-arm-embedded`, `dfu-util`, `wb32-dfu-updater`, etc.
- `qmk.json` -- external-userspace build targets. `qmk userspace-compile`
  builds all of them.
- `keyboards/` -- our overlay. Keymaps live at
  `keyboards/<vendor>/<keyboard>/keymaps/<keymap>/`. Custom (non-upstream)
  keyboards with their own `keyboard.json` are listed in `customKeyboards` in
  `flake.nix` and get layered onto the fetched firmware at build time.
- `patches/` -- patches applied on top of the fetched firmware so external-
  userspace builds work against a read-only firmware tree. See the patch
  headers for the why.
- `bin/qmk` -- wrapper that (1) finds the real `qmk` binary, (2) injects
  `BUILD_DIR=$PWD/.build` + `SKIP_GIT=1` as make vars on compile/flash, and
  (3) surfaces built firmware to the repo root. Resolves the read-only
  firmware + no-git-in-store issues without touching the global env.

## Environment

Everything is pinned to `$PWD`; nothing lives in `~/.config/qmk` or
`~/Library/Application Support/qmk`. The flake devShell (via direnv) sets:

- `QMK_HOME` -- the read-only patched + overlayed firmware (nix store path)
- `QMK_USERSPACE` -- `$PWD`
- `BUILD_DIR` -- `$PWD/.build`

To update QMK firmware: bump `rev` in `flake.nix`, set `hash` to
`lib.fakeHash`, run `nix develop`, copy the real hash nix prints into the
`hash` field, reload direnv. To add a new custom keyboard: drop its files
under `keyboards/<path>/` and add `<path>` (the path relative to
`keyboards/`) to `customKeyboards`.

## Building

Enter the devShell (`direnv allow` once, then it auto-loads) and use the
justfile or `qmk` directly:

```
just mirage         # build the Mirage keymap
just neo            # build the NEO65 keymap
qmk userspace-compile   # build all targets in qmk.json
```

## Committing code

- Check the status with `git status` before committing; only stage files
  relevant to the change. Avoid `git add .` / `git add -A`.
- Follow the existing commit message style; default to Conventional Commits.
- Never comment on or approve pull requests. Keep PR feedback in chat only.

## Online research

Use 2026/2025 in search queries (not 2024) for current docs and best
practices. Account for the current date when looking for "latest"/"recent"
content.

## Machine context

macOS (Darwin) on Apple Silicon (arm64). No Homebrew -- add packages to
`shell.nix` or call them via `nix-shell`. GNU sed (from Nix) is on PATH;
use `sed -i 's/.../'` (no `''` after `-i`).

## Output style

- In documents: complete, clear sentences; explain assumptions and
  conclusions; like a senior dev talking to a junior.
- In interactions and commit messages: extremely concise; sacrifice grammar
  for brevity. No emojis anywhere (messages, docs, or code).
