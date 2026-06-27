import type { KeyDef } from "../keyboards";
import { cn } from "../lib/cn";

export type PreviewLayer = 0 | 1;

export type KeycapProps = {
  def: KeyDef;
  previewLayer: PreviewLayer;
  pressed: boolean;
  tested: boolean;
};

export function Keycap({ def, previewLayer, pressed, tested }: KeycapProps) {
  if (def.spacer === true) {
    return <div aria-hidden style={{ width: widthFor(def.width) }} />;
  }

  const onFn = previewLayer === 1;
  const label = onFn ? (def.fnLabel ?? def.baseLabel) : def.baseLabel;
  const sub = onFn ? (def.fnSub ?? def.baseSub) : def.baseSub;
  const dfuWarn = onFn && def.dfu === true;
  const untestable = def.code === null;
  const showTestedDot = tested && !pressed && !dfuWarn;
  const showLabel = label.length > 0;

  const labelClass =
    label.length > 3
      ? "text-[0.6rem] font-semibold leading-none"
      : "text-sm font-semibold leading-none";

  const stateClass = pressed
    ? "translate-y-0.5 border-active bg-active/25 text-active shadow-[inset_0_2px_8px_rgba(0,0,0,0.55),0_0_18px_var(--color-active)]"
    : dfuWarn
      ? "border-danger bg-danger/15 text-warning ring-2 ring-danger/40"
      : untestable
        ? "border-dashed border-key-border/60 opacity-60"
        : tested
          ? "border-tested/70"
          : "border-key-border";

  return (
    <div
      className={cn(
        "relative flex h-[var(--u)] select-none flex-col items-center justify-center rounded-md border bg-gradient-to-b from-key-top to-key px-0.5 text-center transition-all duration-75",
        stateClass,
        showTestedDot &&
          "after:absolute after:right-1 after:top-1 after:size-1.5 after:rounded-full after:bg-tested after:content-['']",
      )}
      style={{ width: widthFor(def.width) }}
    >
      {showLabel && <span className={labelClass}>{label}</span>}
      {sub !== undefined && (
        <span className="mt-0.5 text-[0.5rem] tracking-wide text-muted uppercase">
          {sub}
        </span>
      )}
    </div>
  );
}

function widthFor(units: number): string {
  return `calc(var(--u) * ${units} + var(--gap) * ${units - 1})`;
}
