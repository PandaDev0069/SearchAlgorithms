import type { AlgorithmId, Frame } from "./algorithmTypes";

export type AdvancedId = Extract<
  AlgorithmId,
  "decomposition" | "and-or" | "game-tree" | "minimax" | "alpha-beta"
>;

export type SearchNode = {
  id: number;
  kind: "sum" | "and" | "or" | "max" | "min" | "leaf";
  children: number[];
  depth: number;
  x: number;
  value?: number;
};

export const defaultProblem = [1, 0, 1, 1];
export const defaultGame = [3, 5, 6, 9, 1, 2, 0, -1];

/** Build a teaching graph from ordered leaf values, preserving duplicates. */
export function buildSearchGraph(id: AdvancedId, values: number[]): SearchNode[] {
  if (!values.length) {
    return [];
  }
  if (id === "and-or") {
    const options = Math.max(1, values.length - 1);
    const offset = options + 1;
    return [
      {
        id: 0,
        kind: "or",
        children: Array.from({ length: options }, (_, i) => i + 1),
        depth: 0,
        x: 0.5,
      },
      ...Array.from(
        { length: options },
        (_, i): SearchNode => ({
          id: i + 1,
          kind: "and",
          children: values.length === 1 ? [offset] : [offset + i, offset + i + 1],
          depth: 1,
          x: (i + 0.5) / options,
        }),
      ),
      ...values.map(
        (value, i): SearchNode => ({
          id: offset + i,
          kind: "leaf",
          children: [],
          depth: 2,
          x: (i + 0.5) / values.length,
          value,
        }),
      ),
    ];
  }
  const nodes: SearchNode[] = [];
  const split = (left: number, right: number, depth: number): number => {
    const node: SearchNode = {
      id: nodes.length,
      kind:
        right - left === 1 ? "leaf" : id === "decomposition" ? "sum" : depth % 2 ? "min" : "max",
      children: [],
      depth,
      x: (left + right) / (2 * values.length),
      value: right - left === 1 ? values[left] : undefined,
    };
    nodes.push(node);
    if (node.kind !== "leaf") {
      const middle = left + Math.floor((right - left) / 2);
      node.children.push(split(left, middle, depth + 1), split(middle, right, depth + 1));
    }
    return node.id;
  };
  split(0, values.length, 0);
  return nodes;
}

function createGraphRecorder(nodes: SearchNode[]) {
  const evaluations: (number | null)[] = nodes.map(() => null);
  const scoreBounds: ("lower" | "upper" | null)[] = nodes.map(() => null);
  const visited: number[] = [];
  const pruned: number[] = [];
  const frames: Frame[] = [];
  const push = (
    line: number,
    message: string,
    active: number[] = [],
    extra: Partial<Frame> = {},
  ) => {
    frames.push({
      array: nodes.map((node) => evaluations[node.id] ?? node.value ?? 0),
      active: [...active],
      visited: [...visited],
      found: [],
      comparisons: visited.length,
      swaps: 0,
      evaluations: [...evaluations],
      scoreBounds: [...scoreBounds],
      pruned: [...pruned],
      line,
      message,
      ...extra,
    });
  };
  push(0, "準備ができました。部分問題と評価の流れを再生してみましょう。");
  return { evaluations, scoreBounds, visited, pruned, frames, push };
}

function validateAndOrGraph(nodes: SearchNode[], root: number): void {
  if (!Number.isInteger(root) || !nodes[root]) {
    throw new Error("Invalid AND/OR root");
  }
  for (const [index, node] of nodes.entries()) {
    if (
      node.id !== index ||
      !["and", "or", "leaf"].includes(node.kind) ||
      node.children.some((child) => !Number.isInteger(child) || !nodes[child]) ||
      (node.kind === "leaf" && (node.children.length > 0 || !Number.isFinite(node.value)))
    ) {
      throw new Error("Invalid AND/OR graph");
    }
  }
  const state = nodes.map(() => 0);
  const validate = (id: number) => {
    if (state[id] === 1) {
      throw new Error("AND/OR graph must be acyclic");
    }
    if (state[id] === 2) {
      return;
    }
    state[id] = 1;
    nodes[id].children.forEach(validate);
    state[id] = 2;
  };
  nodes.forEach((node) => validate(node.id));
}

/**
 * Solve an AND/OR DAG, reusing shared subproblems and recording the solution edges.
 * @param nodes Nodes with dense IDs matching their indices; cycles are rejected.
 * @param root Index of the problem to solve.
 * @returns Playback snapshots ending with the root's success or failure.
 */
export function andOrFrames(nodes: SearchNode[], root = 0): Frame[] {
  if (!nodes.length) {
    const trace = createGraphRecorder(nodes);
    trace.push(7, "部分問題がありません。解グラフは見つかりませんでした。", [], {
      result: "missing",
      value: 0,
      solutionEdges: [],
    });
    return trace.frames;
  }
  validateAndOrGraph(nodes, root);

  const { evaluations, visited, frames, push } = createGraphRecorder(nodes);
  const chosen = new Map<number, number>();
  const solve = (id: number): boolean => {
    // A shared goal contributes one visit even when several parents depend on it.
    if (evaluations[id] !== null) {
      push(1, `ノード ${id} の答えを再利用します。`, [id]);
      return evaluations[id] === 1;
    }
    const node = nodes[id];
    visited.push(id);
    push(node.kind === "leaf" ? 2 : 4, `ノード ${id}（${node.kind.toUpperCase()}）を確認します。`, [
      id,
    ]);
    let solved = node.kind === "and";
    if (node.kind === "leaf") {
      solved = node.value !== 0;
    } else {
      for (const child of node.children) {
        const success = solve(child);
        if (node.kind === "or" && success) {
          solved = true;
          chosen.set(id, child);
          break;
        }
        if (node.kind === "and" && !success) {
          solved = false;
          break;
        }
      }
    }
    evaluations[id] = Number(solved);
    push(6, `ノード ${id} は${solved ? "成功" : "失敗"}です。`, [id]);
    return solved;
  };
  const solved = solve(root);
  const found: number[] = [];
  const solutionEdges: [number, number][] = [];
  const collected = new Set<number>();
  const collect = (id: number) => {
    if (collected.has(id)) {
      return;
    }
    collected.add(id);
    found.push(id);
    const node = nodes[id];
    const children = node.kind === "and" ? node.children : chosen.has(id) ? [chosen.get(id)!] : [];
    for (const child of children) {
      solutionEdges.push([id, child]);
      collect(child);
    }
  };
  if (solved) {
    collect(root);
  }
  push(
    7,
    solved
      ? "根の問題を解決しました。緑の辺が解グラフです。"
      : "根の問題を解決できる選択肢はありません。",
    [],
    {
      result: solved ? "found" : "missing",
      value: Number(solved),
      found,
      solutionEdges,
    },
  );
  return frames;
}

/**
 * @param id Decomposition, graph traversal, or game-tree strategy to demonstrate.
 * @param values Finite leaf values in their original order.
 * @returns Independent snapshots of visits, evaluations, and any pruned subtrees.
 */
export function advancedFrames(id: AdvancedId, values: number[]): Frame[] {
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Values must be finite");
  }
  const nodes = buildSearchGraph(id, values);
  if (id === "and-or") {
    return andOrFrames(nodes);
  }
  const { evaluations, scoreBounds, visited, pruned, frames, push } = createGraphRecorder(nodes);
  if (!nodes.length) {
    push(
      0,
      id === "decomposition" ? "空の配列の総和は 0 です。" : "探索する局面がありません。",
      [],
      {
        result: "complete",
        value: id === "decomposition" ? 0 : undefined,
      },
    );
    return frames;
  }
  const bestChild = new Map<number, number>();
  const markPruned = (id: number) => {
    pruned.push(id);
    nodes[id].children.forEach(markPruned);
  };
  const visit = (nodeId: number, alpha: number, beta: number): number => {
    const node = nodes[nodeId];
    const bounded = id === "alpha-beta";
    const initialAlpha = alpha;
    const initialBeta = beta;
    const bounds = () => (bounded ? { alpha, beta } : {});
    visited.push(nodeId);
    push(
      node.kind === "leaf"
        ? id === "decomposition"
          ? 1
          : id === "game-tree"
            ? 2
            : 1
        : id === "decomposition"
          ? 3
          : id === "game-tree"
            ? 1
            : 2,
      `ノード ${nodeId}（${node.kind.toUpperCase()}）を訪問します。`,
      [nodeId],
      { depth: node.depth, ...bounds() },
    );
    if (node.kind === "leaf") {
      evaluations[nodeId] = node.value!;
      push(
        id === "decomposition" ? 2 : id === "game-tree" ? 3 : 1,
        `終端の値 ${node.value} を返します。`,
        [nodeId],
        bounds(),
      );
      return node.value!;
    }
    let best =
      node.kind === "sum" || id === "game-tree" ? 0 : node.kind === "max" ? -Infinity : Infinity;
    for (const [index, child] of node.children.entries()) {
      const value = visit(child, alpha, beta);
      if (id === "game-tree") {
        continue;
      }
      if (node.kind === "sum") {
        best += value;
      } else if (!bestChild.has(nodeId) || (node.kind === "max" ? value > best : value < best)) {
        best = value;
        bestChild.set(nodeId, child);
      }
      if (node.kind === "sum" && index === 0) {
        push(4, `左の部分問題の答えは ${value}。右の部分問題へ進みます。`, [nodeId]);
        continue;
      }
      evaluations[nodeId] = best;
      push(
        id === "decomposition" ? 6 : 5,
        `ノード ${nodeId} の${node.kind === "sum" ? "合計" : "暫定評価"}は ${best} です。`,
        [nodeId],
        bounds(),
      );
      if (bounded) {
        if (node.kind === "max") {
          alpha = Math.max(alpha, best);
        } else {
          beta = Math.min(beta, best);
        }
        push(
          node.kind === "max" ? 6 : 7,
          `境界を更新：α = ${alpha}、β = ${beta}。`,
          [nodeId],
          bounds(),
        );
        if (alpha >= beta && index < node.children.length - 1) {
          node.children.slice(index + 1).forEach(markPruned);
          scoreBounds[nodeId] = node.kind === "max" ? "lower" : "upper";
          push(8, "α ≥ β のため、残りの子とその子孫を枝刈りします。", [nodeId], bounds());
          break;
        }
      }
    }
    if (id !== "game-tree") {
      evaluations[nodeId] = best;
      if (bounded) {
        scoreBounds[nodeId] = best <= initialAlpha ? "upper" : best >= initialBeta ? "lower" : null;
      }
      push(
        id === "decomposition" ? 6 : bounded ? 9 : 6,
        `ノード ${nodeId} の評価 ${best} を親へ返します。`,
        [nodeId],
        bounds(),
      );
    }
    return best;
  };
  const value = visit(0, -Infinity, Infinity);
  const path: number[] = [];
  if (id === "minimax" || id === "alpha-beta") {
    let current: number | undefined = 0;
    while (current !== undefined) {
      path.push(current);
      current = bestChild.get(current);
    }
  }
  const solutionEdges: [number, number][] = path
    .slice(1)
    .map((child, index) => [path[index], child]);
  const rootBounds =
    id === "alpha-beta" ? { alpha: frames.at(-1)!.alpha, beta: frames.at(-1)!.beta } : {};
  push(
    id === "decomposition" ? 6 : id === "game-tree" ? 5 : id === "alpha-beta" ? 9 : 6,
    id === "game-tree"
      ? "すべての局面を訪問しました。最善手はミニマックス法で求められます。"
      : id === "decomposition"
        ? `部分問題を結合しました。総和は ${value} です。`
        : `根の評価値は ${value}。${path.length > 1 ? `最善手はノード ${path[1]} です。` : "根が終端局面です。"}`,
    [],
    {
      result: "complete",
      value: id === "game-tree" ? undefined : value,
      path,
      ...rootBounds,
      found: id === "decomposition" ? nodes.map((node) => node.id) : path,
      solutionEdges,
    },
  );
  return frames;
}

export { advancedAlgorithms } from "./advancedAlgorithmCatalog";
