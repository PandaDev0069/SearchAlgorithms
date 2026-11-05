import type { Frame } from "./algorithmTypes";

export function formatScore(value: number | undefined): string {
  if (value === undefined) {
    return "—";
  }
  if (value === Infinity) {
    return "∞";
  }
  if (value === -Infinity) {
    return "−∞";
  }
  return String(value);
}

export function formatNodeScore(frame: Frame, nodeId: number): string {
  const value = frame.evaluations?.[nodeId];
  if (value === null || value === undefined) {
    return "—";
  }
  const bound = frame.scoreBounds?.[nodeId];
  return `${bound === "lower" ? "≥" : bound === "upper" ? "≤" : ""}${value}`;
}
