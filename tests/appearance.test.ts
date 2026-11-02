import test from "node:test";
import assert from "node:assert/strict";
import { ACCENT_THEMES, accentPalette, accentVariables, isAccentTheme, normalizeAccentTheme } from "../lib/appearance/themes";

function rgb(hex: string) { return [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16)); }
function luminance(color: number[]) {
  const channels = color.map(value => { const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: number[], b: number[]) { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + 0.05) / (values[1] + 0.05); }

test("only preset IDs can be saved; unknown, file-like and CSS values are rejected", () => {
  for (const theme of ACCENT_THEMES) assert(isAccentTheme(theme.id));
  for (const value of [null, undefined, "", "Ocean Blue", "LIME", "#ff0000", "url(https://example.test)", {}, { name: "lime" }, 0]) {
    assert(!isAccentTheme(value));
    assert.equal(normalizeAccentTheme(value), "lime");
  }
  assert.equal(new Set(ACCENT_THEMES.map(theme => theme.id)).size, 5);
});
test("palette values remain bounded hex colors and produce the complete theme variables", () => {
  for (const theme of ACCENT_THEMES) {
    const variables = accentVariables(theme.id);
    assert.equal(accentPalette(theme.id).name, theme.name);
    for (const step of [200, 300, 400] as const) {
      assert.match(theme.colors[step], /^#[0-9a-f]{6}$/);
      assert.equal(variables[`--accent-${step}`], theme.colors[step]);
    }
  }
});
test("all accent text and button labels meet the 4.5:1 contrast target", () => {
  for (const theme of ACCENT_THEMES) {
    const primary = rgb(theme.colors[400]);
    assert(contrast(primary, rgb("#020617")) >= 4.5, `${theme.id} button label`);
    for (const background of ["#070b12", "#0f172a", "#020617"]) {
      for (const step of [300, 400] as const) assert(contrast(rgb(theme.colors[step]), rgb(background)) >= 4.5, `${theme.id} text ${step} on ${background}`);
    }
  }
});
test("unselected chart bars and focus indicators remain visible in every theme", () => {
  const card = rgb("#0f172a");
  for (const theme of ACCENT_THEMES) {
    const bar = rgb(theme.colors[400]).map((value, index) => value * 0.75 + card[index] * 0.25);
    assert(contrast(bar, card) >= 3, `${theme.id} chart bar`);
    assert(contrast(rgb(theme.colors[200]), card) >= 3, `${theme.id} focus outline`);
  }
});
