#!/usr/bin/env nu

let repo_root = ($env.FILE_PWD | path join '..')
let qmk = ($repo_root | path join 'bin' 'qmk')

print "==> Building Bakeneko firmware..."
run-external $qmk "compile" "-kb" "cannonkeys/db60/hotswap" "-km" "milky_neko"

print ""
print "==> Waiting for Bakeneko DFU mode..."
print "    Keycap-free: unplug, flip the back PCB switch 0->1, plug in."
print "    (Older/with-keycaps build running: hold MO(1) + B ~500ms = MN_DFU.)"
print ""

loop {
    let out = (do -i { dfu-util -l } | complete)
    if ($out.stdout | str contains "Found DFU") {
        print "    DFU device detected!"
        break
    }
    sleep 1sec
}

print ""
print "==> Flashing..."
run-external $qmk "flash" "-kb" "cannonkeys/db60/hotswap" "-km" "milky_neko"
