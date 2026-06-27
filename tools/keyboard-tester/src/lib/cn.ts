// Joins class names, dropping falsy values. Used instead of template literals
// in `className` so the no-interpolated-classname biome plugin stays happy.
export function cn(
  ...parts: ReadonlyArray<string | false | null | undefined>
): string {
  let out = "";
  for (const part of parts) {
    if (part) {
      out = out.length === 0 ? part : `${out} ${part}`;
    }
  }
  return out;
}
