import { defaultGame, defaultProblem } from "./advancedSearch.ts";
import type { AlgorithmId, Category } from "./algorithms.ts";
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

export const EXPERIMENT_KEY = "tansaku-experiment-v1";
export const categoryDefaults: Record<Category, AlgorithmId> = {
  array: "binary",
  maze: "bfs",
  tree: "bst",
  sort: "bubble",
  problem: "decomposition",
  game: "game-tree",
};

export type Experiment = {
  version: 1;
  category: Category;
  algorithmId: AlgorithmId;
  selections: Record<Category, AlgorithmId>;
  data: Record<Exclude<Category, "maze">, number[]>;
  grid: number[];
  start: number;
  goal: number;
  target: number;
  heuristicWeight: number;
  maxDepth: number;
};

/** Return a fresh experiment, with independent arrays for every workspace. */
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
      problem: [...defaultProblem],
      game: [...defaultGame],
    },
    grid: initialMaze(),
    start: START,
    goal: GOAL,
    target: 63,
    heuristicWeight: 2,
    maxDepth: 0,
  };
}

/** Validate an imported value and return a detached, normalized version 1 experiment. */
export function validateExperiment(value: unknown): Experiment {
  if (!value || typeof value !== "object") {
    return invalidExperiment();
  }
  const input = value as Experiment;
  if (
    input.version !== 1 ||
    !Object.keys(categoryDefaults).includes(input.category) ||
    !algorithms.some((a) => a.id === input.algorithmId && a.category === input.category)
  ) {
    return invalidExperiment();
  }
  const data = readExperimentData(input.data);

  if (
    !Array.isArray(input.grid) ||
    input.grid.length !== ROWS * COLS ||
    !input.grid.every((n) => n === 0 || n === 1 || n === 5) ||
    !isIntegerInRange(input.start, 0, ROWS * COLS - 1) ||
    !isIntegerInRange(input.goal, 0, ROWS * COLS - 1) ||
    input.start === input.goal ||
    input.grid[input.start] === 1 ||
    input.grid[input.goal] === 1
  ) {
    return invalidExperiment();
  }
  if (
    !isIntegerInRange(input.target, -999, 999) ||
    typeof input.heuristicWeight !== "number" ||
    !Number.isFinite(input.heuristicWeight) ||
    input.heuristicWeight < 0 ||
    input.heuristicWeight > 5 ||
    !isIntegerInRange(input.maxDepth, 0, ROWS * COLS)
  ) {
    return invalidExperiment();
  }
  const selections = { ...categoryDefaults };
  for (const cat of Object.keys(selections) as Category[]) {
    if (algorithms.some((a) => a.category === cat && a.id === input.selections?.[cat])) {
      selections[cat] = input.selections[cat];
    }
  }
  selections[input.category] = input.algorithmId;
  const array = data.array;
  if (selections.array !== "linear") {
    array.sort((left, right) => left - right);
  }
  return {
    version: 1,
    category: input.category,
    algorithmId: input.algorithmId,
    selections,
    data: {
      array,
      tree: [...new Set(data.tree)],
      sort: data.sort,
      problem: data.problem,
      game: data.game,
    },
    grid: [...input.grid],
    start: input.start,
    goal: input.goal,
    target: input.target,
    heuristicWeight: input.heuristicWeight,
    maxDepth: input.maxDepth,
  };
}

/** Parse an experiment file; reject malformed JSON and oversized input. */
export function parseExperiment(text: string): Experiment {
  if (text.length > 65536) {
    throw new Error("実験ファイルは64 KB以下にしてください。");
  }
  try {
    return validateExperiment(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("JSON を読み込めませんでした。ファイルの内容を確認してください。");
    }
    throw error;
  }
}

/** Encode an experiment as a URL-safe, unpadded base64 payload. */
export function encodeExperiment(experiment: Experiment): string {
  const bytes = new TextEncoder().encode(JSON.stringify(experiment));
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** Decode a shared payload and validate it with the same rules as file imports. */
export function decodeExperiment(encoded: string): Experiment {
  if (encoded.length > 90000) {
    throw new Error("共有リンクが長すぎます。");
  }
  try {
    const raw = atob(encoded.replaceAll("-", "+").replaceAll("_", "/"));
    return parseExperiment(
      new TextDecoder().decode(Uint8Array.from(raw, (char) => char.charCodeAt(0))),
    );
  } catch {
    throw new Error("共有リンクを読み込めませんでした。リンク全体を確認してください。");
  }
}

function invalidExperiment(): never {
  throw new Error(
    "実験ファイルの形式が正しくありません。探索ラボで書き出した JSON を選んでください。",
  );
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum
  );
}

function readExperimentData(value: unknown): Experiment["data"] {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const data = {} as Experiment["data"];
  // Earlier version 1 saves predate the problem and game workspaces.
  const legacyDefaults: Partial<Experiment["data"]> = {
    problem: defaultProblem,
    game: defaultGame,
  };

  for (const category of ["array", "tree", "sort", "problem", "game"] as const) {
    const values = input[category] === undefined ? legacyDefaults[category] : input[category];
    const maximum = category === "tree" ? 31 : 32;

    if (
      !Array.isArray(values) ||
      values.length === 0 ||
      values.length > maximum ||
      !values.every((entry) => isIntegerInRange(entry, -999, 999))
    ) {
      invalidExperiment();
    }
    data[category] = [...values];
  }
  return data;
}
