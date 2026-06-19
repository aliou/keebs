# aliou/keebs -- build & flash tasks
#
# Run inside the nix devShell (direnv loads it automatically). All `qmk`
# calls go through bin/qmk which injects BUILD_DIR + SKIP_GIT.

# Build a single keymap. Usage: just compile <keyboard> <keymap>
compile kb km:
    qmk compile -kb {{kb}} -km {{km}}

# Flash a single keymap. Usage: just flash <keyboard> <keymap>
flash kb km:
    qmk flash -kb {{kb}} -km {{km}}

# Build all targets listed in qmk.json.
all:
    qmk userspace-compile

# --- per-keyboard shortcuts ----------------------------------------------

mirage:
    qmk compile -kb mode/m256wh -km mirage

# Flash the Mirage (M256W-H). Enter DFU first: hold MO(1)+grave, or hold
# MO(1)+B while plugging in. STM32 DFU over USB; uses dfu-util.
mirage-flash:
    qmk flash -kb mode/m256wh -km mirage

neo:
    qmk compile -kb neo/neo65_trimode -km default

# Flash the NEO65. Enter DFU first: hold B while plugging in. WB32 DFU;
# uses wb32-dfu-updater_cli (not dfu-util).
neo-flash:
    wb32-dfu-updater_cli -D neo_neo65_trimode_default.bin -s 0x08000000 -R -w

# --- housekeeping ---------------------------------------------------------

# Clean all build intermediates.
clean:
    rm -rf .build

# Enter the nix devShell manually (not normally needed with direnv).
shell:
    nix develop
