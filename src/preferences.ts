export type Preferences = {
  theme: "system" | "light" | "dark" | "paper";
  accent: "green" | "blue" | "violet" | "amber";
  fontSize: number;
  font: "noto" | "system" | "serif";
  layout: "split" | "stacked" | "focus";
  codePosition: "right" | "left";
  splitRatio: number;
  density: "comfortable" | "compact";
  wide: boolean;
  sidebarCollapsed: boolean;
  showCode: boolean;
  showStats: boolean;
  showTrace: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  followTrace: boolean;
  pauseWhenHidden: boolean;
  loop: boolean;
  resume: boolean;
  shortcuts: boolean;
  speed: number;
};

export const PREFERENCES_KEY = "tansaku-preferences-v1";
export const defaultPreferences: Preferences = {
  theme: "system",
  accent: "green",
  fontSize: 100,
  font: "noto",
  layout: "split",
  codePosition: "right",
  splitRatio: 55,
  density: "comfortable",
  wide: false,
  sidebarCollapsed: false,
  showCode: true,
  showStats: true,
  showTrace: true,
  reducedMotion: false,
  highContrast: false,
  followTrace: true,
  pauseWhenHidden: true,
  loop: false,
  resume: true,
  shortcuts: true,
  speed: 1,
};

export function sanitizePreferences(value: unknown): Preferences {
  const result = { ...defaultPreferences };
  if (!value || typeof value !== "object") {
    return result;
  }
  const input = value as Record<string, unknown>;
  const choices: Record<string, readonly string[]> = {
    theme: ["system", "light", "dark", "paper"],
    accent: ["green", "blue", "violet", "amber"],
    font: ["noto", "system", "serif"],
    layout: ["split", "stacked", "focus"],
    codePosition: ["right", "left"],
    density: ["comfortable", "compact"],
  };
  for (const [key, options] of Object.entries(choices)) {
    if (typeof input[key] === "string" && options.includes(input[key] as string)) {
      Object.assign(result, { [key]: input[key] });
    }
  }
  for (const key of Object.keys(defaultPreferences) as (keyof Preferences)[]) {
    if (typeof defaultPreferences[key] === "boolean" && typeof input[key] === "boolean") {
      Object.assign(result, { [key]: input[key] });
    }
  }
  if (typeof input.fontSize === "number" && Number.isFinite(input.fontSize)) {
    result.fontSize = Math.max(80, Math.min(160, Math.round(input.fontSize / 5) * 5));
  }
  if (typeof input.splitRatio === "number" && Number.isFinite(input.splitRatio)) {
    result.splitRatio = Math.max(45, Math.min(80, Math.round(input.splitRatio)));
  }
  if ([0.25, 0.5, 1, 2, 4, 8, 16].includes(Number(input.speed))) {
    result.speed = Number(input.speed);
  }
  return result;
}

export function readStored<T>(key: string, fallback: T, sanitize: (value: unknown) => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : sanitize(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): boolean {
  try {
    const text = JSON.stringify(value);
    if (localStorage.getItem(key) !== text) {
      localStorage.setItem(key, text);
    }
    return true;
  } catch {
    return false;
  }
}
