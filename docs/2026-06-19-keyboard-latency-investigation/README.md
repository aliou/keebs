# Keyboard modtap latency investigation

Dated: 2026-06-19

## Background

With the Mirage keymap, the Caps position is a mod-tap (`LCTL_T(KC_ESC)`):
tap for Esc, hold for left Control. When rolling a `Ctrl + key` combo, the
interaction felt sluggish compared to a regular board.

## Goals

- Measure exactly how much latency QMK was adding between the physical press
  and the OS receiving the Control modifier.
- Find a QMK configuration that reduces the latency to effectively zero.

## Investigation

We built `tools/keyboard-latency-tracer/`, a small macOS CGEventTap that logs
every OS-level key event with high-resolution timestamps. Running the same
sequence on the Mirage and on a non-modtap board confirmed that QMK's default
debounce strategy was holding the Control event.

The relevant sequence is:

1. Press and hold the mod-tap `LCTL_T(KC_ESC)` key.
2. Press a second key, e.g. `c`.

With the default QMK debounce (`sym_defer_g`, 5ms), the press is not reported
until the debounce window has passed with no further bounce. This meant the
Control modifier arrived about 7.4ms after the physical key action. More
importantly, because the modifier and the rolled character are resolved
through the mod-tap machinery, the effective gap felt even larger in practice.

## Decision

Switch to eager per-row debounce (`sym_eager_pr`) with a 5ms window:

```c
#define DEBOUNCE_TYPE sym_eager_pr
#define DEBOUNCE 5
```

With eager debounce, the key-down is reported immediately. If noise is
detected inside the 5ms window, the report is reverted; otherwise it sticks.
This removes the deferral delay entirely.

We also enabled `HOLD_ON_OTHER_KEY_PRESS` so that, when the mod-tap key is
held and a second key is pressed, QMK resolves the mod-tap as a held modifier
rather than a tap. This stops rolled combos from producing the tap output
(`Esc + key`) and instead emits `Ctrl + key`.

## Results

Measured latency on the Mirage:

- Before (`sym_defer_g`): ~7.4ms between Control-going-down and the next key.
- After (`sym_eager_pr`): ~0.04ms.

The interaction now feels identical to a board with dedicated modifiers.

## Implementation

Eager debounce and the hold-on-other-key-press flag are set in each active
keymap's `config.h`:

- `keyboards/mode/m256wh/keymaps/mirage/config.h`
- `keyboards/neo/neo65_trimode/keymaps/aliou/config.h`

(`sym_eager_pr` was present from the initial Mirage keymap commit. The NEO65
keymap received the same treatment when it was brought up to match the Mirage
layout.)

## Risks

- Eager debounce can in theory report a noisy/bouncing switch press that a
  deferred debounce would suppress. With `DEBOUNCE 5` ms this has not been a
  problem in practice.
- `HOLD_ON_OTHER_KEY_PRESS` makes intentional tap+quick-roll sequences behave
  like modifier holds. For this layout that is the desired behavior, but it
  may not suit every keymap.

## Status

Solved. The tracer is kept in the repo as a reusable diagnostic tool under
`tools/keyboard-latency-tracer/`.

## Affected files and commands

- `tools/keyboard-latency-tracer/Makefile`
- `tools/keyboard-latency-tracer/tracer.c`
- `tools/keyboard-latency-tracer/README.md`
- `keyboards/mode/m256wh/keymaps/mirage/config.h`
- `keyboards/neo/neo65_trimode/keymaps/aliou/config.h`
- Build: `make` inside `tools/keyboard-latency-tracer/`, then `./tracer`
