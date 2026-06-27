# Keyboard Tester

A local-only web app for rebuilding a hotswap keyboard switch by switch. Pick
your board, install a switch, press it, and watch the matching key light up
and turn green when tested.

It is not a generic tester: each entry renders that board's exact physical
layout (`LAYOUT_60_ansi` for the DB60, `LAYOUT_65_ansi_blocker` for the
Mirage and NEO65) with the labels from our keymaps, so the position that
lights up matches the switch you just seated.

## Supported boards

- **DB60** (CannonKeys Bakeneko60 hotswap, `milky_neko` keymap) -- 60%.
- **Mirage** (Mode Env m256wh, `mirage` keymap) -- 65%.
- **NEO65** (neo `neo65_trimode`, `aliou` keymap) -- 65%.

The two 65% boards share geometry; only the FN-Tab label differs (the NEO65's
Tab toggles USB/BT1).

## Stack

Vite, React, TypeScript, Tailwind CSS v4, Biome (with `@aliou/biome-plugins`).
No backend, no deploy target, no telemetry. It binds to `127.0.0.1` only.

## First run

Requires Nix with flakes (preferred) or Node 22 + pnpm.

With direnv (loaded by the keebs parent devShell, which provides nodejs + pnpm):

```
direnv allow        # builds the parent devShell
pnpm install        # first time only
pnpm dev            # http://127.0.0.1:5173
```

Without direnv:

```
nix develop .        # . in the keebs repo root -- the tester has no flake of its own
pnpm install
pnpm dev
```

## How it works

The app listens for `keydown` / `keyup` on `window` and matches
`KeyboardEvent.code` (the physical key, layout-independent) to the active
keyboard's layout. Coverage tracks each physical switch position per board
(switching boards keeps each one's progress): a key turns green once it has
registered at least once this session.

A few things follow from how QMK HID works:

- **The FN key cannot be tested.** `MO(1)` is a momentary layer: pressing it
  alone sends no HID report, so the browser never sees it. It is marked
  "untestable" and excluded from the coverage count. Switches that emit a
  base-layer keycode (Esc on a mod-tap, Tab, etc.) are tracked on their tap
  behavior -- test with a short tap, not a hold.
- **Layer preview is manual.** The browser sees resulting key events, not
  QMK's active layer, so it cannot detect that FN is held. The
  `Base` / `FN preview` toggle relabels the grid for inspection only. It does
  not change what is tracked.
- **B (and grave on 65%) is the DFU key on the FN layer.** On `milky_neko`,
  FN + B (held ~500ms) calls `reset_keyboard()` and drops into the DFU
  bootloader; the 65% boards reset on FN + grave. The FN preview marks these
  in red and a banner reminds you not to hold them while the FN layer is
  engaged. Pressing them alone on the base layer is safe and tracked normally.
- **The page is not keyboard-navigable.** Every `keydown` has
  `preventDefault` called so Tab cannot move button focus, Space cannot scroll,
  and Back/Forward arrows cannot navigate. The grid is the only thing that
  reacts to the physical keyboard. Controls are mouse-operated and blur
  themselves after a click.

## Key sounds and theme

Optional extras, both off by default:

- **Key sounds** (`Sound: on/off`, then `Tune`) play a short Web Audio tone per
  press, modelled on VIA's testing pane. Modes: Chromatic (semitones in reading
  order), Wicki-Hayden (harmonic table -- adjacent keys form chords), and
  Random (a fresh note from a C-major scale). Pick a waveform, transpose
  (-24..+24 semitones), and volume. The AudioContext is created lazily on the
  first sound.
- **Theme** (`Theme:` button) cycles Auto / Dark / Light. Auto follows the OS
  via `prefers-color-scheme`. The explicit choice is remembered in
  `localStorage`.

## Layout source

The grid geometry and labels live in `src/keyboards.ts` -- one registry with
a `KeyDef` per switch (`KeyboardEvent.code`, width, base + FN labels, DFU and
spacer flags). It is derived from each board's QMK `keyboard.json`
(`LAYOUT_*` matrix/widths) and our keymaps (`keymap.c`). If a keymap changes,
update `src/keyboards.ts` to match.

## Commands

```
pnpm dev        # vite dev server on 127.0.0.1:5173
pnpm build      # tsc --noEmit + vite build (outputs dist/)
pnpm check      # biome lint + format + grit plugins
pnpm typecheck  # tsc --noEmit
```
