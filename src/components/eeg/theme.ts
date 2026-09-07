export type ThemeMode = "auto" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemeMode, "auto">;

export const THEME_MODES: readonly ThemeMode[] = ["auto", "light", "dark"];

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  const index = THEME_MODES.indexOf(mode);
  return THEME_MODES[(index + 1) % THEME_MODES.length] ?? "auto";
}

export function systemTheme(): ResolvedTheme {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}
