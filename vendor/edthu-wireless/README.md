# vendor/edthu-wireless -- vendored wireless support for WB32 + CH582F boards

Source: https://github.com/edthu/qmk_firmware branch `wireless`
Upstream commit vendored: 52aae316603b2129feafdc43db5fcda59bec215d
(Add neo ergo layout, 2025-11-06)

The upstream commit edthu branched `wireless` from is `1a58fce043`
(2025-08-06), which is an ancestor of our pinned firmware rev in
`flake.nix` (85886db). So this is purely additive: every file here is a
NEW file relative to upstream QMK. No core quantum/tmk_core files are
modified, so the regenerated patch can't bitrot against upstream changes.

Layout mirrors upstream-relative paths exactly so the regen script can
overlay vendor/edthu-wireless/ onto a pristine firmware checkout 1:1:

    keyboards/neo/neo65_trimode/   -- the NEO65 tri-mode keyboard definition
    keyboards/neo/wireless/        -- shared WB32<->CH582F UART transport stack

Only the NEO65 is vendored. edthu's branch also ports the Neo70/Neo80/
NeoErgo, qk65v2classic, and Bridge75; none are copied here.

## Local modifications to vendored source

These differ from edthu's upstream `wireless` branch and must survive a
re-sync:

- `keyboards/neo/wireless/lpwr_wb32.c` and
  `keyboards/neo/neo65_trimode/neo65_trimode.c`: QMK renamed the GPIO
  helpers on 2024-02-25 (`setPinOutputOpenDrain` ->
  `gpio_set_pin_output_open_drain`, `writePinLow` ->
  `gpio_write_pin_low`, `setPinInputHigh` -> `gpio_set_pin_input_high`,
  `setPinInput` -> `gpio_set_pin_input`, `writePin` -> `gpio_write_pin`).
  edthu's source used the pre-rename names in these two files; our pinned
  firmware rev only defines the new names, so without these renames they
  fail to compile with `-Wimplicit-function-declaration`. Applied via sed
  in-place to the vendored files.

## How to update

1. Update edthu's commit reference above in this file.
2. `git -C /tmp/edthu/qmk_firmware fetch origin wireless && git checkout <new>`
   (or clone fresh).
3. `rsync -a --delete` the two keyboard dirs into
   `vendor/edthu-wireless/keyboards/neo/{neo65_trimode,wireless}/`.
4. Run `scripts/regen-wireless-patch.sh` to regenerate
   `patches/0002-add-edthu-wireless-support.patch`.
5. `direnv reload` and build: `qmk compile -kb neo/neo65_trimode -km default`.

## How the patch is built

The regen script (scripts/regen-wireless-patch.sh):

1. Resolves a pristine upstream firmware checkout at the rev pinned in
   `flake.nix`, via `nix build .#qmkFirmwareSrc --no-link --print-out-paths`
   (or `$QMK_PRISTINE` if set).
2. Copies it to a temp workdir, overlays `vendor/edthu-wireless/` on top.
3. `git add -A && git diff --cached --binary > patches/0002-...patch`.
4. Verifies the patch applies cleanly on the pristine tree with
   `patch --dry-run -p1`.

## License

GPL-2.0-or-later (QMK firmware; see upstream). No binary blobs.
