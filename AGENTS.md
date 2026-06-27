# aliou/keebs

Agent guide for the QMK external-userspace repo. Read this before touching
build, flash, or patch logic.

## Architecture

External userspace: `QMK_USERSPACE=$PWD` overlays our `keyboards/<path>/...`
onto a read-only, pinned, fetched-by-flake copy of upstream `qmk_firmware`.
Nothing forks the firmware or grows a submodule.

- `flake.nix` -- fetches pinned `qmk/qmk_firmware` (with submodules),
  applies `patches/0001` + `patches/0002`, layers it as a writable
  `runCommand` copy, exposes `packages.qmkFirmwareSrc` for the regen script.
- `bin/qmk` -- wrapper that finds the real qmk (skipping `$REPO_ROOT/bin`
  on PATH), injects `BUILD_DIR=$PWD/.build` + `SKIP_GIT=1` on compile/flash,
  surfaces built `.bin`/`.hex` to repo root.
- `keyboards/` -- keymap-level overlay. Custom (non-upstream) keyboards are
  delivered via `patches/0002`, NOT this overlay.
- `patches/0001` -- makes firmware-root copy steps tolerant of the read-only
  nix store (uses make `-` prefix so failures are warnings, not errors).
  Errors stay visible per user requirement; the prefix only swallows the one
  known-failing copy step.
- `patches/0002` -- edthu wireless stack + NEO65 tri-mode keyboard. All new
  files, zero modifications to core quantum/tmk_core, so it can't bitrot
  against upstream changes.
- `vendor/edthu-wireless/` -- source for patch 0002. Regenerate the patch
  with `scripts/regen-wireless-patch.sh` (resolves pristine firmware via
  `nix build .#qmkFirmwareSrc`, overlays vendored files, emits the patch).
- `OV_TRIGGER` -- custom keycode used on every active keymap. It replaces
  the physical FN key's `MO()` so the host can see an inert F-key while FN
  is held (F13 = DB60, F14 = Mirage, F15 = NEO65). See
  `docs/2026-06-27-fn-trigger-overlay/README.md` for the contract.

Environment is pinned to `$PWD`; nothing lives in `~/.config/qmk` or
`~/Library/Application Support/qmk`. The flake devShell (via direnv) sets
`QMK_HOME`, `QMK_USERSPACE`, `BUILD_DIR`, and prepends `$PWD/bin` to PATH.

## Building

```
just mirage                 # mode/m256wh:mirage
just neo                    # neo/neo65_trimode:aliou
just bakeneko               # cannonkeys/db60/hotswap:milky_neko
just all                    # all targets in qmk.json (qmk userspace-compile)
qmk compile -kb mode/m256wh -km mirage   # direct
```

## Flashing

The easiest way to flash is with the auto-flash scripts (or the `just`
recipes that wrap them). They compile, poll for the DFU device, and flash
in one step. The manual tool commands are still documented below for
reference or troubleshooting.

### Mirage (STM32F401, stm32-dfu)

Enter DFU: hold `MO(1)` (bottom row, right of Space) + tap grave (top-left)
or B -- both are `QK_BOOT` on layer 1. Then:

```
just mirage-flash-auto     # compile + wait for DFU + flash
```

Or, if you prefer to do it manually:

```
just mirage-flash          # qmk flash -kb mode/m256wh -km mirage
```

### Bakeneko (CannonKeys DB60 hotswap, STM32F072)

Enter DFU:
- With the keycaps off: unplug, flip the small toggle switch on the back of
  the PCB from `0` to `1`, then plug back in. This ties BOOT0 high and boots
  the STM32F072 straight into its factory DFU ROM bootloader.
- With the `milky_neko` build running: hold `MO(1)` (bottom row, right of Space)
  and hold `B` for ~500ms. That position is the `MN_DFU` custom keycode, which
  calls `reset_keyboard()`.

Then flash:

```
just bakeneko-flash-auto   # compile + wait for DFU + flash
just bakeneko-flash        # qmk flash -kb cannonkeys/db60/hotswap -km milky_neko
```

### NEO65 (WB32FQ95 + CH582F, wb32-dfu)

DFU entry -- two cases:
- Our `aliou` build running: just `Fn+B` (bound to `QK_BOOT`).
- Stock firmware / `Fn+B` does nothing: battery switch (under Caps Lock
  keycap) OFF, unplug, hold `Fn+Esc`, plug in while holding, hold ~3s,
  release. The CH582F radio must be unpowered (battery off) at entry or the
  WB32 won't jump to its bootloader.

Once in DFU (verify with `wb32-dfu-updater_cli -l` -- should show
`Found DFU: [342d:dfa0]`):

```
just neo-flash-auto        # compile + wait for DFU + flash + reset
```

Or, if you prefer to do it manually:

```
just neo-flash             # same as below, wrapped in just
# or:
wb32-dfu-updater_cli -t -s 0x08000000 -D neo_neo65_trimode_aliou.bin -R
```

**Critical**: `-t` (toolbox mode) is required. Without it the WB32's flash
read protection silently blocks the write -- `wb32-dfu-updater_cli -D ... -R`
alone prints `Reset device completed!` (looks like success) but writes
nothing. A real flash prints `Writing ... OK` + `Download completed!`. After
a write without `-R`, the board stays in DFU; reset out with
`wb32-dfu-updater_cli -R` or just replug the cable. Always re-check with `-l`
after flashing to confirm the board re-enumerated as `NEO65`.

Do NOT add `-w` (`--wait`) alongside `-t`: with `-t`, the tool may reset
prematurely without writing. `-t -s 0x08000000 -D <bin>` (with optional
`-R` after) is the working form.

Pairings live in the CH582F radio's own flash, not the WB32's. Reflashing
the WB32 over USB does not lose paired hosts. After flashing, `Fn+Tab` to
BT1 in the `aliou` keymap (custom `USB_BT1_TOG` keycode) and it reconnects.

## Tools

### Keyboard tester (`tools/keyboard-tester/`)

Local-only Vite + React + TypeScript + Tailwind app for rebuilding hotswap
boards switch by switch. Pick a board, press a switch, and the matching
physical position lights up. Supports DB60, Mirage, and NEO65 layouts.

Requires the parent devShell (it provides `nodejs` and `pnpm`):

```
cd tools/keyboard-tester
pnpm install        # first time only
pnpm dev            # http://127.0.0.1:5173
pnpm check          # biome lint/format/grit plugins
pnpm typecheck      # tsc --noEmit
pnpm build          # outputs dist/
```

The geometry and labels are hand-maintained in `src/keyboards.ts`; update
that file whenever a keymap changes. See `tools/keyboard-tester/AGENTS.md`
for the sub-project conventions.

## Committing code

- `git status` first; stage only files relevant to the change. Avoid
  `git add .` / `git add -A`.
- Follow existing commit message style. Default to Conventional Commits.
- Never comment on or approve pull requests. Keep PR feedback in chat only.

## Online research

Use 2026/2025 in search queries (not 2024) to get current docs and best
practices. Account for current date when looking for "latest"/"recent".

## Machine context

macOS (Darwin) on Apple Silicon (arm64). No Homebrew -- add packages to
`shell.nix` or call them via `nix-shell`. GNU sed (from Nix) is on PATH;
use `sed -i 's/.../'` (no `''` after `-i`); BSD syntax fails.

## File-path resolution

- `/foo` -- absolute, use as-is.
- `./foo` or `../foo` -- relative, use as-is.
- Bare path (`src/foo.ts`, `package.json`) or `@`-prefixed path
  (`@components/Button`) -- CWD-relative. Do not search `~/`, `/`, or other
  roots. Read it directly.

## Output style

- Documents: complete, clear sentences. Explain assumptions and conclusions.
  Like a senior dev talking to a junior.
- Interactions and commit messages: extremely concise; sacrifice grammar for
  brevity. No emojis anywhere (messages, docs, or code).
