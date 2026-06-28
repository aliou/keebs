# aliou/keebs

My QMK keyboard configurations, built as a **QMK external userspace** without
forking `qmk_firmware`. The firmware itself is fetched (pinned, read-only,
with submodules) by a Nix flake -- no fork, no submodule, no checkout step.

Everything is reproducible and self-contained to this directory:

- The `qmk` CLI, the ARM toolchain, and the flashers (`dfu-util`,
  `wb32-dfu-updater`) come from `nixpkgs`.
- All QMK state lives under `$PWD` -- nothing is installed globally or in
  `~/.config/qmk`.

## Keyboards

| Keyboard | MCU | Bootloader | Build target |
|---|---|---|---|
| Mode Mirage (M256W-H) | STM32F401 | stm32-dfu | `mode/m256wh:mirage` |
| NEO65 tri-mode | WB32FQ95 + CH582F | wb32-dfu | `neo/neo65_trimode:aliou` |
| CannonKeys Bakeneko (DB60 hotswap) | STM32F072 | stm32-dfu | `cannonkeys/db60/hotswap:milky_neko` |


The NEO65 is not in upstream QMK. Its tri-mode support (WB32 main MCU talking
to a CH582F BLE/2.4G radio over UART) comes from `edthu/qmk_firmware#wireless`,
vendored under `vendor/edthu-wireless/` and applied as a purely-additive patch
(see `patches/0002-add-edthu-wireless-support.patch`).

## Layout

```
flake.nix       -- fetches pinned QMK + applies local patches; provides devShell.
qmk.json        -- external-userspace build targets (one per keyboard/keymap).
bin/qmk          -- wrapper: injects BUILD_DIR=$PWD/.build + SKIP_GIT=1.
keyboards/       -- our overlay. Keymaps at keyboards/<vendor>/<kb>/keymaps/<km>/.
                   _archive/ holds retired keymaps (no longer in qmk.json).
patches/         -- 0001: read-only tolerance. 0002: edthu wireless (NEO65).
vendor/          -- edthu-wireless source (regen base for patch 0002).
scripts/         -- regen-wireless-patch.sh, ble-scan.swift/.py.
justfile         -- `just mirage`, `just neo`, `just bakeneko`, `just all`, ...
tools/keyboard-tester/          -- local switch-tester web app for rebuilding hotswap boards.
tools/keyboard-latency-tracer/  -- macOS CGEventTap to measure QMK modtap latency.
```

## First run

Requires Nix with flakes. From the project root:

```
direnv allow      # builds/activates the devShell, pins QMK state to $PWD
```

Without direnv: `nix develop`.

## Build

```
just mirage         # build the Mirage keymap
just neo            # build the NEO65 aliou keymap
just bakeneko       # build the Bakeneko milky_neko keymap
just all            # build every target in qmk.json
qmk compile -kb mode/m256wh -km mirage   # direct
```

Final `.bin`/`.hex` land in the repo root. Intermediates go to `$PWD/.build`.
The `bin/qmk` wrapper injects `BUILD_DIR=$PWD/.build` + `SKIP_GIT=1` (so QMK
doesn't try `git describe` against the read-only, git-less firmware tree --
any warning that surfaces during a build is real).

## Flash

### Mirage (M256W-H) -- STM32 DFU

1. Enter DFU: hold the layer-1 key (`MO(1)`, bottom row, right of Space) and
   tap the top-left grave (`` ` ``) key, or hold `MO(1)` and tap `B`. Both
   are bound to `QK_BOOT` on layer 1.
2. Confirm: `dfu-util -l` shows `Found DFU: [0483:df11]`.
3. Flash:
   ```
   just mirage-flash
   # or: qmk flash -kb mode/m256wh -km mirage
   ```

### Bakeneko (CannonKeys DB60 hotswap) -- STM32 DFU

1. Enter DFU. Two ways, neither needs the keymap running:
   - **Back toggle switch (keycap-free):** unplug, flip the small switch on the
     back of the PCB from `0` to `1`, plug back in. That ties `BOOT0` to VCC,
     so the STM32F072 boots straight into its factory DFU ROM bootloader --
     enumerates as `0483:df11` with no firmware/keycaps involved.
   - **With the `milky_neko` build running** (keycaps on): hold `MO(1)`
     (bottom row, right of Space) and hold `B` for ~500ms. That key is the
     `MN_DFU` custom keycode, which calls `reset_keyboard()`.
   - (Bootmagic Lite is also enabled, so holding the top-left key on plug-in
     jumps to the bootloader too -- needs a switch there.)
2. Confirm: `dfu-util -l` shows `Found DFU: [0483:df11]`.
3. Flash:
   ```
   just bakeneko-flash-auto   # compile + wait for DFU + flash
   just bakeneko-flash
   # or: qmk flash -kb cannonkeys/db60/hotswap -km milky_neko
   ```

### NEO65 -- WB32 DFU

There are two ways to enter DFU, depending on what firmware is on the board:

- **If our `aliou` build is running**, just press `Fn+B` (bound to `QK_BOOT`).
  No battery/USB fiddling needed.
- **If the unmodified Qwertykeys stock firmware is running** (or `Fn+B` does
  nothing), use the physical sequence: flip the battery switch (under the
  Caps Lock keycap) to OFF, unplug USB-C, hold `Fn+Esc`, plug back in while
  holding, keep holding ~3s, release. The CH582F radio must be unpowered at
  entry or the WB32 won't jump to its bootloader.

In either case, verify with `wb32-dfu-updater_cli -l` -- it should show
`Found DFU: [342d:dfa0]`. Then flash:

```
just neo-flash
# or: wb32-dfu-updater_cli -t -s 0x08000000 -D neo_neo65_trimode_aliou.bin
```

The `-t` (toolbox mode) flag is **required**. Without it the WB32's flash
read protection silently blocks the write: the tool prints
`Reset device completed!` (looks like success) but writes nothing. A real
flash prints `Writing ... OK` and `Download completed!`.

After a write without `-R`, the board stays in DFU mode; reset it out with
`wb32-dfu-updater_cli -R`, or just power-cycle the USB cable.

### Wireless (NEO65 aliou keymap)

`Fn+Tab` toggles between USB and BT1 only -- a custom keycode
(`USB_BT1_TOG`) calls `wireless_devs_change()` directly. (The stock cycle
`KC_NXT` walks USB -> BT1 -> BT2 -> BT3 -> 2.4G -> USB, which is more than I
need; I only pair one host.)

BT pairings live in the CH582F radio's own flash, not the WB32's, so they
survive a WB32 firmware swap. After reflashing, just `Fn+Tab` back to BT1 and
it reconnects to the previously-paired Mac.

Indicator LEDs (Esc, Q/W/E/R, Caps) are driven by edthu's state machine in
`neo65_trimode.c` and show the current wireless mode + connection state --
they are not QMK RGB/LED-matrix controllable. The Caps Lock LED (PA8) is
auto-driven from host caps-lock state via `keyboard.json`'s `indicators`
block. There is no per-key RGB on this PCB.

## Updating QMK firmware

Bump `rev` in `flake.nix` to a new upstream commit
(<https://github.com/qmk/qmk_firmware/commits/master>). Set `hash` back to
`pkgs.lib.fakeHash`, run `direnv reload` -- nix will fail and print the
correct new hash; paste it in. `direnv reload` again and commit `flake.lock`
and `flake.nix`.

The local patches in `patches/` may need re-generating if surrounding
upstream lines change. Patch 0001 (read-only tolerance) might fail to apply;
patch 0002 (edthu wireless) is purely additive so it can't bitrot, but if you
pull a newer wireless commit from edthu, regenerate with
`scripts/regen-wireless-patch.sh`.

## Archived keyboards

Retired keymaps live in `keyboards/_archive/` and are excluded from `qmk.json`
build targets:

| Keyboard | MCU | Bootloader | Build target |
|---|---|---|---|
| DZTech DZ60RGB v2.1 (Silent Tofu) | STM32F303 | stm32-dfu | `dztech/dz60rgb/v2_1:silent_tofu` |

## Notable config: eager debounce

Both the Mirage and NEO65 aliou keymaps set eager per-row debounce in their
`config.h`:

```c
#define DEBOUNCE_TYPE sym_eager_pr
#define DEBOUNCE 5
```

QMK's default (`sym_defer_g`, 5ms) holds each keypress ~5ms before reporting;
with a mod-tap (`LCTL_T(KC_ESC)`) that made the Ctrl modifier and the rolled
keypress land ~7.4ms apart on the host -- noticeably laggy for Ctrl+anything.
Eager debounce reports the press immediately and only reverts if noise is
detected within `DEBOUNCE` ms. Measured on the Mirage: 7.4ms -> ~0.04ms.
Combined with `HOLD_ON_OTHER_KEY_PRESS`, rolled Ctrl+key combos send `<C-key>`
instead of `<Esc-key>`.

The latency was measured with `tools/keyboard-latency-tracer/`, a small macOS
CGEventTap that prints every OS-level key event with high-resolution
timestamps. See that directory's README and `docs/2026-06-19-keyboard-latency-investigation/README.md`.

### macOS Fn / Globe double-tap (`CTL_DBL_FN`)

Every active keymap (Mirage, NEO65, DB60) maps the bottom-left physical key
(normally `KC_LCTL`) to a custom `CTL_DBL_FN` keycode. It behaves as a normal
left Control when held or chorded, but a clean double-tap inside a 250ms
window sends the macOS Fn/Globe shortcut twice (`AC_NEXT_KEYBOARD_LAYOUT_SELECT`
twice via the consumer page), which opens the input-source picker.

If any other key is pressed while `CTL_DBL_FN` is held, the keycode marks the
press as a chord and cancels the pending double-tap, so normal Ctrl use never
misfires the Globe shortcut. The timing and behavior are identical across all
three boards so the gesture feels the same no matter which keyboard is plugged
in.
