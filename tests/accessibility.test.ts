import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../src/workspace.css", import.meta.url), "utf8");
const palette = (selector: string) => {
  const block = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/g)].map((match) => [match[1], match[2]]),
  );
};

function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function ratio(a: string, b: string) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const base = { surface: "#ffffff", ...palette(":root") };
for (const theme of ["light", "dark", "paper"]) {
  const colors: Record<string, string> = {
    ...base,
    ...(theme === "light" ? {} : palette(`:root[data-theme="${theme}"]`)),
  };
  test(`${theme}: learning state text meets 4.5:1 and identifying boundaries meet 3:1`, () => {
    for (const state of ["current", "compare", "found", "discarded"]) {
      const contrast = ratio(colors[state], colors[`${state}-soft`]);
      assert.ok(contrast >= 4.5, `${state} text ${contrast.toFixed(2)}:1`);
      assert.ok(ratio(colors[state], colors.surface) >= 3, `${state} boundary against surface`);
    }
    for (const background of ["surface", "surface-alt", "surface-raised", "page"]) {
      for (const foreground of ["text", "muted", "subtle"]) {
        assert.ok(
          ratio(colors[foreground], colors[background]) >= 4.5,
          `${foreground} on ${background}`,
        );
      }
      assert.ok(ratio(colors.focus, colors[background]) >= 3, `focus on ${background}`);
    }
    assert.ok(ratio(colors["control-border"], colors.surface) >= 3, "input boundary");
    for (const syntax of ["syntax-keyword", "syntax-number", "syntax-target"]) {
      assert.ok(
        ratio(colors[syntax], colors["surface-raised"]) >= 4.5,
        `${syntax} on code background`,
      );
    }
  });
}
