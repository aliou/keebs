import { useEffect, useMemo, useRef, useState } from "react";
import type { Keyboard } from "./keyboards";
import {
  buildNoteTable,
  noteFor,
  SoundEngine,
  type SoundSettings,
  type Waveform,
} from "./sound";

export type KeyboardTesterState = {
  /** Currently held-down switch ids this frame, for the active keyboard. */
  pressedIds: Set<string>;
  /** Keys pressed at least once since reset, for the active keyboard. */
  testedIds: Set<string>;
  lastPressedId: string | null;
  lastPressedLabel: string | null;
  resetCoverage: () => void;
  clearPressed: () => void;
};

/**
 * Listens for physical key events on `window` and maps KeyboardEvent.code to
 * the active keyboard's layout. Coverage is tracked PER keyboard (so switching
 * DB60 <-> NEO65 keeps each board's progress) and kept in a ref; the active
 * board's set is mirrored into state for rendering.
 *
 * Every keydown has preventDefault called -- the page is not keyboard-
 * navigable by design: Tab cannot move focus between controls, Space cannot
 * scroll, Backspace cannot navigate back, etc. This keeps the tester's grid
 * the only thing that reacts to the keyboard. Mouse still works for controls.
 *
 * QMK momentary-layer keys (MO(1)) emit nothing and are simply never seen.
 */
export function useKeyboardTester(
  keyboard: Keyboard,
  sound: SoundSettings,
): KeyboardTesterState {
  // Coverage per keyboard id, retained across switches.
  const testedByKb = useRef<Map<string, Set<string>>>(new Map());
  const [testedIds, setTestedIds] = useState<Set<string>>(() => new Set());
  const [pressedIds, setPressedIds] = useState<Set<string>>(() => new Set());
  const [lastPressedId, setLastPressedId] = useState<string | null>(null);

  const engineRef = useRef<SoundEngine>(new SoundEngine());
  const codeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const key of keyboard.keys) {
      if (key.code !== null && !key.spacer) {
        map.set(key.code, key.id);
      }
    }
    return map;
  }, [keyboard]);

  const noteTable = useMemo(
    () =>
      buildNoteTable(
        keyboard.keys.map((k) => ({
          id: k.id,
          row: k.row,
          ...(k.spacer ? { spacer: k.spacer } : {}),
        })),
      ),
    [keyboard],
  );

  // When the active keyboard changes, surface its saved coverage (empty set if
  // new) and release any held keys from the previous board.
  useEffect(() => {
    const saved = testedByKb.current.get(keyboard.id);
    setTestedIds(saved ? new Set(saved) : new Set());
    setPressedIds(new Set());
  }, [keyboard]);

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      // The page is not keyboard-interactive: swallow Tab focus changes,
      // Space scrolling, Back/Forward, arrow scroll, etc. Captures go to the
      // grid only. Browser chrome shortcuts (reload, devtools) are OS-level
      // and unaffected.
      event.preventDefault();
      if (event.repeat) return;
      const id = codeMap.get(event.code);
      if (id === undefined) return;
      setPressedIds((prev) => addToSet(prev, id));
      setTestedIds((prev) => {
        const next = addToSet(prev, id);
        testedByKb.current.set(keyboard.id, next);
        return next;
      });
      setLastPressedId(id);
      if (sound.enabled) {
        engineRef.current.resume();
        const freq = noteFor(noteTable.get(id), sound.mode, sound.transpose);
        engineRef.current.play(freq, sound.waveform as Waveform, sound.volume);
      }
    };
    const onUp = (event: KeyboardEvent) => {
      event.preventDefault();
      const id = codeMap.get(event.code);
      if (id === undefined) return;
      setPressedIds((prev) => removeFromSet(prev, id));
    };
    const releaseAll = () => setPressedIds(new Set());

    window.addEventListener("keydown", onDown, { capture: true });
    window.addEventListener("keyup", onUp, { capture: true });
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", releaseAll);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", releaseAll);
    };
  }, [
    codeMap,
    noteTable,
    sound.enabled,
    sound.mode,
    sound.transpose,
    sound.volume,
    sound.waveform,
    keyboard,
  ]);

  const lastPressedLabel = useMemo(() => {
    if (lastPressedId === null) return null;
    return (
      keyboard.keys.find((k) => k.id === lastPressedId)?.baseLabel ??
      lastPressedId
    );
  }, [lastPressedId, keyboard]);

  const resetCoverage = () => {
    testedByKb.current.set(keyboard.id, new Set());
    setTestedIds(new Set());
    setLastPressedId(null);
  };

  const clearPressed = () => setPressedIds(new Set());

  return {
    pressedIds,
    testedIds,
    lastPressedId,
    lastPressedLabel,
    resetCoverage,
    clearPressed,
  };
}

function addToSet(prev: Set<string>, id: string): Set<string> {
  if (prev.has(id)) return prev;
  const next = new Set(prev);
  next.add(id);
  return next;
}

function removeFromSet(prev: Set<string>, id: string): Set<string> {
  if (!prev.has(id)) return prev;
  const next = new Set(prev);
  next.delete(id);
  return next;
}
