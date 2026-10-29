import {
  algorithms,
  COLS,
  defaultArray,
  defaultSort,
  defaultTree,
  GOAL,
  initialMaze,
  ROWS,
  START,
} from "./algorithms.ts";
import type { AlgorithmId, Category } from "./algorithms.ts";

export const EXPERIMENT_KEY = "tansaku-experiment-v1";
export const categoryDefaults: Record<Category, AlgorithmId> = {
  array: "binary",
  maze: "bfs",
  tree: "bst",
  sort: "bubble",
};
export type Experiment = {
  version: 1;
  category: Category;
  algorithmId: AlgorithmId;
  selections: Record<Category, AlgorithmId>;
  data: Record<"array" | "tree" | "sort", number[]>;
  grid: number[];
  start: number;
  goal: number;
  target: number;
  heuristicWeight: number;
  maxDepth: number;
};
export function defaultExperiment(): Experiment {
  return {
    version: 1,
    category: "array",
    algorithmId: "binary",
    selections: { ...categoryDefaults },
    data: {
      array: [...defaultArray],
      tree: [...defaultTree],
      sort: [...defaultSort],
    },
    grid: initialMaze(),
    start: START,
    goal: GOAL,
    target: 63,
    heuristicWeight: 2,
    maxDepth: 0,
  };
}
export function validateExperiment(value: unknown): Experiment {
  const fail = () => {
    throw new Error(
      "実験ファイルの形式が正しくありません。探索ラボで書き出した JSON を選んでください。",
    );
  };
  if (!value || typeof value !== "object") return fail();
  const input = value as Experiment;
  if (
    input.version !== 1 ||
    !Object.keys(categoryDefaults).includes(input.category) ||
    !algorithms.some(
      (a) => a.id === input.algorithmId && a.category === input.category,
    )
  )
    return fail();
  const integer = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
  for (const cat of ["array", "tree", "sort"] as const) {
    const list = input.data?.[cat];
    if (
      !Array.isArray(list) ||
      !list.length ||
      list.length > (cat === "tree" ? 31 : 32) ||
      !list.every((n) => integer(n, -999, 999))
    )
      return fail();
  }
  if (
    !Array.isArray(input.grid) ||
    input.grid.length !== ROWS * COLS ||
    !input.grid.every((n) => n === 0 || n === 1 || n === 5) ||
    !integer(input.start, 0, ROWS * COLS - 1) ||
    !integer(input.goal, 0, ROWS * COLS - 1) ||
    input.start === input.goal ||
    input.grid[input.start] === 1 ||
    input.grid[input.goal] === 1
  )
    return fail();
  if (
    !integer(input.target, -999, 999) ||
    typeof input.heuristicWeight !== "number" ||
    !Number.isFinite(input.heuristicWeight) ||
    input.heuristicWeight < 0 ||
    input.heuristicWeight > 5 ||
    !integer(input.maxDepth, 0, ROWS * COLS)
  )
    return fail();
  const selections = { ...categoryDefaults };
  for (const cat of Object.keys(selections) as Category[])
    if (
      algorithms.some(
        (a) => a.category === cat && a.id === input.selections?.[cat],
      )
    )
      selections[cat] = input.selections[cat];
  selections[input.category] = input.algorithmId;
  const array =
    selections.array === "linear"
      ? [...input.data.array]
      : [...input.data.array].sort((a, b) => a - b);
  return {
    version: 1,
    category: input.category,
    algorithmId: input.algorithmId,
    selections,
    data: {
      array,
      tree: [...new Set(input.data.tree)],
      sort: [...input.data.sort],
    },
    grid: [...input.grid],
    start: input.start,
    goal: input.goal,
    target: input.target,
    heuristicWeight: input.heuristicWeight,
    maxDepth: input.maxDepth,
  };
}
export function parseExperiment(text: string): Experiment {
  if (text.length > 65536)
    throw new Error("実験ファイルは64 KB以下にしてください。");
  try {
    return validateExperiment(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error(
        "JSON を読み込めませんでした。ファイルの内容を確認してください。",
      );
    throw error;
  }
}
export function encodeExperiment(experiment: Experiment): string {
  const bytes = new TextEncoder().encode(JSON.stringify(experiment));
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export function decodeExperiment(encoded: string): Experiment {
  if (encoded.length > 90000) throw new Error("共有リンクが長すぎます。");
  try {
    const raw = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
    return parseExperiment(
      new TextDecoder().decode(
        Uint8Array.from(raw, (char) => char.charCodeAt(0)),
      ),
    );
  } catch {
    throw new Error(
      "共有リンクを読み込めませんでした。リンク全体を確認してください。",
    );
  }
}
