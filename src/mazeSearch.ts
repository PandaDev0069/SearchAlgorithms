import type { AlgorithmId, Frame } from "./algorithmTypes";
import { createFrame } from "./frames";

export const ROWS = 13;
export const COLS = 25;
export const START = COLS + 1;
export const GOAL = (ROWS - 2) * COLS + COLS - 2;

/** Return orthogonal neighbors in up/right/down/left order, without row wrapping. */
export function neighbors(index: number, rows = ROWS, cols = COLS): number[] {
  const row = Math.floor(index / cols);
  const column = index % cols;

  return [
    row > 0 ? index - cols : -1,
    column < cols - 1 ? index + 1 : -1,
    row < rows - 1 ? index + cols : -1,
    column > 0 ? index - 1 : -1,
  ].filter((neighbor) => neighbor >= 0);
}

/** Generate a connected maze using randomized depth-first carving. */
export function makeMaze(): number[] {
  const grid = Array(ROWS * COLS).fill(1) as number[];
  const seen = new Set([START]);
  const stack = [START];
  grid[START] = 0;
  while (stack.length) {
    const current = stack[stack.length - 1];
    const row = Math.floor(current / COLS);
    const column = current % COLS;
    const next = [
      [row - 2, column],
      [row, column + 2],
      [row + 2, column],
      [row, column - 2],
    ].filter(
      ([nextRow, nextColumn]) =>
        nextRow > 0 &&
        nextRow < ROWS - 1 &&
        nextColumn > 0 &&
        nextColumn < COLS - 1 &&
        !seen.has(nextRow * COLS + nextColumn),
    );
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [nextRow, nextColumn] = next[Math.floor(Math.random() * next.length)];
    const nextIndex = nextRow * COLS + nextColumn;
    grid[nextIndex] = 0;
    grid[(current + nextIndex) / 2] = 0;
    seen.add(nextIndex);
    stack.push(nextIndex);
  }
  // A few loops let different strategies take different routes.
  for (let row = 2; row < ROWS - 2; row++) {
    for (let column = 2; column < COLS - 2; column++) {
      if (Math.random() < 0.13) {
        grid[row * COLS + column] = 0;
      }
    }
  }
  grid[GOAL] = 0;
  return grid;
}

export function initialMaze(): number[] {
  return Array.from({ length: ROWS * COLS }, (_, index) => {
    const row = Math.floor(index / COLS);
    const column = index % COLS;
    if (row === 0 || column === 0 || row === ROWS - 1 || column === COLS - 1) {
      return 1;
    }
    if (
      (column === 6 && row !== 9) ||
      (column === 12 && row !== 3) ||
      (column === 18 && row !== 9)
    ) {
      return 1;
    }
    if (row === 6 && column > 6 && column < 12 && column !== 9) {
      return 1;
    }
    return 0;
  });
}

export type MazeOptions = { heuristicWeight?: number; maxDepth?: number; maxExpansions?: number };

export const MAX_MAZE_EXPANSIONS = 30000;

/**
 * @param id Pathfinding strategy to record.
 * @param grid Row-major cells: 0 for open space, 1 for a wall, 5 for weighted terrain.
 * @param start Starting cell index.
 * @param goal Destination cell index.
 * @param rows Grid height.
 * @param cols Grid width.
 * @param options Heuristic weight and optional depth or visit limits.
 * @returns Snapshots ending with a route, an unreachable goal, or a traversal limit.
 */
export function mazeFrames(
  id: AlgorithmId,
  grid: number[],
  start: number,
  goal: number,
  rows = ROWS,
  cols = COLS,
  options: MazeOptions = {},
): Frame[] {
  if (id === "iddfs") {
    return iterativeDeepeningFrames(grid, start, goal, rows, cols, options);
  }
  // Every frame shares one immutable copy of the maze, rather than duplicating it.
  const base = createFrame(grid);
  const frames: Frame[] = [
    {
      ...base,
      active: [start],
      frontier: [start],
      message: "スタートからゴールを目指します。壁を描いたり、始点・終点を移動することもできます。",
    },
  ];
  const open = [start];
  const discovered = new Set([start]);
  const closed = new Set<number>();
  const parent = new Map<number, number>();
  const distance = new Map([[start, 0]]);
  const visited = new Set<number>();
  let expansions = 0;
  const costAware = id === "dijkstra" || id === "astar" || id === "a-search";
  const informed = costAware || id === "greedy";
  const weight = getHeuristicWeight(id, options.heuristicWeight);
  const goalRow = Math.floor(goal / cols);
  const goalColumn = goal % cols;
  const heuristic = (index: number) =>
    weight * (Math.abs(Math.floor(index / cols) - goalRow) + Math.abs((index % cols) - goalColumn));
  const score = (index: number) => (id === "greedy" ? 0 : distance.get(index)!) + heuristic(index);
  const budget = Math.max(1, Math.floor(options.maxExpansions ?? MAX_MAZE_EXPANSIONS));
  while (open.length) {
    if (expansions >= budget) {
      frames.push({
        ...base,
        visited: [...visited],
        frontier: [...open],
        comparisons: expansions,
        line: 1,
        result: "limited",
        message: `訪問回数の上限 ${budget} 回に達したため停止しました。経路がないという意味ではありません。`,
      });
      return frames;
    }
    const nextIndex = informed ? lowestScoreIndex(open, score) : 0;
    const current = id === "dfs" ? open.pop()! : open.splice(nextIndex, 1)[0];
    closed.add(current);
    visited.add(current);
    expansions++;
    const evaluation = informed
      ? { g: distance.get(current)!, h: heuristic(current), f: score(current) }
      : {};
    if (current === goal) {
      const path = reconstructPath(parent, goal);
      frames.push({
        ...base,
        ...evaluation,
        active: [current],
        visited: [...visited],
        frontier: [...open],
        path,
        found: path,
        comparisons: expansions,
        cost: distance.get(goal),
        line: informed ? 3 : 4,
        result: "found",
        message: `ゴールに到達！ ${path.length - 1} 歩、移動コスト ${distance.get(goal)} の経路が見つかりました。`,
      });
      return frames;
    }
    const adjacentCells = neighbors(current, rows, cols);
    if (id === "dfs") {
      adjacentCells.reverse();
    }
    for (const next of adjacentCells) {
      if (grid[next] === 1 || (closed.has(next) && id !== "a-search")) {
        continue;
      }
      const cost = distance.get(current)! + (informed && grid[next] === 5 ? 5 : 1);
      if (costAware ? cost < (distance.get(next) ?? Infinity) : !discovered.has(next)) {
        // Weighted A may need to reopen a cell when a cheaper route is discovered.
        closed.delete(next);
        distance.set(next, cost);
        parent.set(next, current);
        discovered.add(next);
        if (!open.includes(next)) {
          open.push(next);
        }
      }
    }
    frames.push({
      ...base,
      ...evaluation,
      active: [current],
      visited: [...visited],
      frontier: [...open],
      comparisons: expansions,
      cost: distance.get(current),
      line: informed ? 2 : 3,
      message: `(${Math.floor(current / cols)}, ${current % cols}) を探索中。累積 ${expansions} 回訪問、${open.length} マスが探索待ちです。${informed ? ` g=${evaluation.g}, h=${evaluation.h}, f=${evaluation.f}。` : ""}`,
    });
  }
  frames.push({
    ...base,
    visited: [...visited],
    frontier: [],
    comparisons: expansions,
    line: 1,
    result: "missing",
    message: "ゴールへの経路がありません。壁を編集して、もう一度試してみましょう。",
  });
  return frames;
}

function getHeuristicWeight(id: AlgorithmId, requested = 2): number {
  if (id === "a-search") {
    return Math.max(0, Math.min(5, Number.isFinite(requested) ? requested : 2));
  }
  return id === "astar" || id === "greedy" ? 1 : 0;
}

function lowestScoreIndex(open: number[], score: (index: number) => number): number {
  let bestIndex = 0;
  let bestScore = score(open[0]);

  // Keep insertion order on ties so repeated runs produce the same teaching trace.
  for (let index = 1; index < open.length; index++) {
    const candidate = score(open[index]);
    if (candidate < bestScore) {
      bestIndex = index;
      bestScore = candidate;
    }
  }
  return bestIndex;
}

function reconstructPath(parents: Map<number, number>, goal: number): number[] {
  const path = [goal];
  let current = goal;

  while (parents.has(current)) {
    current = parents.get(current)!;
    path.push(current);
  }
  return path.reverse();
}

function iterativeDeepeningFrames(
  grid: number[],
  start: number,
  goal: number,
  rows: number,
  cols: number,
  options: MazeOptions,
): Frame[] {
  const base = createFrame(grid);
  const frames: Frame[] = [
    {
      ...base,
      active: [start],
      depth: 0,
      depthLimit: 0,
      message: "深さの上限を0から1ずつ増やし、スタートから探索を繰り返します。",
    },
  ];
  const fullDepth = Math.max(0, grid.filter((cell) => cell !== 1).length - 1);
  const maximum = Math.min(fullDepth, Math.max(0, Math.floor(options.maxDepth ?? fullDepth)));
  const budget = Math.max(1, Math.floor(options.maxExpansions ?? MAX_MAZE_EXPANSIONS));
  let expansions = 0;
  type Outcome = "found" | "cutoff" | "exhausted" | "limited";
  for (let limit = 0; limit <= maximum; limit++) {
    const bestDepth = new Map<number, number>();
    const visited = new Set<number>();
    const path = [start];
    frames.push({
      ...base,
      depth: 0,
      depthLimit: limit,
      comparisons: expansions,
      line: 0,
      message: `深さ上限 ${limit} の探索を始めます。訪問履歴をリセットし、スタートからやり直します。`,
    });
    function visit(current: number, depth: number): Outcome {
      if (expansions >= budget) {
        return "limited";
      }
      bestDepth.set(current, depth);
      visited.add(current);
      expansions++;
      const found = current === goal;
      frames.push({
        ...base,
        active: [current],
        visited: [...visited],
        trail: [...path],
        frontier: [],
        comparisons: expansions,
        cost: depth,
        depth,
        depthLimit: limit,
        line: found ? 4 : depth === limit ? 5 : 3,
        ...(found ? { path: [...path], found: [...path], result: "found" as const } : {}),
        message: found
          ? `ゴールに到達！ ${depth} 歩の最短経路を発見。累積訪問 ${expansions} 回。`
          : `深さ ${depth} / 上限 ${limit}：(${Math.floor(current / cols)}, ${current % cols}) を訪問。${depth === limit ? "これ以上は進まず、戻ります。" : "次のマスを深さ優先で調べます。"}`,
      });
      if (found) {
        return "found";
      }
      const adjacentCells = neighbors(current, rows, cols).filter(
        (next) => grid[next] !== 1 && depth + 1 < (bestDepth.get(next) ?? Infinity),
      );
      if (depth === limit) {
        return adjacentCells.length ? "cutoff" : "exhausted";
      }
      let cutoff = false;
      for (const next of adjacentCells) {
        // A preceding branch may have reached this cell at a shallower depth.
        if (depth + 1 >= (bestDepth.get(next) ?? Infinity)) {
          continue;
        }
        path.push(next);
        const outcome = visit(next, depth + 1);
        path.pop();
        if (outcome === "found" || outcome === "limited") {
          return outcome;
        }
        if (outcome === "cutoff") {
          cutoff = true;
        }
      }
      return cutoff ? "cutoff" : "exhausted";
    }
    const outcome = visit(start, 0);
    if (outcome === "found") {
      return frames;
    }
    if (outcome === "limited" || outcome === "exhausted" || limit === maximum) {
      const limited = outcome === "limited" || (outcome === "cutoff" && maximum < fullDepth);
      frames.push({
        ...base,
        visited: [...visited],
        frontier: [],
        comparisons: expansions,
        depthLimit: limit,
        line: outcome === "limited" ? -1 : 12,
        result: limited ? "limited" : "missing",
        message:
          outcome === "limited"
            ? `訪問回数の上限 ${budget} 回に達したため停止しました。経路がないという意味ではありません。`
            : limited
              ? `深さ上限 ${maximum} まででは見つかりませんでした。上限を増やして再実行できます。`
              : "到達できる範囲を探索しましたが、ゴールへの経路がありません。",
      });
      return frames;
    }
  }
  return frames;
}
