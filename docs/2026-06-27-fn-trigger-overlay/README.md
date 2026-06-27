# FN key emits a host-visible overlay trigger

Dated: 2026-06-27

## Background

The FN key on every board is a QMK momentary layer (`MO(1)` / `MO(_FN1)`).
Pressing it switches the active layer for the duration of the hold; all the
FN-layer bindings (F-row, arrows, media, DFU) are unchanged and stay in
firmware. That part stays as-is.

The problem is purely a detection one. A Mac-side tool wants to show an
on-screen cheat sheet of the held board's FN-layer bindings the moment FN
is held, and dismiss it on release. On macOS there is no reliable way to tie
a key event back to the physical keyboard that produced it (Quartz Event
Services drops the vendor/product id before an app sees the event). The
momentary layer key itself is also invisible: `MO()` emits no HID report on
its own. So out of the box the host can neither see "FN held" nor know which
board did it.

## Goals

- Let the host detect "the FN layer is held" and "the FN layer was just
  released," with low latency (press-to-show, release-to-hide).
- Let the host tell which physical layout acted, so the on-screen diagram
  matches the board you are touching (a 60% diagram for the 60% board, a 65%
  diagram for the 65% boards).
- Preserve the exact existing FN-layer behavior. No binding changes, no
  timing changes, no new mod-tap or one-shot semantics.
- Keep it confined to the keymaps. No firmware fork, no new build steps.

## Decision

Each board's physical FN key now emits a distinct, inert host F-key for the
duration of the hold, in addition to switching layers. The host watches for
that F-key's keydown/keyup pair, which gives it both the hold/release signal
and which board acted in one shot. Because macOS can't fingerprint the
source keyboard, the F-key IS the identifier.

Why an F-key in the `KC_F13`..`KC_F15` range:

- They are unbound by default on macOS, so emitting one does nothing on the
  host. The host-side tool swallows the trigger event entirely.
- `register_code16`/`unregister_code16` produce a real keydown/keyup pair the
  host sees as a normal keyboard event (a CGEventTap watching keyDown/keyUp),
  unlike consumer/media usages.
- They are distinct per board, so two boards plugged in at once are still
  distinguishable.

### F-key assignment, by layout

The assignment is grouped by physical layout. Where a layout has more than
one board sharing the geometry, each board still gets its own distinct F-key
so the host can tell the two 65% boards apart.

| Layout | Board (keymap) | Trigger F-key |
| --- | --- | --- |
| 60% | `cannonkeys/db60/hotswap` `milky_neko` | `KC_F13` |
| 65% | `mode/m256wh` `mirage` | `KC_F14` |
| 65% | `neo/neo65_trimode` `aliou` | `KC_F15` |

The two 65% boards share geometry (the only keymap difference is the NEO65's
FN+Tab wireless toggle); from the host's point of view a 65% diagram is
correct for either. The distinct F-key is what lets the host pick the right
diagram variant when both happen to be connected.

## Implementation

Across the three keymaps, the FN position changed from a plain
`MO(_FN1)` / `MO(1)` to a custom keycode, `OV_TRIGGER`. The custom keycode
reproduces `MO()` by hand and adds the F-key emission:

```c
#define OV_FN_KEY KC_F13   /* F14 on the Mirage, F15 on the NEO65 */

case OV_TRIGGER:
    if (record->event.pressed) {
        layer_on(_FN1);
        register_code16(OV_FN_KEY);
    } else {
        unregister_code16(OV_FN_KEY);
        layer_off(_FN1);
    }
    return false;
```

Calling `register_code16` from inside `process_record_user` is safe and does
not re-enter key processing. Manual `layer_on`/`layer_off` preserves the
momentary-layer semantics of `MO()`: the layer is active while the key is
held, affects subsequent keypresses, and is removed on release. All existing
FN-layer bindings (arrows, F-row, media, DFU/`QK_BOOT`) resolve exactly as
before. The DFU entries on the FN layer (`FN+B` on the DB60, `FN+grave` on the
65% boards) are untouched.

Each keymap declares `OV_TRIGGER` in its existing custom-keycode enum
alongside the board's other `SAFE_RANGE` keycodes, so there are no new
collisions.

## Build, flash, verify

Build commands are unchanged -- see AGENTS.md's Building and Flashing
sections and the `justfile` recipes. Compile each target to confirm the
keymap change builds:

```
just mirage                 # mode/m256wh:mirage
just neo                    # neo/neo65_trimode:aliou
qmk compile -kb cannonkeys/db60/hotswap -km milky_neko
```

Flash with the existing auto-flash recipes (compile, poll for the DFU device,
flash in one step):

```
just mirage-flash-auto      # enter DFU: hold FN + grave
just neo-flash-auto         # enter DFU: Fn+B (aliou keymap)
qmk flash -kb cannonkeys/db60/hotswap -km milky_neko   # enter DFU: Fn+B
```

DFU entry is held for ~500ms on the FN-layer DFU key. See AGENTS.md for the
board-specific bootloader gotchas (the NEO65's WB32 needs `-t` toolbox mode
and the CH582F radio must be unpowered at entry).

Verification once flashed: with the host-side tool running, hold FN. The
on-screen cheat sheet for that board's layout should appear immediately and
disappear on release. Holding FN and pressing a real FN-layer key (e.g. an
arrow or a media key) should still work and still pass through -- only the
trigger F-key itself is consumed by the host.

## Risks

- **F13..F15 collisions.** They are unbound by default on macOS but can be
  bound in System Settings, Karabiner, BetterTouchTool, or an individual app.
  The host-side tool swallows the trigger event, so a collision only matters
  if something else grabbed the key before the tool's tap. If that ever
  happens, bump that board's `OV_FN_KEY` to `KC_F16`..`KC_F19` and rebuild.
- **Modifier chords.** If you hold Cmd/Shift/Ctrl while pressing FN, the host
  sees the modified F-key (e.g. `Cmd+F13`). The host-side match is purely on
  the keycode, not exact-empty modifiers, so this is harmless in practice.
- **FN-layer key while the trigger is held.** Because the F-key is emitted by
  the trigger position itself (not by the FN-layer bindings), pressing a real
  FN-layer key while FN is held does not re-emit the trigger. Layer-activation
  hooks are deliberately not used: they would fire on any path that touches
  the layer (`TG`/`TT`/tri-layer), not strictly on this physical FN hold.
- **Same-layer activators.** `OV_TRIGGER` mirrors `MO()`'s simple bit behavior
  (it is not a reference count). Each board has exactly one FN key per layer,
  so this is fine; do not add a second activator for the same layer expecting
  reference semantics.

## Status

- Firmware: implemented and compiling clean on all three targets. Not yet
  flashed to the physical boards.
- Host side: lives outside this repo. It depends only on the F-key contract
  above (F13 = 60%, F14 = Mirage 65%, F15 = NEO65 65%); changing that
  contract here requires a matching update there.

## Affected files

- `keyboards/cannonkeys/db60/hotswap/keymaps/milky_neko/keymap.c`
- `keyboards/mode/m256wh/keymaps/mirage/keymap.c`
- `keyboards/neo/neo65_trimode/keymaps/aliou/keymap.c`

Each only adds an `OV_FN_KEY` define, an `OV_TRIGGER` enum entry, swaps the
`MO()` at the FN position for `OV_TRIGGER`, and adds the press/release case
to its existing `process_record_user`. No other bindings change.
