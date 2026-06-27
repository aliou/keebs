import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "dark" | "light";

const STORAGE_KEY = "kb-tester-theme";

function readInitial(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    return "system";
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Theme controller. Resolves the effective scheme, mirrors it onto
 * <html data-theme>, and persists an explicit choice. "system" follows the OS
 * and updates live via matchMedia.
 */
export function useTheme(): {
  choice: ThemeChoice;
  resolved: "dark" | "light";
  setChoice: (c: ThemeChoice) => void;
} {
  const [choice, setChoiceState] = useState<ThemeChoice>(readInitial);
  const [resolved, setResolved] = useState<"dark" | "light">(() =>
    readInitial() === "light"
      ? "light"
      : readInitial() === "dark"
        ? "dark"
        : systemPrefersDark()
          ? "dark"
          : "light",
  );

  useEffect(() => {
    const apply = () => {
      const eff: "dark" | "light" =
        choice === "system" ? (systemPrefersDark() ? "dark" : "light") : choice;
      setResolved(eff);
      document.documentElement.dataset.theme = eff;
    };
    apply();
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [choice]);

  const setChoice = (c: ThemeChoice) => {
    setChoiceState(c);
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      return;
    }
  };

  return { choice, resolved, setChoice };
}
