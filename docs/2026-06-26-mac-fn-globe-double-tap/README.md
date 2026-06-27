# macOS Fn / Globe double-tap (`CTL_DBL_FN`)

Dated: 2026-06-26

## Background

The bottom-left key on a 60% / 65% board is normally `KC_LCTL`. On macOS the
physical Fn / Globe key opens the input-source picker, but a QMK keyboard
cannot send the real Fn key over HID. It can, however, send the consumer-page
usage `AC_NEXT_KEYBOARD_LAYOUT_SELECT`, which macOS maps to the same picker.

## Goals

- Keep the bottom-left key usable as left Control for normal modifier use.
- Add a double-tap gesture on that same key that opens the macOS input-source
  picker.
- Ensure normal Ctrl chords do not accidentally trigger the picker.

## Decision

Map the bottom-left key to a custom keycode `CTL_DBL_FN` instead of `KC_LCTL`.
In `process_record_user`:

- Key down registers `KC_LCTL` immediately so the key works as Control when
  held.
- Key up checks whether the release is the second tap of a clean double-tap
  within `MAC_FN_DOUBLE_TAP_TERM` (250 ms) and whether any other key was
  pressed while it was held (`ctl_dbl_fn_chorded`).
- If both conditions are true, send `AC_NEXT_KEYBOARD_LAYOUT_SELECT` twice
  through `host_consumer_send` (with the required `wait_ms(20)` zero-usage
  clear between sends), which opens the picker.
- If the key was chorded, the double-tap is cancelled and the key behaves as
  normal Control.

## Implementation

The keycode is defined in each active keymap's custom-keycode enum and placed
at the bottom-left matrix position:

- `keyboards/mode/m256wh/keymaps/mirage/keymap.c`
- `keyboards/neo/neo65_trimode/keymaps/aliou/keymap.c`
- `keyboards/cannonkeys/db60/hotswap/keymaps/milky_neko/keymap.c` (added the
  next day)

Each implementation is intentionally identical so the gesture feels the same
across all boards.

## Risks

- Very fast double-taps of Control in normal typing could theoretically
  trigger the picker. The 250 ms window and chord cancellation make this
  unlikely in practice.
- The consumer-page usage is not remapped by QMK's keycode system; sending it
  requires direct `host_consumer_send` calls, which is a small departure from
  normal keymap syntax.

## Status

Implemented on Mirage, NEO65, and DB60. Each target compiles clean.

## Affected files and commands

- `keyboards/mode/m256wh/keymaps/mirage/keymap.c`
- `keyboards/neo/neo65_trimode/keymaps/aliou/keymap.c`
- `keyboards/cannonkeys/db60/hotswap/keymaps/milky_neko/keymap.c`
- Build: `just mirage`, `just neo`, `just bakeneko`
