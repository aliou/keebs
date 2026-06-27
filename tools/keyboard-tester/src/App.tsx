import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Keycap, type PreviewLayer } from "./components/Keycap";
import { getKeyboard, KEYBOARDS, type Keyboard } from "./keyboards";
import { cn } from "./lib/cn";
import {
  DEFAULT_SOUND,
  type SoundMode,
  type SoundSettings,
  type Waveform,
} from "./sound";
import { type ThemeChoice, useTheme } from "./theme";
import { useKeyboardTester } from "./useKeyboardTester";

const THEME_LABEL: Record<ThemeChoice, string> = {
  system: "Auto",
  dark: "Dark",
  light: "Light",
};
const THEME_CYCLE: ThemeChoice[] = ["system", "dark", "light"];

const WAVEFORMS: ReadonlyArray<{ value: Waveform; label: string }> = [
  { value: "sine", label: "Sine" },
  { value: "triangle", label: "Triangle" },
  { value: "sawtooth", label: "Sawtooth" },
  { value: "square", label: "Square" },
];
const MODES: ReadonlyArray<{ value: SoundMode; label: string }> = [
  { value: "chromatic", label: "Chromatic" },
  { value: "wicki-hayden", label: "Wicki-Hayden" },
  { value: "random", label: "Random" },
];

function rowsFor(
  kb: Keyboard,
): ReadonlyArray<ReadonlyArray<Keyboard["keys"][number]>> {
  return [0, 1, 2, 3, 4].map((r) => kb.keys.filter((k) => k.row === r));
}

export function App() {
  const { choice: themeChoice, setChoice: setTheme } = useTheme();
  const [keyboardId, setKeyboardId] = useState<string>("db60");
  const [previewLayer, setPreviewLayer] = useState<PreviewLayer>(0);
  const [sound, setSound] = useState<SoundSettings>(DEFAULT_SOUND);
  const [soundPanelOpen, setSoundPanelOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const disarmTimer = useRef<number | null>(null);

  const keyboard = getKeyboard(keyboardId);
  const {
    pressedIds,
    testedIds,
    lastPressedLabel,
    resetCoverage,
    clearPressed,
  } = useKeyboardTester(keyboard, sound);

  const rows = useMemo(() => rowsFor(keyboard), [keyboard]);
  const testableTotal = useMemo(
    () => keyboard.keys.filter((k) => !k.spacer && k.code !== null).length,
    [keyboard],
  );
  const testedCount = testedIds.size;
  const percent = Math.round((testedCount / testableTotal) * 100);
  const onFn = previewLayer === 1;
  const dfuCount = useMemo(
    () => keyboard.keys.filter((k) => k.dfu).length,
    [keyboard],
  );
  const untestableCount = useMemo(
    () => keyboard.keys.filter((k) => !k.spacer && k.code === null).length,
    [keyboard],
  );

  useEffect(() => {
    if (!resetArmed) return;
    disarmTimer.current = window.setTimeout(() => setResetArmed(false), 3000);
    return () => {
      if (disarmTimer.current !== null) {
        window.clearTimeout(disarmTimer.current);
        disarmTimer.current = null;
      }
    };
  }, [resetArmed]);

  // Blur any control after a click so a held key (Space/Enter etc.) never
  // re-fires it -- the grid is the only keyboard-reactive surface.
  const blurActive = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <main className="min-h-full w-full px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-text">
              Keyboard Tester
            </h1>
            <p className="mt-1 text-xs text-muted">
              Press each switch once; it lights up on press and turns green when
              tested.
            </p>
          </div>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              const i = THEME_CYCLE.indexOf(themeChoice);
              setTheme(THEME_CYCLE[(i + 1) % THEME_CYCLE.length] ?? "system");
              blurActive();
            }}
            className="rounded-md border border-key-border bg-panel px-3 py-1 text-xs text-muted transition-colors hover:text-text"
          >
            Theme: {THEME_LABEL[themeChoice]}
          </button>
        </header>

        <section className="mb-4 flex flex-wrap items-center gap-2">
          <label
            className="text-[0.6rem] tracking-wide text-muted uppercase"
            htmlFor="kb-select"
          >
            Keyboard
          </label>
          <select
            id="kb-select"
            tabIndex={-1}
            value={keyboardId}
            onChange={(e) => {
              setKeyboardId(e.target.value);
            }}
            className="rounded-md border border-key-border bg-panel px-2 py-1 text-xs text-text"
          >
            {KEYBOARDS.map((kb) => (
              <option key={kb.id} value={kb.id}>
                {kb.name} ({kb.size})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-md border border-key-border bg-panel p-0.5">
            <ToggleButton active={!onFn} onClick={() => setPreviewLayer(0)}>
              Base
            </ToggleButton>
            <ToggleButton active={onFn} onClick={() => setPreviewLayer(1)}>
              FN preview
            </ToggleButton>
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setSound((s) => {
                const next = { ...s, enabled: !s.enabled };
                if (next.enabled) setSoundPanelOpen(true);
                return next;
              });
              blurActive();
            }}
            className={cn(
              "rounded-md border px-3 py-1 text-xs transition-colors",
              sound.enabled
                ? "border-active bg-active/20 text-active"
                : "border-key-border bg-panel text-muted",
            )}
          >
            Sound: {sound.enabled ? "on" : "off"}
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setSoundPanelOpen((o) => !o);
              blurActive();
            }}
            className="rounded-md border border-key-border bg-panel px-3 py-1 text-xs text-muted transition-colors hover:text-text"
          >
            {soundPanelOpen ? "Hide" : "Tune"}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              clearPressed();
              blurActive();
            }}
            className="rounded-md border border-key-border bg-panel px-3 py-1 text-xs text-muted transition-colors hover:text-text"
          >
            Clear held
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (resetArmed) {
                resetCoverage();
                setResetArmed(false);
              } else {
                setResetArmed(true);
              }
              blurActive();
            }}
            className={cn(
              "rounded-md border px-3 py-1 text-xs transition-colors",
              resetArmed
                ? "border-danger bg-danger/20 text-warning"
                : "border-key-border bg-panel text-muted hover:text-text",
            )}
          >
            {resetArmed ? "Confirm reset?" : "Reset coverage"}
          </button>
        </section>

        {soundPanelOpen && (
          <SoundPanel
            sound={sound}
            onChange={(patch) => setSound((s) => ({ ...s, ...patch }))}
          />
        )}

        <section className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-key-border bg-panel px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-text">
              {testedCount}
              <span className="text-muted"> / {testableTotal}</span>
            </span>
            <span className="text-[0.6rem] tracking-wide text-muted uppercase">
              tested
            </span>
          </div>
          <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-key">
            <div
              className="h-full rounded-full bg-tested transition-all duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="text-xs text-muted">
            last:{" "}
            <span className="text-text">{lastPressedLabel ?? "none yet"}</span>
          </div>
          {untestableCount > 0 && (
            <div className="text-[0.6rem] tracking-wide text-muted uppercase">
              {untestableCount} untestable (FN)
            </div>
          )}
        </section>

        {onFn && (
          <section className="mb-4 rounded-md border border-danger/60 bg-danger/10 px-4 py-2 text-xs text-warning">
            FN preview active. Red keys are QK_BOOT on the FN layer
            {dfuCount > 1 ? " (grave + B)" : " (B)"}: hold one ~500ms and the
            board drops into its bootloader. Do not hold them while FN is
            engaged.
          </section>
        )}

        <section
          aria-label={`${keyboard.name} physical layout`}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-key-border bg-panel p-4"
        >
          {rows.map((row, i) => (
            <div
              key={row[0]?.id ?? i}
              className="flex"
              style={{ gap: "var(--gap)" }}
            >
              {row.map((def) => (
                <Keycap
                  key={def.id}
                  def={def}
                  previewLayer={previewLayer}
                  pressed={pressedIds.has(def.id)}
                  tested={testedIds.has(def.id)}
                />
              ))}
            </div>
          ))}
        </section>

        <footer className="mt-5 text-[0.65rem] leading-relaxed text-muted">
          Install a switch, press it once, confirm that position turns green.
          Missing switches simply do nothing. The FN key is a QMK momentary
          layer and emits no HID report, so it cannot be tracked. Mod-taps
          (Esc/Ctrl on the caps key) are matched on their tap keycode -- test
          with a short tap, not a hold.
        </footer>
      </div>
    </main>
  );
}

type SoundPanelProps = {
  sound: SoundSettings;
  onChange: (patch: Partial<SoundSettings>) => void;
};

function SoundPanel({ sound, onChange }: SoundPanelProps) {
  return (
    <section className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-key-border bg-panel px-4 py-3 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Mode">
        <select
          tabIndex={-1}
          aria-label="Mode"
          value={sound.mode}
          onChange={(e) => onChange({ mode: e.target.value as SoundMode })}
          className="w-full rounded border border-key-border bg-key px-2 py-1 text-text"
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Waveform">
        <select
          tabIndex={-1}
          aria-label="Waveform"
          value={sound.waveform}
          onChange={(e) => onChange({ waveform: e.target.value as Waveform })}
          className="w-full rounded border border-key-border bg-key px-2 py-1 text-text"
        >
          {WAVEFORMS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={`Volume ${Math.round(sound.volume * 100)}`}>
        <input
          tabIndex={-1}
          type="range"
          aria-label="Volume"
          min={0}
          max={100}
          value={Math.round(sound.volume * 100)}
          onChange={(e) => onChange({ volume: Number(e.target.value) / 100 })}
          className="w-full"
        />
      </Field>
      <Field
        label={`Transpose ${sound.transpose > 0 ? `+${sound.transpose}` : sound.transpose}`}
      >
        <input
          tabIndex={-1}
          type="range"
          aria-label="Transpose"
          min={-24}
          max={24}
          value={sound.transpose}
          onChange={(e) => onChange({ transpose: Number(e.target.value) })}
          className="w-full"
        />
      </Field>
    </section>
  );
}

type FieldProps = { label: string; children: ReactNode };

function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.6rem] tracking-wide text-muted uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

type ToggleButtonProps = {
  active: boolean;
  onClick: () => void;
  children: string;
};

function ToggleButton({ active, onClick, children }: ToggleButtonProps) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1 text-xs transition-colors",
        active ? "bg-active/20 text-active" : "text-muted hover:text-text",
      )}
    >
      {children}
    </button>
  );
}
