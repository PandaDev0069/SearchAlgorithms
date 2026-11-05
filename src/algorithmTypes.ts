export type Category = "array" | "maze" | "tree" | "sort" | "problem" | "game";

export type AlgorithmId =
  | "linear"
  | "binary"
  | "jump"
  | "interpolation"
  | "bfs"
  | "dfs"
  | "iddfs"
  | "greedy"
  | "a-search"
  | "dijkstra"
  | "astar"
  | "bst"
  | "tree-bfs"
  | "tree-dfs"
  | "inorder"
  | "bubble"
  | "selection"
  | "insertion"
  | "quick"
  | "decomposition"
  | "and-or"
  | "game-tree"
  | "minimax"
  | "alpha-beta";

export type Algorithm = {
  id: AlgorithmId;
  category: Category;
  name: string;
  en: string;
  time: string;
  space: string;
  description: string;
  condition: string;
  points: string[];
  code: string[];
};

export type Frame = {
  array: number[];
  active: number[];
  visited: number[];
  found: number[];
  comparisons: number;
  swaps: number;
  line: number;
  message: string;
  left?: number;
  right?: number;
  mid?: number;
  frontier?: number[];
  path?: number[];
  cost?: number;
  depth?: number;
  depthLimit?: number;
  g?: number;
  h?: number;
  f?: number;
  trail?: number[];
  evaluations?: (number | null)[];
  pruned?: number[];
  solutionEdges?: [number, number][];
  scoreBounds?: ("lower" | "upper" | null)[];
  alpha?: number;
  beta?: number;
  value?: number;
  result?: "found" | "missing" | "complete" | "limited";
};
