---
name: updating-firmware-source
description: Guide for bumping the pinned QMK firmware rev in flake.nix and adapting the vendored edthu wireless code and patches. Use when updating qmk_firmware to a newer upstream commit, regenerating patches, or re-syncing vendor/edthu-wireless.
---

# Updating the Firmware Source

This repo overlays a pinned, read-only copy of upstream `qmk/qmk_firmware`
fetched by `flake.nix`. Two patch layers sit on top:

- `patches/0001-tolerate-readonly-firmware-root-copy.patch` -- adds a `-`
  prefix to three `$(COPY)` lines so they warn instead of error when the
  firmware tree is read-only. **Modifies upstream files**, so it can bitrot.
- `patches/0002-add-edthu-wireless-support.patch` -- purely additive (all
  new files under `keyboards/neo/`). Regenerated from
  `vendor/edthu-wireless/`. Cannot bitrot from upstream changes.

Read the big-picture architecture in `AGENTS.md` / `README.md` before
editing build or patch logic.

## Tools that already exist

- `scripts/regen-wireless-patch.sh` -- resolves the pristine pinned source via
  `nix build .#qmkFirmwareSrc`, overlays `vendor/edthu-wireless/keyboards/`
  onto it, emits `patches/0002-...`, and self-verifies with `patch -p1`.
  Override the baseline with `QMK_PRISTINE=/path/to/qmk_firmware`.
- `vendor/edthu-wireless/README.md` -- records the upstream edthu commit
  vendored, the QMK commit edthu branched from, and the list of local
  modifications that must survive a re-sync.
- `bin/qmk` wrapper injects `BUILD_DIR=$PWD/.build` + `SKIP_GIT=1`.

## Workflow: bump QMK firmware rev

1. **Pick a new upstream revision** from `qmk/qmk_firmware` master. Record
   the commit SHA and date; flake.nix keeps a "Sync of YYYY-MM-DD" comment.
2. **Edit `flake.nix`**: update `qmkFirmwareSrc.rev` and the date comment.
3. **Recompute the hash**: set `hash = lib.fakeHash;` (or delete the line),
   run `nix develop`, let nix fail with `got: sha256-...`, paste that back
   into `hash`. Reload direnv (`direnv reload`).
4. **Re-verify patch 0001 applies.** It touches existing upstream lines:
   - `builddefs/common_rules.mk` (`cpfirmware_qmk` + dfu-suffix block)
   - `platforms/avr/platform.mk`
   - `platforms/chibios/platform.mk`

   If `nix develop` / a build fails with "hunk FAILED", upstream moved the
   surrounding lines. Open the patch and the upstream file, re-aim the hunk
   at the still-`$(COPY) $(BUILD_DIR)/$(TARGET).bin $(TARGET).bin;` lines,
   re-add the `-` prefix (keep trailing `&& $(PRINT_OK)` lines verbatim
   where patch 0001 already has them). Never broaden the patch beyond the
   three known-failing copy sites.
5. **Verify the edthu base is still an ancestor.** The vendored wireless
   files are only "purely additive" if the new rev is a descendant of edthu's
   branch point (`1a58fce043`, see vendor README). Modern QMK master
   satisfies this. If you ever pin something older, expect conflicts.
6. **Regenerate patch 0002**: `./scripts/regen-wireless-patch.sh`. It re-derives
   the patch from `vendor/edthu-wireless/` and verifies it applies cleanly.
7. **Build to confirm**:
   ```
   qmk compile -kb neo/neo65_trimode -km default
   qmk compile -kb mode/m256wh -km mirage
   ```
   Or `qmk userspace-compile` for everything in `qmk.json`.
8. **Commit** `flake.nix`, `flake.lock`, and any regenerated `patches/*.patch`.
   Follow Conventional Commits (e.g. `chore: bump qmk_firmware to <short>`).

## Workflow: re-sync vendored edthu wireless

When pulling newer commits from edthu's `wireless` branch:

1. Update the commit references in `vendor/edthu-wireless/README.md`.
2. Get the edthu checkout:
   ```
   git clone https://github.com/edthu/qmk_firmware /tmp/edthu
   git -C /tmp/edthu checkout <new-wireless-commit>
   ```
3. Overlay only the two keyboard dirs (mirror upstream-relative paths):
   ```
   rsync -a --delete \
     /tmp/edthu/keyboards/neo/neo65_trimode/ \
     vendor/edthu-wireless/keyboards/neo/neo65_trimode/
   rsync -a --delete \
     /tmp/edthu/keyboards/neo/wireless/ \
     vendor/edthu-wireless/keyboards/neo/wireless/
   ```
4. **Re-apply local modifications** that must survive a re-sync (see vendor
   README; undone by rsync above):
   - `keyboards/neo/wireless/lpwr_wb32.c`
   - `keyboards/neo/neo65_trimode/neo65_trimode.c`

   QMK renamed GPIO helpers on 2024-02-25. Our pinned firmware only defines
   the new names, so edthu's pre-rename calls produce
   `-Wimplicit-function-declaration` errors. Fix with sed:
   ```
   sed -i 's/\bsetPinOutputOpenDrain\b/gpio_set_pin_output_open_drain/g;
           s/\bwritePinLow\b/gpio_write_pin_low/g;
           s/\bsetPinInputHigh\b/gpio_set_pin_input_high/g;
           s/\bsetPinInput\b/gpio_set_pin_input/g;
           s/\bwritePin\b/gpio_write_pin/g' \
     vendor/edthu-wireless/keyboards/neo/wireless/lpwr_wb32.c \
     vendor/edthu-wireless/keyboards/neo/neo65_trimode/neo65_trimode.c
   ```
   (GNU sed is on PATH via Nix -- no `''` after `-i`.)

   Before re-syncing, diff the two files against the previous vendor tree to
   spot any *other* local changes worth preserving.
5. Regenerate the patch: `./scripts/regen-wireless-patch.sh`.
6. Build: `direnv reload && qmk compile -kb neo/neo65_trimode -km default`.

## Gotchas

- Do NOT `rsync` the vendor `README.md` into the firmware overlay. The regen
  script copies only `vendor/.../keyboards/.` for exactly this reason (on a
  case-insensitive filesystem `README.md` shadows upstream `readme.md` and
  produces a spurious patch hunk that fails to apply).
- Patch paths in `0002` use explicit `a/` `b/` prefixes (set by the regen
  script's `--src-prefix=a/ --dst-prefix=b/`) so `patch -p1` strips exactly
  one component and files land at `keyboards/neo/...`. Don't hand-edit the
  patch; regenerate it.
- `nix build .#qmkFirmwareSrc` exposes the **pristine** (unpatched) source --
  that's what the regen script diffs against. The patched+writable copy is
  the `devShells.default`'s `QMK_HOME`.
- If a build fails to find `QMK_HOME`, run via `nix develop` or direnv; the
  env vars are set by the flake `shellHook`, not globally.
- Commit only relevant files (`flake.nix`, `flake.lock`, regenerated
  `patches/*.patch`, updated vendor tree). No `git add -A`.
