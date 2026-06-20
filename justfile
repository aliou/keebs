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

# Compile, wait for DFU, and flash Mirage automatically.
mirage-flash-auto:
    ./bin/flash-mirage.nu

neo:
    qmk compile -kb neo/neo65_trimode -km aliou

# Flash the NEO65 tri-mode. Enter DFU first:
#   1. Battery switch (under Caps Lock) -- OFF
#   2. Unplug USB-C
#   3. Hold Fn+Esc, plug in USB-C, hold ~3s, release.
# Stock firmware binds no QK_BOOT, and Bootmagic plug-in combos (Esc /
# Space+B) do NOT enter DFU on this board -- only the Fn+Esc+physical-switch
# sequence above does. The CH582F radio must be unpowered (battery off) at
# entry or the WB32 won't jump to its bootloader.
#
# `-t` (toolbox mode) is critical: without it, the WB32's default flash read
# protection blocks the write and the tool silently no-ops (prints only
# "Reset device completed!" with no "Writing ... OK").
neo-flash:
    wb32-dfu-updater_cli -t -s 0x08000000 -D neo_neo65_trimode_aliou.bin -R

# Compile, wait for DFU, and flash NEO65 automatically.
neo-flash-auto:
    ./bin/flash-neo.nu

# --- housekeeping ---------------------------------------------------------

# Clean all build intermediates.
clean:
    rm -rf .build

# Enter the nix devShell manually (not normally needed with direnv).
shell:
    nix develop
