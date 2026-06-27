# Keyboard tester web app

Dated: 2026-06-27

## Background

When rebuilding a hotswap keyboard switch by switch, it is useful to verify
that each seated switch actually registers before moving on. A switch tester
page that renders the exact physical layout of each board makes this fast.

## Goals

- Show a per-board layout (DB60 60%, Mirage 65%, NEO65 65%) with the labels
  from our keymaps.
- Press a physical switch and see the matching cell light up, then turn green
  once it has been tested.
- Keep the app local-only, offline, and simple to run from the existing Nix
  devShell.

## Decision

Build a small Vite + React + TypeScript + Tailwind CSS v4 app in
`tools/keyboard-tester/`. It rides the root devShell's `nodejs` and `pnpm`;
it does not have its own flake.

Key design choices:

- Match by `KeyboardEvent.code` (physical position) instead of `key`, so
  layout-independent physical switch positions are tracked.
- Maintain a per-keyboard tested set; switching boards preserves progress.
- The physical `MO(1)` FN key emits no HID report, so it cannot be tested in
  the browser. It is marked "untestable" and excluded from the coverage count.
- Call `preventDefault()` on every `keydown` so the page is not
  keyboard-navigable (Tab cannot move focus, Space cannot scroll, etc.). All
  UI controls are mouse-operated.
- Add optional VIA-style Web Audio key sounds and a dark/light/auto theme.
- Bind the dev server to `127.0.0.1` only.

## Implementation

- `src/keyboards.ts`: `KeyDef` registry for each board, with width,
  `KeyboardEvent.code`, base/FN labels, DFU-marker, and spacer flags.
- `src/useKeyboardTester.ts`: global keydown/keyup handling, per-keyboard
  pressed/tested state, coverage bar.
- `src/sound.ts`: Web Audio tone engine with chromatic, Wicki-Hayden, and
  random note mappings.
- `src/theme.ts`: auto/dark/light theme controller using
  `localStorage` and `prefers-color-scheme`.
- `src/App.tsx`: board selector, centered grid, layer preview, sound panel,
  theme toggle, reset flow.
- `src/components/Keycap.tsx`: visual states for pressed, tested,
  untestable, and DFU-warning cells.

## Risks

- The browser sees the final HID key event, not the QMK layer state, so the
  app cannot detect that FN is held. The `Base` / `FN preview` toggle only
  relabels the grid for inspection.
- Layout data is hand-maintained. If a keymap changes, `src/keyboards.ts`
  must be updated to keep the visual match accurate.
- DFU keys (`B` on DB60, grave on the 65% boards) call `QK_BOOT` when held
  on the FN layer. A banner warns not to hold them while FN is engaged.

## Status

Implemented. `pnpm check` and `pnpm typecheck` are clean, and `pnpm build`
outputs a static `dist/` bundle.

## Affected files and commands

- `tools/keyboard-tester/...`
- `flake.nix` (added `nodejs` and `pnpm` to the devShell)
- Dev: `cd tools/keyboard-tester && pnpm dev`
- Check: `pnpm check`, `pnpm typecheck`
- Build: `pnpm build`
