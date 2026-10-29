import { useEffect, useState } from "react";
import {
  defaultPreferences,
  PREFERENCES_KEY,
  readStored,
  sanitizePreferences,
  writeStored,
} from "./preferences";
import type { Preferences } from "./preferences";

export function usePreferences() {
  const [preferences, setPreferences] = useState(() =>
    readStored(PREFERENCES_KEY, { ...defaultPreferences }, sanitizePreferences),
  );
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const change = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== PREFERENCES_KEY || !event.newValue) return;
      try {
        const next = sanitizePreferences(JSON.parse(event.newValue));
        setPreferences((previous) =>
          JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
        );
      } catch {
        /* Ignore a malformed external save. */
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const resolvedTheme =
    preferences.theme === "system"
      ? systemDark
        ? "dark"
        : "light"
      : preferences.theme;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.accent = preferences.accent;
    root.dataset.font = preferences.font;
    root.dataset.motion = preferences.reducedMotion ? "reduce" : "system";
    root.dataset.contrast = preferences.highContrast ? "high" : "normal";
    root.style.setProperty("--font-scale", String(preferences.fontSize / 100));
    root.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        resolvedTheme === "dark"
          ? "#151b19"
          : resolvedTheme === "paper"
            ? "#f4eddf"
            : "#f5f7f4",
      );
    writeStored(PREFERENCES_KEY, preferences);
  }, [preferences, resolvedTheme]);
  function updatePreferences(patch: Partial<Preferences>) {
    setPreferences((previous) =>
      sanitizePreferences({ ...previous, ...patch }),
    );
  }
  return { preferences, updatePreferences, resolvedTheme };
}
