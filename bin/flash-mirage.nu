#!/usr/bin/env nu

let repo_root = ($env.FILE_PWD | path join '..')
let qmk = ($repo_root | path join 'bin' 'qmk')

print "==> Building Mirage firmware..."
run-external $qmk "compile" "-kb" "mode/m256wh" "-km" "mirage"

print ""
print "==> Waiting for Mirage DFU mode..."
print "    Enter DFU: hold MO(1) + tap grave (top-left) or B"
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
run-external $qmk "flash" "-kb" "mode/m256wh" "-km" "mirage"
