# aliou/keebs

My QMK keyboard configurations -- keymaps plus one custom keyboard definition
(NEO65) -- stored as a **QMK external userspace**, without forking
`qmk_firmware`.

Everything is reproducible and self-contained to this directory via Nix:

- QMK firmware itself is fetched (pinned, read-only, with submodules) by the
  flake -- no fork to maintain, no submodule, no checkout step.
- The `qmk` CLI, the ARM toolchain, and the flashers (`dfu-util`,
  `wb32-dfu-updater`) come from `nixpkgs`.
- All QMK state lives under `$PWD` -- nothing is installed globally or in
  `~/.config/qmk`.

## Contents

```
keyboards/
  mode/m256wh/keymaps/mirage/      # Mode M256W-H (Mirage, STM32F401, stm32-dfu)
  neo/neo65/                       # NEO65 tri-mode board run wired (WB32FQ95, wb32-dfu)
  cannonkeys/db60/hotswap/keymaps/milky_neko/
  dztech/dz60rgb/v2_1/keymaps/silent_tofu/
patches/
  0001-tolerate-readonly-firmware-root-copy.patch  # see "Patches" below
bin/qmk        # wrapper: injects BUILD_DIR + SKIP_GIT into make
justfile       # `just mirage`, `just neo`, `just all` ...
```

`qmk.json` lists the build targets (one per keyboard/keymap). `qmk userspace-compile`
builds all of them. The `justfile` has per-keyboard shortcuts.

## Patches

Because the fetched firmware is a read-only nix-store copy, QMK's normal step
of copying the built binary into the firmware root fails. The patch in
`patches/` makes those firmware-root copies tolerant of the read-only failure
(via make's `-` prefix), so the binary is still surfaced into the writable
userspace dir (`$PWD`) and the build succeeds. Custom keyboards not in
upstream QMK (like `neo/neo65`) are layered onto the firmware at build time
(see `customKeyboards` in `flake.nix`).

## First run

Requires Nix with flakes enabled. Enter the project dir from a shell with
[direnv](https://direnv.net/):

```
direnv allow      # builds/activates the devShell, pins QMK state to $PWD
```

(Without direnv: `nix develop`.)

## Build

```
just mirage                 # build the Mirage keymap
just neo                     # build the NEO65 keymap
just all                     # build everything in qmk.json
qmk compile -kb mode/m256wh -km mirage   # direct
```

Final `.bin`/`.hex` files land in `$PWD` (the repo root). Intermediates go to
`$PWD/.build`. The `bin/qmk` wrapper injects `BUILD_DIR=$PWD/.build` and
`SKIP_GIT=1` (so QMK doesn't try `git describe` against the read-only, git-less
firmware tree -- any warning that surfaces during a build is real).

### Mirage (Mode M256W-H) -- STM32 DFU

1. Hold the layer-1 key (`MO(1)`, bottom row, right of Space) and tap the
   top-left grave (`` ` ``) key, or hold `MO(1)` and tap `B`. That triggers
   `QK_BOOT` and the board enters DFU.
2. Confirm: `dfu-util -l` shows `Found DFU: [0483:df11]`.
3. Flash:
   ```
   just mirage-flash
   # or: qmk flash -kb mode/m256wh -km mirage
   ```

### NEO65 -- WB32 DFU

1. Hold **B** while plugging the board in to enter the WB32 bootloader.
2. Flash:
   ```
   just neo-flash
   # or: wb32-dfu-updater_cli -D neo_neo65_via.bin -s 0x08000000 -R -w
   ```
   `wb32-dfu-updater_cli` is already on PATH from the devShell.

## Updating QMK firmware

Bump the `rev` in `flake.nix` to a new upstream commit
(<https://github.com/qmk/qmk_firmware/commits/master>). Set the `hash` back
to `pkgs.lib.fakeHash` and run `direnv reload` -- nix will fail and print
the correct new hash; paste it into `flake.nix`. Then `direnv reload` again
and commit `flake.lock flake.nix`.

The local patches in `patches/` may need re-generating if the surrounding
upstream lines have changed -- `direnv reload` will error with `Hunk #1
FAILED` if a patch no longer applies cleanly.

## Notable config: Mirage debounce

`keyboards/mode/m256wh/keymaps/mirage/config.h` sets eager per-row debounce:

```c
#define DEBOUNCE_TYPE sym_eager_pr
#define DEBOUNCE 5
```

QMK's default (`sym_defer_g`, 5 ms) was holding each keypress ~5 ms before
reporting; with `LCTL_T(KC_ESC)` that made the Ctrl modifier and the rolled
keypress land ~7.4 ms apart on the host -- noticeably laggy for Ctrl+anything.
Eager debounce reports the press immediately, dropping measured latency to
~0.04 ms. See commit history for details.
