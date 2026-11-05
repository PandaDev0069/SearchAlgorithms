import assert from "node:assert/strict";
import { test } from "node:test";
import type { AdvancedId, SearchNode } from "../src/advancedSearch.ts";
import {
  advancedFrames,
  andOrFrames,
  buildSearchGraph,
  defaultGame,
} from "../src/advancedSearch.ts";
import { algorithms } from "../src/algorithms.ts";

// Independent oracle operates on leaf ranges rather than the generated graph.
function minimax(values: number[], maximizing = true): number {
  if (values.length === 1) {
    return values[0];
  }
  const middle = Math.floor(values.length / 2);
  const left = minimax(values.slice(0, middle), !maximizing);
  const right = minimax(values.slice(middle), !maximizing);
  return maximizing ? Math.max(left, right) : Math.min(left, right);
}

test("decomposition combines every subproblem, including signed, duplicate and uneven inputs", () => {
  for (const values of [
    [],
    [5],
    [0],
    [-4, 2, -4, 0, 9],
    Array.from({ length: 32 }, (_, i) => i - 16),
  ]) {
    const input = [...values];
    const frames = advancedFrames("decomposition", input);
    const last = frames.at(-1)!;
    assert.equal(
      last.value,
      values.reduce((sum, value) => sum + value, 0),
    );
    assert.equal(last.result, "complete");
    assert.equal(last.comparisons, Math.max(0, 2 * values.length - 1));
    assert.deepEqual(input, values);
    if (values.length) {
      assert.equal(last.evaluations?.[0], last.value);
    }
  }
});

test("AND/OR short circuits, reuses shared goals, and returns only a valid solution subgraph", () => {
  for (const values of [[], [0], [-2], [1, 0], [0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 0]]) {
    const nodes = buildSearchGraph("and-or", values);
    const frames = advancedFrames("and-or", values);
    const last = frames.at(-1)!;
    const solved =
      values.length === 1
        ? values[0] !== 0
        : values.some((value, i) => i > 0 && value !== 0 && values[i - 1] !== 0);
    assert.equal(last.result, solved ? "found" : "missing");
    assert.equal(last.value, Number(solved));
    assert.equal(last.visited.length, new Set(last.visited).size);
    assert.equal(last.comparisons, last.visited.length);
    if (!solved) {
      assert.deepEqual(last.found, []);
      assert.deepEqual(last.solutionEdges, []);
      continue;
    }
    assert.ok(last.found.includes(0));
    for (const id of last.found) {
      const node = nodes[id];
      const chosen = last
        .solutionEdges!.filter(([parent]) => parent === id)
        .map(([, child]) => child);
      assert.equal(last.evaluations?.[id], 1);
      if (node.kind === "and") {
        assert.deepEqual(chosen, node.children);
      }
      if (node.kind === "or") {
        assert.equal(chosen.length, 1);
      }
      for (const child of chosen) {
        assert.ok(node.children.includes(child));
        assert.ok(last.found.includes(child));
      }
    }
  }
  const shared = advancedFrames("and-or", [1, 0, 1, 1]);
  const reuse = shared.findIndex((frame) => frame.message.includes("再利用"));
  assert.ok(reuse > 0);
  assert.equal(shared[reuse].comparisons, shared[reuse - 1].comparisons);
  assert.ok(
    advancedFrames("and-or", [1, 1, 1, 1]).at(-1)!.comparisons <
      buildSearchGraph("and-or", [1, 1, 1, 1]).length,
  );
});

test("generic AND/OR DAGs support nested choices, empty conjunctions, and reject invalid graphs", () => {
  const nodes: SearchNode[] = [
    { id: 0, kind: "and", children: [1, 2], depth: 0, x: 0.5 },
    { id: 1, kind: "or", children: [3, 4], depth: 1, x: 0.3 },
    { id: 2, kind: "and", children: [4], depth: 1, x: 0.7 },
    { id: 3, kind: "leaf", children: [], value: 0, depth: 2, x: 0.3 },
    { id: 4, kind: "leaf", children: [], value: 1, depth: 2, x: 0.7 },
  ];
  assert.equal(andOrFrames(nodes).at(-1)!.result, "found");
  assert.equal(andOrFrames([{ ...nodes[0], children: [] }]).at(-1)!.result, "found");
  assert.equal(andOrFrames([{ ...nodes[0], kind: "or", children: [] }]).at(-1)!.result, "missing");
  assert.throws(() => andOrFrames([{ ...nodes[0], children: [0] }]), /acyclic/);
  assert.throws(() => andOrFrames([{ ...nodes[0], children: [5] }]), /Invalid/);
  assert.throws(() => andOrFrames([{ ...nodes[4], id: 0, value: NaN }]), /Invalid/);
  assert.throws(() => andOrFrames(nodes, -1), /root/);
  const before = JSON.stringify(nodes);
  andOrFrames(nodes);
  assert.equal(JSON.stringify(nodes), before);
});

test("game-tree traversal visits all positions in preorder without claiming a best move", () => {
  const nodes = buildSearchGraph("game-tree", defaultGame);
  const last = advancedFrames("game-tree", defaultGame).at(-1)!;
  assert.deepEqual(
    last.visited,
    nodes.map((node) => node.id),
  );
  assert.equal(last.comparisons, 15);
  assert.equal(last.value, undefined);
  assert.deepEqual(last.path, []);
  for (const node of nodes) {
    assert.equal(last.evaluations?.[node.id], node.kind === "leaf" ? node.value : null);
  }
});

test("minimax and alpha-beta agree with an independent oracle on varied deterministic game trees", () => {
  let seed = 771;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (let size = 1; size <= 32; size++) {
    for (let trial = 0; trial < 12; trial++) {
      const values = Array.from({ length: size }, () => (random() % 21) - 10);
      const input = [...values];
      const full = advancedFrames("minimax", values).at(-1)!;
      const pruned = advancedFrames("alpha-beta", values).at(-1)!;
      assert.equal(full.value, minimax(values));
      assert.equal(pruned.value, full.value);
      assert.deepEqual(pruned.path, full.path, `principal variation for ${values}`);
      assert.equal(full.comparisons, 2 * size - 1);
      assert.ok(pruned.comparisons <= full.comparisons);
      assert.equal(pruned.comparisons + pruned.pruned!.length, full.comparisons);
      assert.ok(pruned.pruned!.every((id) => !pruned.visited.includes(id)));
      const nodes = buildSearchGraph("minimax", values);
      for (let i = 1; i < pruned.path!.length; i++) {
        assert.ok(nodes[pruned.path![i - 1]].children.includes(pruned.path![i]));
      }
      const exact = (id: number): number =>
        nodes[id].kind === "leaf"
          ? nodes[id].value!
          : (nodes[id].kind === "max" ? Math.max : Math.min)(...nodes[id].children.map(exact));
      for (const node of nodes) {
        const score = pruned.evaluations![node.id];
        if (score === null) {
          continue;
        }
        const actual = exact(node.id);
        const bound = pruned.scoreBounds![node.id];
        if (bound === "lower") {
          assert.ok(score <= actual);
        } else if (bound === "upper") {
          assert.ok(score >= actual);
        } else {
          assert.equal(score, actual);
        }
      }
      assert.deepEqual(values, input);
    }
  }
});

test("alpha-beta prunes whole subtrees, records bounds and keeps the left move on ties", () => {
  // Root MAX: left MIN guarantees 5, so right MIN can stop at its first 3.
  const frames = advancedFrames("alpha-beta", [5, 6, 3, 9]);
  const last = frames.at(-1)!;
  assert.equal(last.value, 5);
  assert.equal(last.comparisons, 6);
  assert.deepEqual(last.pruned, [6]);
  assert.equal(last.scoreBounds?.[4], "upper");
  assert.ok(frames.some((frame) => frame.alpha !== undefined && frame.beta !== undefined));
  assert.equal(advancedFrames("alpha-beta", [4, 4, 4, 4]).at(-1)!.path?.[1], 1);
  const deeper = advancedFrames("alpha-beta", Array(16).fill(2)).at(-1)!;
  assert.ok(deeper.pruned!.length > 3);
});

test("all new methods have immutable snapshots, monotonic visit counts and valid pseudocode lines", () => {
  for (const id of [
    "decomposition",
    "and-or",
    "game-tree",
    "minimax",
    "alpha-beta",
  ] as AdvancedId[]) {
    const input = [...defaultGame];
    const frames = advancedFrames(id, input);
    const nodes = buildSearchGraph(id, input);
    const first = JSON.stringify(frames[0]);
    input[0] = 999;
    assert.equal(JSON.stringify(frames[0]), first);
    const descriptor = algorithms.find((algorithm) => algorithm.id === id)!;
    for (const [i, frame] of frames.entries()) {
      assert.ok(frame.line >= 0 && frame.line < descriptor.code.length);
      assert.ok(frame.active.every((nodeId) => nodeId >= 0 && nodeId < nodes.length));
      if (i > 0) {
        assert.ok(frame.comparisons >= frames[i - 1].comparisons);
        assert.notEqual(frame.evaluations, frames[i - 1].evaluations);
        assert.notEqual(frame.visited, frames[i - 1].visited);
      }
    }
    assert.equal(advancedFrames(id, []).at(-1)!.result, id === "and-or" ? "missing" : "complete");
    assert.throws(() => advancedFrames(id, [Infinity]), /finite/);
  }
});
