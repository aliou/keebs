# NEO65 tri-mode support via vendored edthu wireless stack

Dated: 2026-06-20

## Background

The NEO65 is a tri-mode (USB + Bluetooth + 2.4GHz) keyboard built around a
WB32FQ95 main MCU and a CH582F radio. It is not in upstream QMK, so it needs
custom firmware for both the keyboard matrix and the wireless transport.

## Goals

- Add NEO65 support without forking `qmk_firmware`.
- Keep the external-userspace model: keymaps live in our overlay, but the
  keyboard definition can come from elsewhere.
- Make future wireless stack updates reproducible and reviewable.

## Decision

Vendor the wireless branch from `edthu/qmk_firmware` and apply it as a
purely-additive patch on top of the pinned upstream firmware.

- Source: `edthu/qmk_firmware` branch `wireless`.
- Local source-of-truth: `vendor/edthu-wireless/`.
- Patch artifact: `patches/0002-add-edthu-wireless-support.patch`.
- Regenerator: `scripts/regen-wireless-patch.sh` overlays the vendored files
  onto a pristine upstream checkout at the pinned `flake.nix` revision and
  emits the patch.

The patch adds only new files (WB32<->CH582F UART transport stack in
`keyboards/neo/wireless/` and the NEO65 definition in
`keyboards/neo/neo65_trimode/`). It modifies no existing core quantum or
tmk_core files, so it cannot bitrot when the upstream pin moves.

## Implementation

1. `flake.nix` fetches `qmk/qmk_firmware` with submodules, applies patch 0002
   in `qmkFirmwarePatched`, then copies it to a writable tree in
   `qmkFirmware`.
2. `vendor/edthu-wireless/README.md` records the exact upstream commit
   vendored and any local renames that must survive a re-sync.
3. Two vendored files (`lpwr_wb32.c`, `neo65_trimode.c`) used pre-2024-02-25
   GPIO helper names (`setPinOutputOpenDrain`, etc.) that our pinned firmware
   removed. They were renamed to the current `gpio_*` equivalents.
4. The `aliou` keymap mirrors the Mirage ANSI 65% layout and adds a custom
   `USB_BT1_TOG` keycode to toggle between USB and BT1 only.

## Risks

- Re-syncing with a newer edthu commit requires re-applying the GPIO renames
  and re-running the regen script. This is documented in
  `vendor/edthu-wireless/README.md`.
- The patch is large, but additive-only, so upstream changes cannot conflict
  with its contents unless upstream adds files at the same paths.

## Status

Implemented and compiling. `qmk compile -kb neo/neo65_trimode -km aliou`
produces a firmware binary.

## Affected files and commands

- `flake.nix` (qmkFirmwareSrc / applyPatches / runCommand flow)
- `patches/0002-add-edthu-wireless-support.patch`
- `vendor/edthu-wireless/`
- `scripts/regen-wireless-patch.sh`
- `keyboards/neo/neo65_trimode/keymaps/aliou/keymap.c`
- Build: `just neo`
