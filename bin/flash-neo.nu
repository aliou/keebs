#!/usr/bin/env nu

let repo_root = ($env.FILE_PWD | path join '..')
let qmk = ($repo_root | path join 'bin' 'qmk')
let fw = ($repo_root | path join 'neo_neo65_trimode_aliou.bin')

print "==> Building NEO65 firmware..."
run-external $qmk "compile" "-kb" "neo/neo65_trimode" "-km" "aliou"

if not ($fw | path exists) {
    print $"ERROR: Firmware not found at ($fw)"
    exit 1
}

print ""
print "==> Waiting for NEO65 DFU mode..."
print "    1. Battery switch (under Caps Lock) -- OFF"
print "    2. Unplug USB-C"
print "    3. Hold Fn+Esc, plug in USB-C, hold ~3s, release."
print ""

loop {
    let out = (do -i { wb32-dfu-updater_cli -l } | complete)
    if ($out.stdout | str contains "Found DFU") {
        print "    DFU device detected!"
        break
    }
    sleep 1sec
}

print ""
print "==> Flashing..."
run-external "wb32-dfu-updater_cli" "-t" "-s" "0x08000000" "-D" $fw

print ""
print "==> Resetting device..."
run-external "wb32-dfu-updater_cli" "-R"
