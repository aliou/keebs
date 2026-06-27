# Archiving retired keyboards

Dated: 2026-06-20

## Background

This repo started with several older keymaps that were no longer being built
or flashed. Keeping them active in `qmk.json` and the README added clutter and
made the build matrix confusing.

## Goals

- Move unused keymaps out of the active build tree while keeping their source
  in the repo for reference.
- Keep the active `qmk.json` small and the README focused on currently-used
  boards.

## Decision

Create `keyboards/_archive/` and move the retired keymaps there. Keymaps in
`_archive/` are excluded from `qmk.json` build targets and are not built by
`just all`. They remain part of the overlay directory structure so they are
easy to revive later by moving them back and updating `qmk.json`.

## Implementation

Archived on 2026-06-20:

- CannonKeys DB60 hotswap `milky_neko`
- DZTech DZ60RGB v2.1 `silent_tofu`

Both were moved with `git mv` so history is preserved. The README active
keyboard table was updated to remove the DB60 row, and an "Archived
keyboards" table was added for reference.

## Risks

- A moved keymap can bitrot against the pinned QMK revision if left archived
  for a long time. Reviving it requires a fresh compile pass and possibly
  layout/config updates.

## Status

Initial archive completed. The CannonKeys DB60 was revived on 2026-06-27;
see `docs/2026-06-27-bakeneko-revival/README.md`.

## Affected files

- `keyboards/_archive/cannonkeys/db60/hotswap/keymaps/milky_neko/`
- `keyboards/_archive/dztech/dz60rgb/v2_1/keymaps/silent_tofu/`
- `qmk.json`
- `README.md`
