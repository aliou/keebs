// Key-sound engine, modelled on VIA's Testing pane (the-via/app, GPL-3.0).
//
// VIA maps each keypress to a musical note via Web Audio oscillators (no audio
// assets). It offers three mapping modes -- Chromatic, Wicki-Hayden, and
// Random -- plus a waveform selector and a global transpose. We reproduce the
// same shape so the tester plays little melodies while you rebuild the board.
//
//   Chromatic     consecutive semitones, reading order (top-left -> bottom-
//                 right). Predictable "scale up the keyboard" feel.
//   Wicki-Hayden  harmonic table: each row down = +7 semitones (perfect
//                 fifth), each column right = +2 (whole step). Jam-friendly,
//                 adjacent keys form chords.
//   Random        a fresh note from a C major scale spanning ~2 octaves, per
//                 press. Good for spotting double-fires without a fixed pitch.

export type SoundMode = "chromatic" | "wicki-hayden" | "random";
export type Waveform = OscillatorType;

export type SoundSettings = {
  enabled: boolean;
  mode: SoundMode;
  waveform: Waveform;
  transpose: number; // semitones, -24..+24
  volume: number; // 0..1
};

export const DEFAULT_SOUND: SoundSettings = {
  enabled: false,
  mode: "chromatic",
  waveform: "sine",
  transpose: 0,
  volume: 0.5,
};

type Position = {
  /** Linear index of this key across the whole keyboard (row-major). */
  index: number;
  row: number;
  /** 0-based position within its row. */
  colInRow: number;
};

const BASE_MIDI = 48; // C3 -- low enough that a full keyboard stays musical up top.
const RANDOM_SCALE = [0, 2, 4, 5, 7, 9, 11]; // C major (ionian) intervals.

function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Per-key note lookup table for a keyboard: id -> base MIDI note (before
 * transpose), plus its row/column for the Wicki-Hayden mode. Computed once per
 * keyboard in App and handed to the press handler.
 */
export type NoteTable = ReadonlyMap<
  string,
  { index: number; row: number; colInRow: number }
>;

export function buildNoteTable(
  keys: ReadonlyArray<{ id: string; row: number; spacer?: boolean }>,
): NoteTable {
  const table = new Map<
    string,
    { index: number; row: number; colInRow: number }
  >();
  const colByRow = new Map<number, number>();
  let index = 0;
  for (const key of keys) {
    if (key.spacer === true) continue;
    const col = colByRow.get(key.row) ?? 0;
    table.set(key.id, { index, row: key.row, colInRow: col });
    colByRow.set(key.row, col + 1);
    index += 1;
  }
  return table;
}

export function noteFor(
  pos: Position | undefined,
  mode: SoundMode,
  transpose: number,
): number {
  if (pos === undefined) {
    return midiToFreq(BASE_MIDI);
  }
  let midi: number;
  switch (mode) {
    case "chromatic":
      midi = BASE_MIDI + pos.index;
      break;
    case "wicki-hayden":
      midi = BASE_MIDI + pos.row * 7 + pos.colInRow * 2;
      break;
    case "random": {
      const step =
        RANDOM_SCALE[Math.floor(Math.random() * RANDOM_SCALE.length)];
      midi = BASE_MIDI + (step ?? 0) + 12 * Math.floor(Math.random() * 3);
      break;
    }
  }
  return midiToFreq(midi + transpose);
}

/**
 * Lazy Web Audio engine. The AudioContext is created on first use (after a
 * user gesture, to satisfy browser autoplay policy) and reused. If the context
 * can't be created, play() is a no-op -- the tester keeps working silently.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;

  resume(): void {
    const Ctor = window.AudioContext;
    if (Ctor === undefined) return;
    try {
      if (this.ctx === null) {
        this.ctx = new Ctor();
      }
      if (this.ctx.state === "suspended") {
        void this.ctx.resume();
      }
    } catch {
      this.ctx = null;
    }
  }

  play(
    freq: number,
    waveform: Waveform,
    volume: number,
    durationMs = 220,
  ): void {
    const ctx = this.ctx;
    if (ctx === null) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, now);
    // Quick attack, exponential decay -- a short pluck rather than a beep.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(volume, 0.0002),
      now + 0.01,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  }
}
