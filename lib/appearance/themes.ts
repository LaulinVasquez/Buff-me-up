import type { CSSProperties } from "react";

export const ACCENT_THEMES = [
  { id: "lime", name: "Lime", description: "The original Buff Me Up look", colors: { 200: "#d9f99d", 300: "#bef264", 400: "#a3e635" } },
  { id: "ocean", name: "Ocean Blue", description: "Cool and clear", colors: { 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa" } },
  { id: "purple", name: "Purple", description: "A little more personality", colors: { 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa" } },
  { id: "orange", name: "Orange", description: "Warm and energetic", colors: { 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c" } },
  { id: "rose", name: "Rose", description: "Bright and expressive", colors: { 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185" } },
] as const;
export type AccentTheme = typeof ACCENT_THEMES[number]["id"];
export const DEFAULT_ACCENT_THEME: AccentTheme = "lime";
export function isAccentTheme(value: unknown): value is AccentTheme {
  return ACCENT_THEMES.some(theme => theme.id === value);
}
export function normalizeAccentTheme(value: unknown): AccentTheme {
  return isAccentTheme(value) ? value : DEFAULT_ACCENT_THEME;
}
export function accentPalette(theme: AccentTheme) {
  return ACCENT_THEMES.find(item => item.id === theme)!;
}
export function accentVariables(theme: AccentTheme): CSSProperties & Record<`--accent-${200 | 300 | 400}`, string> {
  const { colors } = accentPalette(theme);
  return { "--accent-200": colors[200], "--accent-300": colors[300], "--accent-400": colors[400] };
}
export type AppearanceActionState = { status: "idle" | "success" | "error"; message?: string };
