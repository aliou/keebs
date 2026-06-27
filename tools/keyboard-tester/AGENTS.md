# Keyboard tester

Local-only Vite/React/Tailwind app for testing our QMK keyboards switch by
switch while rebuilding them. Lives under `tools/keyboard-tester/` inside the
keebs repo. Not a monorepo.

Supports the DB60 (Bakeneko, `milky_neko`, 60%), Mirage (m256wh, `mirage`,
65%), and NEO65 (`neo65_trimode`, `aliou`, 65%).

## Dev env
- Nix: `nix develop .` from the keebs repo root (direnv loads it). The tester
  has no flake of its own; it rides the parent devShell's nodejs + pnpm.
- Node 22+, pnpm.

## Common commands
- Install: `pnpm install`
- Dev: `pnpm dev` -> http://127.0.0.1:5173
- Lint+format: `pnpm check`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`

## Structure
- `src/keyboards.ts` -- the keyboard registry. One `KeyDef` per switch:
  width, `KeyboardEvent.code`, base + FN labels, DFU marker, spacer flag.
  Single source of truth for the grid. Update when a keymap changes.
- `src/useKeyboardTester.ts` -- window keydown/keyup -> pressed/tested sets
  (per keyboard), plus per-key sound playback. `preventDefault`s every keydown
  so the page is not keyboard-navigable.
- `src/components/Keycap.tsx` -- one key, all visual states (pressed, tested,
  untestable, DFU warning, spacer).
- `src/sound.ts` -- Web Audio engine + VIA-style note mapping (chromatic /
  wicki-hayden / random).
- `src/theme.ts` -- auto/dark/light theme controller.
- `src/App.tsx` -- keyboard selector, grid (centered), coverage bar, layer
  toggle, DFU banner, sound panel, theme toggle, controls.
- `biome.json` -- lint + `@aliou/biome-plugins` grit rules (no emojis, no
  template-literal classNames, etc).

## Conventions
- No emojis anywhere (repo rule enforced by a grit plugin).
- No template literals in `className` -- use `src/lib/cn.ts`.
- No `.js`/`.ts` import extensions (bundler moduleResolution).
- `catch` blocks must contain real code, not only comments.
- Tailwind v4 CSS-first theme in `src/index.css` (`@theme` block; light
  overrides via `:root[data-theme="light"]`).
