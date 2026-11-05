import type { Frame } from "./algorithmTypes";

/** Create an isolated initial snapshot so later input edits cannot change a trace. */
export function createFrame(array: number[]): Frame {
  return {
    array: [...array],
    active: [],
    visited: [],
    found: [],
    comparisons: 0,
    swaps: 0,
    line: 0,
    message: "準備ができました。再生ボタンで、探索の流れを見てみましょう。",
  };
}
