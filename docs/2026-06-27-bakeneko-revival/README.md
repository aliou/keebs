# Reviving the CannonKeys Bakeneko (DB60 hotswap)

Dated: 2026-06-27

## Background

The CannonKeys DB60 hotswap board (used in the Bakeneko60) had been moved to
`keyboards/_archive/` because it was not actively being used. The archived
README listed its MCU as STM32F303, which turned out to be incorrect once the
board was brought back.

## Goals

- Restore the DB60 hotswap with the `milky_neko` keymap as an active target.
- Build and flash it from this repo's Nix-based external userspace.
- Add one-step auto-flash tooling.
- Correct the MCU and bootloader documentation.

## Decision

- `git mv` the keymap out of `_archive/` into the active `keyboards/`
  overlay to preserve history.
- Add the target to `qmk.json`.
- Add `just bakeneko`, `just bakeneko-flash`, and `just bakeneko-flash-auto`
  recipes.
- Add `bin/flash-bakeneko.nu`, modeled on `bin/flash-mirage.nu`, polling
  `dfu-util -l` and flashing with `qmk flash`.
- Update the README: move DB60 from the archived table to the active table,
  correct the MCU to STM32F072, and document both DFU entry methods.

## Implementation

- MCU: STM32F072 (confirmed by `qmk info` and upstream `info.json`).
- Bootloader: factory stm32-dfu ROM.
- DFU entry, no keycaps required: flip the small toggle switch on the back of
  the PCB from `0` to `1`, then plug in. This ties BOOT0 high and boots the
  STM32F072 directly into DFU, enumerating as `0483:df11`.
- DFU entry, keycaps on: with the `milky_neko` build running, hold `MO(1)`
  (bottom row, right of Space) and hold `B` for ~500 ms. That position is the
  `MN_DFU` custom keycode, which calls `reset_keyboard()`.
- The keymap also received the `CTL_DBL_FN` macOS Fn/Globe double-tap feature
  (see `docs/2026-06-26-mac-fn-globe-double-tap/README.md`) and the
  `OV_TRIGGER` host-visible overlay trigger (see
  `docs/2026-06-27-fn-trigger-overlay/README.md`).

## Risks

- The archived F303 MCU assumption being wrong was the main documentation
  issue to correct; the actual board uses F072 and stm32-dfu, matching the
  other STM32 boards in this repo.
- The back toggle switch is the most reliable way to enter DFU because it
  does not depend on firmware running, but it requires removing the case.

## Status

Implemented and flashed successfully. The board re-enumerates as
"DB60 Hotswap" by CannonKeys after flashing.

## Affected files and commands

- `keyboards/cannonkeys/db60/hotswap/keymaps/milky_neko/keymap.c`
- `keyboards/cannonkeys/db60/hotswap/keymaps/milky_neko/rules.mk`
- `bin/flash-bakeneko.nu`
- `justfile`
- `qmk.json`
- `README.md`
- Build: `just bakeneko`
- Flash: `just bakeneko-flash-auto`, `just bakeneko-flash`
