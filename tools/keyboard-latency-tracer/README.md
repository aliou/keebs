# keyboard-latency-tracer

A tiny macOS host-side tool to debug QMK modtap latency (e.g. `LCTL_T(KC_ESC)`
on a Mirage build feeling sluggish when doing `Ctrl + anything`).

It does NOT modify the keyboard. It only records every key event the OS sees,
with high-resolution timestamps, so you can measure the gap between the control
modifier going down and the next typed character going down. With a non-modded
keyboard (e.g. qk65) that gap is basically the time you take to roll your
fingers. With a modtap, if QMK is holding the modifier event until a second key
or `TAPPING_TERM` triggers it, you'll see it.

## What it measures

For every event it prints one line:

```
<mach_ns> <us_since_prev_line> <kind> keycode=<code> name=<label> flags=<modifiers>
```

- `kind` ∈ {`FLAGS`, `DOWN`, `UP`}
- `flags` is the modifier mask AFTER the event (e.g. `CTL`, `CTL|SHIFT`)
- `us_since_prev_line` is microseconds between two consecutive OS-side events.
  This is the number we care about: when you hold Ctrl and then press `c`,
  the gap between the OS receiving `LCTL down` and receiving `c down`. If QMK
  emits them back-to-back, this is ~0-2000us. If QMK is deferring the modifier
  until tapping term, this is 200,000us (the whole tapping term!).

## Build

```
make
```

You need Xcode command line tools (`xcode-select --install`).

## Run

```
./tracer
```

No `sudo`: the Input Monitoring permission attaches to the app that owns the
process, which is your Terminal.

The first run macOS will block the tap and show a dialog asking you to grant
**Input Monitoring** to Terminal (or whatever app launched it). Grant it, then
re-run.

## Stopping

Stop with any of:
- **Bare `q`** (no modifiers) on the tested keyboard.
- **10 seconds of no activity** (auto-stop).
- **`pkill tracer`** (SIGTERM) from another terminal.

Ctrl+C, Ctrl+Z, and Ctrl+\ are explicitly ignored by the tracer so you can
freely type any Ctrl+key combo (including Ctrl+C) as a test case.

## Test procedure

For each keyboard, do the same sequence and compare the printed numbers:

1. Tap the left Ctrl/Esc key once alone. (Mirage: ESC should fire on release.)
2. Hold the left Ctrl key down, then tap `c`. Release c. Release Ctrl.
   -> Maintain a steady roll (~same speed on both boards).
3. Hold the left Ctrl key down, then type `hello`.

On the Mirage, the only modifier resolution point is at the second keypress, so
the LCTL-down event and the `c`-down event should arrive ~together. If you see
the c-down arrive noticeably before any LCTL-down event, or see a ~200ms gap
between them, that is the modtap latency.

Compare the same run on the qk65.
