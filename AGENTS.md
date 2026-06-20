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

## Flashing the NEO65 (WB32FQ95, wb32-dfu bootloader)

The NEO65 tri-mode PCB has no QK_BOOT keycode on stock firmware and Bootmagic's
plug-in combos (Esc / Space+B) do NOT work -- only the physical-button-less DFU
entry sequence below does. Candidates tried and rejected: hold B on plug-in,
hold Esc on plug-in, hold Space+B on plug-in, LShift+RShift+B (Command), Fn+B,
Fn+Del. None triggered DFU.

The working procedure (matches modokeys Tess65 tri-mode, same WB32+CH582F
design):

1. Flip the physical battery switch (under the Caps Lock keycap) to OFF.
2. Unplug USB-C.
3. Hold Fn+Esc (do NOT release).
4. Plug in USB-C while holding Fn+Esc; keep holding ~3s after plug-in.
5. Release. The board enumerates as `WB Device in DFU Mode` (VID:PID
   `342d:dfa0`).

Check with `wb32-dfu-updater_cli -l`. The board stays in DFU until a successful
flash+reset.

### Critical: `-t` (toolbox mode)

`wb32-dfu-updater_cli -D <bin> -s 0x08000000 -R` alone silently no-ops (it
prints `Reset device completed!` but writes nothing -- the WB32's flash read
protection is enabled by default and blocks the write). You MUST pass `-t`
(`--toolbox-mode`, which auto-disables read protection) for an actual write:

```
wb32-dfu-updater_cli -t -s 0x08000000 -D neo_neo65_trimode_aliou.bin -R
```

A successful write prints `Writing ... OK` and `Download completed!`; a no-op
prints only `Reset device completed!`. Always re-check with `-l` after.

`just neo-flash` does the right thing. (Battery switch + Fn+Esc entry must be
done manually; there is no software trigger for it.)

### Pairing survives firmware swaps

BT pairings live in the CH582F radio's own flash, not the WB32's. So re-flashing
the WB32 over USB does not lose paired hosts. After flashing, the board starts
on USB mode; switch with Fn+Tab (`KC_NXT`) until the target LED slow-blanks,
then tap (select) or hold 3s (pair) Fn+Q/W/E/R for BT1/BT2/BT3/2.4G.

The ergonomics summary (our `aliou` keymap): Fn is immediately right of
Space, NOT one key further right like stock.

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
