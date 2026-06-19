# aliou/keebs -- QMK external userspace
#
# This repo holds my personal QMK keyboard configurations (keymaps + one
# custom keyboard definition) WITHOUT forking qmk_firmware. QMK firmware is
# fetched here as a pinned, read-only nix source via fetchFromGitHub (with
# submodules). The QMK CLI reads these three env vars, all pinned to the
# current directory so nothing lands in ~/.config/qmk or in $HOME:
#
#   QMK_HOME       -> the read-only firmware source (fetched below)
#   QMK_USERSPACE  -> $PWD (your keymaps/ overlay; QMK finds them here)
#   BUILD_DIR      -> $PWD/.build (intermediates; firmware stays read-only)
#
# Build:   qmk compile -kb mode/m256wh -km mirage
# Build all targets (qmk.json):  qmk userspace-compile
# Flash Mirage:                  qmk flash -kb mode/m256wh -km mirage
#   (put board in DFU: hold MO(1)+grave, or hold MO(1)+B)
# Flash NEO65:                   qmk flash -kb neo/neo65_wired_for_trimode -km via
#   (put board in DFU: hold B while plugging in)
{
  description = "aliou's QMK external userspace";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        # Pinned, read-only copy of QMK firmware WITH submodules (chibios,
        # lufa, etc). To update: bump `rev` to a new upstream commit, drop the
        # `hash` line (or set it to lib.fakeHash), run `nix develop`, let nix
        # compute the new hash from the error, and paste it back.
        qmkFirmwareSrc = pkgs.fetchFromGitHub {
          owner = "qmk";
          repo = "qmk_firmware";
          # Sync of 2026-06-19 (upstream master tip at the time).
          rev = "85886db43bc3f71d088f4dbc098eba8e552b46b6";
          fetchSubmodules = true;
          # Computed via `nix develop` (lib.fakeHash -> nix printed the value below).
          hash = "sha256-azt8RQhpx6FRZTjzD9YFB2MCXFbiyrH24cbfOWoCdg8=";
        };

        # Apply local patches on top of the fetched firmware. Patches live in
        # ./patches/ and adapt upstream QMK so external-userspace builds work
        # against this read-only firmware copy (no fork needed).
        qmkFirmwarePatched = pkgs.applyPatches {
          src = qmkFirmwareSrc;
          patches = [ ./patches/0001-tolerate-readonly-firmware-root-copy.patch ];
        };

        # Custom keyboards we maintain that are NOT in upstream QMK (no fork,
        # not part of external-userspace -- see note below). We layer them onto
        # the patched firmware at build time so QMK's Python + make lookups
        # (which run with cwd = firmware, due to script_qmk.py's chdir) find
        # them as ordinary firmware keyboards: is_keyboard(), find_info_json(),
        # rules_mk(), make KEYBOARD_PATH_*, list-keyboards, etc. all work
        # unmodified.
        #
        # Entry = path under our repo's keyboards/ that has a keyboard.json.
        customKeyboards = [ "neo/neo65" ];

        qmkFirmware = pkgs.runCommand "qmk-firmware-overlayed" { src = qmkFirmwarePatched; } ''
          cp -r "$src" "$out"
          chmod -R u+w "$out"
          ${pkgs.lib.concatStringsSep "\n" (map (kb: ''
            mkdir -p "$out/keyboards/${pkgs.lib.dirOf kb}"
            cp -r "${./keyboards}/${kb}" "$out/keyboards/${kb}"
          '') customKeyboards)}
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            qmk                       # QMK CLI (python, with deps)
            gcc-arm-embedded          # arm-none-eabi-gcc for STM32/WB32 builds
            dfu-util                  # STM32 DFU flash (Mirage M256W-H)
            wb32-dfu-updater          # WB32 DFU flash (NEO65) -> wb32-dfu-updater_cli
            gnumake                   # build driver
            git                       # qmk uses git for version info
            python3                   # some qmk subcommands need it
          ];

          shellHook = ''
            echo ""
            echo "  aliou/keebs -- QMK external userspace"
            echo "  QMK_HOME      = ${qmkFirmware}  (read-only pinned firmware)"
            echo "  QMK_USERSPACE = $PWD  (your overlay)"
            echo "  BUILD_DIR     = $PWD/.build"
            echo ""
            echo "  build all:  qmk userspace-compile"
            echo "  example:    qmk compile -kb mode/m256wh -km mirage"
            echo ""

            export QMK_HOME="${qmkFirmware}"
            export QMK_USERSPACE="$PWD"
            export BUILD_DIR="$PWD/.build"
            # Use the repo-local qmk wrapper so BUILD_DIR is injected into
            # make and the built firmware is surfaced to the repo root.
            export PATH="$PWD/bin:$PATH"
          '';
        };
      });
}
