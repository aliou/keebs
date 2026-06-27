// Keyboard registry: physical layouts + per-key labels for each board we run.
//
// Geometry (matrix positions + key widths) comes from upstream QMK
// `keyboard.json` for each board. Labels come from our keymaps under
// keyboards/. Every physical switch carries a `code` matching the
// `KeyboardEvent.code` the BROWSER sees when that switch is pressed on the
// BASE layer -- so a press lights up the right cell regardless of host layout.
//
// Two QMK behaviours matter for the code mapping:
//
// 1. Mod-taps (LCTL_T(KC_ESC) on the caps position). On TAP these send the
//    tap keycode (`Escape`), on HOLD they send the modifier (`ControlLeft`).
//    Switch testing is done with short taps, so we map these to their tap
//    keycode. Holding a mod-tap to "test the modifier" can collide with the
//    real modifier key (both fire the same code); tap is the reliable path.
//
// 2. QMK momentary-layer keys (MO(1)) emit NO HID report on their own, so the
//    browser never sees them. They are `code: null` and excluded from coverage.

export type KeyDef = {
  /** Stable id unique within the keyboard. */
  id: string;
  row: number;
  /** Width in 1u units. */
  width: number;
  /** KeyboardEvent.code for the base-layer tap, or null if untrackable. */
  code: string | null;
  baseLabel: string;
  baseSub?: string;
  /** FN-layer label. If unset, the FN preview falls back to baseLabel. */
  fnLabel?: string;
  fnSub?: string;
  /** Marks keys that are QK_BOOT on the FN layer (B, and grave on 65%). */
  dfu?: boolean;
  /** Inert spacer (the 65% blocker gap). Renders as an empty gap, no events. */
  spacer?: boolean;
};

export type Keyboard = {
  id: string;
  name: string;
  /** Friendly layout size for the selector. */
  size: "60%" | "65%";
  /** Total row width in 1u units, for centering. */
  widthU: number;
  keys: readonly KeyDef[];
};

const DB60_KEYS: readonly KeyDef[] = [
  // Row 0 (15u)
  {
    id: "0-0",
    row: 0,
    width: 1,
    code: "Backquote",
    baseLabel: "Grave",
    baseSub: "` ~",
  },
  {
    id: "0-1",
    row: 0,
    width: 1,
    code: "Digit1",
    baseLabel: "1",
    fnLabel: "F1",
  },
  {
    id: "0-2",
    row: 0,
    width: 1,
    code: "Digit2",
    baseLabel: "2",
    fnLabel: "F2",
  },
  {
    id: "0-3",
    row: 0,
    width: 1,
    code: "Digit3",
    baseLabel: "3",
    fnLabel: "F3",
  },
  {
    id: "0-4",
    row: 0,
    width: 1,
    code: "Digit4",
    baseLabel: "4",
    fnLabel: "F4",
  },
  {
    id: "0-5",
    row: 0,
    width: 1,
    code: "Digit5",
    baseLabel: "5",
    fnLabel: "F5",
  },
  {
    id: "0-6",
    row: 0,
    width: 1,
    code: "Digit6",
    baseLabel: "6",
    fnLabel: "F6",
  },
  {
    id: "0-7",
    row: 0,
    width: 1,
    code: "Digit7",
    baseLabel: "7",
    fnLabel: "F7",
  },
  {
    id: "0-8",
    row: 0,
    width: 1,
    code: "Digit8",
    baseLabel: "8",
    fnLabel: "F8",
  },
  {
    id: "0-9",
    row: 0,
    width: 1,
    code: "Digit9",
    baseLabel: "9",
    fnLabel: "F9",
  },
  {
    id: "0-10",
    row: 0,
    width: 1,
    code: "Digit0",
    baseLabel: "0",
    fnLabel: "F10",
  },
  {
    id: "0-11",
    row: 0,
    width: 1,
    code: "Minus",
    baseLabel: "-",
    baseSub: "_",
    fnLabel: "Vol-",
    fnSub: "mute",
  },
  {
    id: "0-12",
    row: 0,
    width: 1,
    code: "Equal",
    baseLabel: "=",
    baseSub: "+",
    fnLabel: "Vol+",
    fnSub: "mute",
  },
  {
    id: "0-14",
    row: 0,
    width: 2,
    code: "Backspace",
    baseLabel: "Bksp",
    fnLabel: "Del",
  },
  // Row 1
  { id: "1-0", row: 1, width: 1.5, code: "Tab", baseLabel: "Tab" },
  { id: "1-1", row: 1, width: 1, code: "KeyQ", baseLabel: "Q" },
  { id: "1-2", row: 1, width: 1, code: "KeyW", baseLabel: "W", fnLabel: "Up" },
  { id: "1-3", row: 1, width: 1, code: "KeyE", baseLabel: "E" },
  { id: "1-4", row: 1, width: 1, code: "KeyR", baseLabel: "R" },
  { id: "1-5", row: 1, width: 1, code: "KeyT", baseLabel: "T" },
  { id: "1-6", row: 1, width: 1, code: "KeyY", baseLabel: "Y" },
  { id: "1-7", row: 1, width: 1, code: "KeyU", baseLabel: "U" },
  { id: "1-8", row: 1, width: 1, code: "KeyI", baseLabel: "I" },
  { id: "1-9", row: 1, width: 1, code: "KeyO", baseLabel: "O" },
  { id: "1-10", row: 1, width: 1, code: "KeyP", baseLabel: "P" },
  {
    id: "1-11",
    row: 1,
    width: 1,
    code: "BracketLeft",
    baseLabel: "[",
    baseSub: "{",
    fnLabel: "F14",
  },
  {
    id: "1-12",
    row: 1,
    width: 1,
    code: "BracketRight",
    baseLabel: "]",
    baseSub: "}",
    fnLabel: "F15",
  },
  {
    id: "1-14",
    row: 1,
    width: 1.5,
    code: "Backslash",
    baseLabel: "\\",
    baseSub: "|",
    fnSub: "Fx",
  },
  // Row 2
  {
    id: "2-0",
    row: 2,
    width: 1.75,
    code: "Escape",
    baseLabel: "Esc",
    baseSub: "Ctrl tap",
    fnLabel: "Esc",
  },
  {
    id: "2-1",
    row: 2,
    width: 1,
    code: "KeyA",
    baseLabel: "A",
    fnLabel: "Left",
  },
  {
    id: "2-2",
    row: 2,
    width: 1,
    code: "KeyS",
    baseLabel: "S",
    fnLabel: "Down",
  },
  {
    id: "2-3",
    row: 2,
    width: 1,
    code: "KeyD",
    baseLabel: "D",
    fnLabel: "Right",
  },
  { id: "2-4", row: 2, width: 1, code: "KeyF", baseLabel: "F" },
  { id: "2-5", row: 2, width: 1, code: "KeyG", baseLabel: "G" },
  { id: "2-6", row: 2, width: 1, code: "KeyH", baseLabel: "H" },
  { id: "2-7", row: 2, width: 1, code: "KeyJ", baseLabel: "J" },
  { id: "2-8", row: 2, width: 1, code: "KeyK", baseLabel: "K" },
  { id: "2-9", row: 2, width: 1, code: "KeyL", baseLabel: "L" },
  {
    id: "2-11",
    row: 2,
    width: 1,
    code: "Semicolon",
    baseLabel: ";",
    baseSub: ":",
    fnLabel: "Prev",
  },
  {
    id: "2-12",
    row: 2,
    width: 1,
    code: "Quote",
    baseLabel: "'",
    baseSub: '"',
    fnLabel: "Next",
  },
  { id: "2-14", row: 2, width: 2.25, code: "Enter", baseLabel: "Enter" },
  // Row 3
  { id: "3-0", row: 3, width: 2.25, code: "ShiftLeft", baseLabel: "Shift" },
  { id: "3-2", row: 3, width: 1, code: "KeyZ", baseLabel: "Z" },
  { id: "3-3", row: 3, width: 1, code: "KeyX", baseLabel: "X" },
  { id: "3-4", row: 3, width: 1, code: "KeyC", baseLabel: "C" },
  { id: "3-5", row: 3, width: 1, code: "KeyV", baseLabel: "V" },
  {
    id: "3-6",
    row: 3,
    width: 1,
    code: "KeyB",
    baseLabel: "B",
    fnLabel: "DFU",
    fnSub: "hold 500ms",
    dfu: true,
  },
  { id: "3-7", row: 3, width: 1, code: "KeyN", baseLabel: "N" },
  { id: "3-8", row: 3, width: 1, code: "KeyM", baseLabel: "M" },
  { id: "3-9", row: 3, width: 1, code: "Comma", baseLabel: ",", baseSub: "<" },
  {
    id: "3-10",
    row: 3,
    width: 1,
    code: "Period",
    baseLabel: ".",
    baseSub: ">",
  },
  { id: "3-11", row: 3, width: 1, code: "Slash", baseLabel: "/", baseSub: "?" },
  {
    id: "3-12",
    row: 3,
    width: 2.75,
    code: "ShiftRight",
    baseLabel: "Shift",
    fnLabel: "Up",
  },
  // Row 4
  { id: "4-0", row: 4, width: 1.25, code: "ControlLeft", baseLabel: "Ctrl" },
  { id: "4-1", row: 4, width: 1.25, code: "AltLeft", baseLabel: "Alt" },
  {
    id: "4-2",
    row: 4,
    width: 1.25,
    code: "MetaLeft",
    baseLabel: "Cmd",
    baseSub: "Win",
  },
  { id: "4-6", row: 4, width: 6.25, code: "Space", baseLabel: "Space" },
  {
    id: "4-10",
    row: 4,
    width: 1.25,
    code: null,
    baseLabel: "FN",
    baseSub: "momentary",
    fnLabel: "MO(1)",
    fnSub: "layer",
  },
  {
    id: "4-11",
    row: 4,
    width: 1.25,
    code: "MetaRight",
    baseLabel: "Cmd",
    fnLabel: "Left",
  },
  {
    id: "4-12",
    row: 4,
    width: 1.25,
    code: "AltRight",
    baseLabel: "Alt",
    fnLabel: "Down",
  },
  {
    id: "4-14",
    row: 4,
    width: 1.25,
    code: "ControlRight",
    baseLabel: "Ctrl",
    fnLabel: "Right",
  },
];

/**
 * Shared 65% geometry (LAYOUT_65_ansi_blocker, 16u wide). The Mode Mirage
 * (m256wh) and NEO65 (neo65_trimode) use the same physical layout; their
 * keymaps differ only on the FN-Tab key, so we parameterize that one label.
 *
 * Genealogy marked per our overlays under keyboards/.
 */
function buildKeys65(tabFn: "USB<->BT1" | undefined): readonly KeyDef[] {
  return [
    // Row 0 (16u)
    {
      id: "65-0-0",
      row: 0,
      width: 1,
      code: "Backquote",
      baseLabel: "Grave",
      baseSub: "` ~",
      fnLabel: "BOOT",
      fnSub: "reset",
      dfu: true,
    },
    {
      id: "65-0-1",
      row: 0,
      width: 1,
      code: "Digit1",
      baseLabel: "1",
      fnLabel: "F1",
    },
    {
      id: "65-0-2",
      row: 0,
      width: 1,
      code: "Digit2",
      baseLabel: "2",
      fnLabel: "F2",
    },
    {
      id: "65-0-3",
      row: 0,
      width: 1,
      code: "Digit3",
      baseLabel: "3",
      fnLabel: "F3",
    },
    {
      id: "65-0-4",
      row: 0,
      width: 1,
      code: "Digit4",
      baseLabel: "4",
      fnLabel: "F4",
    },
    {
      id: "65-0-5",
      row: 0,
      width: 1,
      code: "Digit5",
      baseLabel: "5",
      fnLabel: "F5",
    },
    {
      id: "65-0-6",
      row: 0,
      width: 1,
      code: "Digit6",
      baseLabel: "6",
      fnLabel: "F6",
    },
    {
      id: "65-0-7",
      row: 0,
      width: 1,
      code: "Digit7",
      baseLabel: "7",
      fnLabel: "F7",
    },
    {
      id: "65-0-8",
      row: 0,
      width: 1,
      code: "Digit8",
      baseLabel: "8",
      fnLabel: "F8",
    },
    {
      id: "65-0-9",
      row: 0,
      width: 1,
      code: "Digit9",
      baseLabel: "9",
      fnLabel: "F9",
    },
    {
      id: "65-0-10",
      row: 0,
      width: 1,
      code: "Digit0",
      baseLabel: "0",
      fnLabel: "F10",
    },
    {
      id: "65-0-11",
      row: 0,
      width: 1,
      code: "Minus",
      baseLabel: "-",
      baseSub: "_",
      fnLabel: "F11",
    },
    {
      id: "65-0-12",
      row: 0,
      width: 1,
      code: "Equal",
      baseLabel: "=",
      baseSub: "+",
      fnLabel: "F12",
    },
    {
      id: "65-0-13",
      row: 0,
      width: 2,
      code: "Backspace",
      baseLabel: "Bksp",
      fnLabel: "Del",
    },
    {
      id: "65-0-14",
      row: 0,
      width: 1,
      code: "Delete",
      baseLabel: "Del",
      fnLabel: "Mute",
    },
    // Row 1
    {
      id: "65-1-0",
      row: 1,
      width: 1.5,
      code: "Tab",
      baseLabel: "Tab",
      ...(tabFn ? { fnLabel: tabFn } : {}),
    },
    { id: "65-1-1", row: 1, width: 1, code: "KeyQ", baseLabel: "Q" },
    {
      id: "65-1-2",
      row: 1,
      width: 1,
      code: "KeyW",
      baseLabel: "W",
      fnLabel: "Up",
    },
    { id: "65-1-3", row: 1, width: 1, code: "KeyE", baseLabel: "E" },
    { id: "65-1-4", row: 1, width: 1, code: "KeyR", baseLabel: "R" },
    { id: "65-1-5", row: 1, width: 1, code: "KeyT", baseLabel: "T" },
    { id: "65-1-6", row: 1, width: 1, code: "KeyY", baseLabel: "Y" },
    { id: "65-1-7", row: 1, width: 1, code: "KeyU", baseLabel: "U" },
    { id: "65-1-8", row: 1, width: 1, code: "KeyI", baseLabel: "I" },
    { id: "65-1-9", row: 1, width: 1, code: "KeyO", baseLabel: "O" },
    { id: "65-1-10", row: 1, width: 1, code: "KeyP", baseLabel: "P" },
    {
      id: "65-1-11",
      row: 1,
      width: 1,
      code: "BracketLeft",
      baseLabel: "[",
      baseSub: "{",
      fnLabel: "F14",
    },
    {
      id: "65-1-12",
      row: 1,
      width: 1,
      code: "BracketRight",
      baseLabel: "]",
      baseSub: "}",
      fnLabel: "F15",
    },
    {
      id: "65-1-13",
      row: 1,
      width: 1.5,
      code: "Backslash",
      baseLabel: "\\",
      baseSub: "|",
      fnSub: "Fx",
    },
    {
      id: "65-1-14",
      row: 1,
      width: 1,
      code: "PageUp",
      baseLabel: "PgUp",
      fnLabel: "Vol+",
    },
    // Row 2
    {
      id: "65-2-0",
      row: 2,
      width: 1.75,
      code: "Escape",
      baseLabel: "Esc",
      baseSub: "Ctrl tap",
      fnLabel: "Esc",
    },
    {
      id: "65-2-1",
      row: 2,
      width: 1,
      code: "KeyA",
      baseLabel: "A",
      fnLabel: "Left",
    },
    {
      id: "65-2-2",
      row: 2,
      width: 1,
      code: "KeyS",
      baseLabel: "S",
      fnLabel: "Down",
    },
    {
      id: "65-2-3",
      row: 2,
      width: 1,
      code: "KeyD",
      baseLabel: "D",
      fnLabel: "Right",
    },
    { id: "65-2-4", row: 2, width: 1, code: "KeyF", baseLabel: "F" },
    { id: "65-2-5", row: 2, width: 1, code: "KeyG", baseLabel: "G" },
    { id: "65-2-6", row: 2, width: 1, code: "KeyH", baseLabel: "H" },
    { id: "65-2-7", row: 2, width: 1, code: "KeyJ", baseLabel: "J" },
    { id: "65-2-8", row: 2, width: 1, code: "KeyK", baseLabel: "K" },
    { id: "65-2-9", row: 2, width: 1, code: "KeyL", baseLabel: "L" },
    {
      id: "65-2-11",
      row: 2,
      width: 1,
      code: "Semicolon",
      baseLabel: ";",
      baseSub: ":",
      fnLabel: "Prev",
    },
    {
      id: "65-2-12",
      row: 2,
      width: 1,
      code: "Quote",
      baseLabel: "'",
      baseSub: '"',
      fnLabel: "Next",
    },
    { id: "65-2-13", row: 2, width: 2.25, code: "Enter", baseLabel: "Enter" },
    {
      id: "65-2-14",
      row: 2,
      width: 1,
      code: "PageDown",
      baseLabel: "PgDn",
      fnLabel: "Vol-",
    },
    // Row 3
    {
      id: "65-3-0",
      row: 3,
      width: 2.25,
      code: "ShiftLeft",
      baseLabel: "Shift",
    },
    { id: "65-3-2", row: 3, width: 1, code: "KeyZ", baseLabel: "Z" },
    { id: "65-3-3", row: 3, width: 1, code: "KeyX", baseLabel: "X" },
    { id: "65-3-4", row: 3, width: 1, code: "KeyC", baseLabel: "C" },
    { id: "65-3-5", row: 3, width: 1, code: "KeyV", baseLabel: "V" },
    {
      id: "65-3-6",
      row: 3,
      width: 1,
      code: "KeyB",
      baseLabel: "B",
      fnLabel: "DFU",
      fnSub: "hold 500ms",
      dfu: true,
    },
    { id: "65-3-7", row: 3, width: 1, code: "KeyN", baseLabel: "N" },
    { id: "65-3-8", row: 3, width: 1, code: "KeyM", baseLabel: "M" },
    {
      id: "65-3-9",
      row: 3,
      width: 1,
      code: "Comma",
      baseLabel: ",",
      baseSub: "<",
    },
    {
      id: "65-3-10",
      row: 3,
      width: 1,
      code: "Period",
      baseLabel: ".",
      baseSub: ">",
    },
    {
      id: "65-3-11",
      row: 3,
      width: 1,
      code: "Slash",
      baseLabel: "/",
      baseSub: "?",
    },
    {
      id: "65-3-12",
      row: 3,
      width: 1.75,
      code: "ShiftRight",
      baseLabel: "Shift",
    },
    { id: "65-3-13", row: 3, width: 1, code: "ArrowUp", baseLabel: "Up" },
    {
      id: "65-3-14",
      row: 3,
      width: 1,
      code: "End",
      baseLabel: "End",
      fnLabel: "Play",
    },
    // Row 4
    {
      id: "65-4-0",
      row: 4,
      width: 1.25,
      code: "ControlLeft",
      baseLabel: "Ctrl",
      baseSub: "Fn dbl-tap",
      fnLabel: "Ctrl",
    },
    { id: "65-4-1", row: 4, width: 1.25, code: "AltLeft", baseLabel: "Alt" },
    {
      id: "65-4-2",
      row: 4,
      width: 1.25,
      code: "MetaLeft",
      baseLabel: "Cmd",
      baseSub: "Win",
    },
    { id: "65-4-15", row: 4, width: 6.25, code: "Space", baseLabel: "Space" },
    {
      id: "65-4-9",
      row: 4,
      width: 1.25,
      code: null,
      baseLabel: "FN",
      baseSub: "momentary",
      fnLabel: "MO(1)",
      fnSub: "layer",
    },
    { id: "65-4-10", row: 4, width: 1.25, code: "MetaRight", baseLabel: "Cmd" },
    // 0.5u blocker gap aligns the arrows with the right column.
    {
      id: "65-4-gap",
      row: 4,
      width: 0.5,
      code: null,
      baseLabel: "",
      spacer: true,
    },
    { id: "65-4-11", row: 4, width: 1, code: "ArrowLeft", baseLabel: "Left" },
    { id: "65-4-12", row: 4, width: 1, code: "ArrowDown", baseLabel: "Down" },
    { id: "65-4-13", row: 4, width: 1, code: "ArrowRight", baseLabel: "Right" },
  ];
}

export const KEYBOARDS: ReadonlyArray<Keyboard> = [
  {
    id: "db60",
    name: "DB60 / Bakeneko (milky_neko)",
    size: "60%",
    widthU: 15,
    keys: DB60_KEYS,
  },
  {
    id: "mirage",
    name: "Mode Mirage (m256wh)",
    size: "65%",
    widthU: 16,
    keys: buildKeys65(undefined),
  },
  {
    id: "neo65",
    name: "NEO65 tri-mode (aliou)",
    size: "65%",
    widthU: 16,
    keys: buildKeys65("USB<->BT1"),
  },
];

export function getKeyboard(id: string): Keyboard {
  const kb = KEYBOARDS.find((k) => k.id === id);
  if (kb !== undefined) {
    return kb;
  }
  const fallback = KEYBOARDS[0];
  if (fallback === undefined) {
    throw new Error("no keyboards registered");
  }
  return fallback;
}

/** Build a code -> key id map for the given keyboard's testable switches. */
export function codeToIdMap(kb: Keyboard): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const key of kb.keys) {
    if (key.code !== null && !key.spacer) {
      map.set(key.code, key.id);
    }
  }
  return map;
}

/** The set of switches the browser can never observe (MO(1) etc.). */
export function untestableIds(kb: Keyboard): ReadonlySet<string> {
  const set = new Set<string>();
  for (const key of kb.keys) {
    if (!key.spacer && key.code === null) {
      set.add(key.id);
    }
  }
  return set;
}
