# Auto-flash scripts

Dated: 2026-06-20

## Background

Flashing QMK firmware requires the board to be in DFU mode before the flasher
runs. Doing this by hand means running a build, then watching for the device,
then running a second flash command, which is easy to mess up.

## Goals

- Make flashing a one-step operation: compile, wait for the DFU device, then
  flash.
- Keep support for the two different flashers we use (`dfu-util` for STM32,
  `wb32-dfu-updater_cli` for WB32).

## Decision

Write small Nushell scripts in `bin/` that the `justfile` exposes as
`mirage-flash-auto` and `neo-flash-auto`. The scripts:

1. Build the firmware through the repo-local `bin/qmk` wrapper.
2. Poll the appropriate discovery command until a DFU device appears.
3. Run the appropriate flash command.
4. For NEO65, reset the device after flashing.

## Implementation

- `bin/flash-mirage.nu`
  - Polls `dfu-util -l` for the STM32 DFU signature (`Found DFU`).
  - Runs `qmk flash -kb mode/m256wh -km mirage`.

- `bin/flash-neo.nu`
  - Polls `wb32-dfu-updater_cli -l` for `Found DFU`.
  - Flashes with `-t -s 0x08000000 -D neo_neo65_trimode_aliou.bin`.
  - Resets with `wb32-dfu-updater_cli -R`.
  - The `-t` (toolbox mode) flag is required. Without it the WB32's flash
    read protection silently blocks the write.

- `justfile` recipes:
  - `just mirage-flash-auto`
  - `just neo-flash-auto`

## Risks

- The polling loop runs forever if the board is never put in DFU mode.
- On NEO65, the battery switch must be OFF and the CH582F radio unpowered
  when entering DFU, otherwise the WB32 will not jump to its bootloader.
  The script prints this reminder before polling.
- A write without `-R` leaves the board in DFU; the NEO65 script always
  resets after a successful flash.

## Status

Implemented for Mirage and NEO65. A Bakeneko variant was added later; see
`docs/2026-06-27-bakeneko-revival/README.md`.

## Affected files and commands

- `bin/flash-mirage.nu`
- `bin/flash-neo.nu`
- `justfile`
- Flash: `just mirage-flash-auto`, `just neo-flash-auto`
