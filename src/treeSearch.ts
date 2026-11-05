import { algorithms } from "./algorithmCatalog";
import type { AlgorithmId, Frame } from "./algorithmTypes";
import { createFrame } from "./frames";

export const defaultTree = [42, 23, 71, 12, 34, 56, 85, 8, 17, 28, 38, 49, 63, 78, 92];

export type TreeNode = {
  id: number;
  value: number;
  left: number | null;
  right: number | null;
  x: number;
  depth: number;
};

/**
 * @param values Insertion order for the tree; duplicate values are ignored.
 * @returns Dense node IDs with depth and in-order rank for diagram placement.
 */
export function buildTree(values: number[]): TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const value of [...new Set(values)]) {
    const id = nodes.length;
    if (!nodes.length) {
      nodes.push({ id, value, left: null, right: null, x: 0, depth: 0 });
      continue;
    }
    let node = nodes[0];
    while (true) {
      const direction = value < node.value ? "left" : "right";
      const child = node[direction];
      if (child === null) {
        node[direction] = id;
        nodes.push({ id, value, left: null, right: null, x: 0, depth: node.depth + 1 });
        break;
      }
      node = nodes[child];
    }
  }
  let rank = 0;
  function layout(id: number | null) {
    if (id === null) {
      return;
    }
    const node = nodes[id];
    layout(node.left);
    node.x = rank++;
    layout(node.right);
  }
  if (nodes.length) {
    layout(0);
  }
  return nodes;
}

/**
 * @param id Tree traversal or binary search strategy.
 * @param values Values used to build the tree in insertion order.
 * @param target Value to locate.
 * @returns Visit snapshots ending in a match or a missing result.
 */
export function treeFrames(id: AlgorithmId, values: number[], target: number): Frame[] {
  const nodes = buildTree(values);
  const array = nodes.map((node) => node.value);
  const frames = [createFrame(array)];
  const visited: number[] = [];
  let comparisons = 0;
  function visit(nodeId: number, frontier: number[]) {
    const node = nodes[nodeId];
    const match = node.value === target;
    frames.push({
      ...createFrame(array),
      active: [nodeId],
      visited: [...visited],
      found: match ? [nodeId] : [],
      comparisons: ++comparisons,
      frontier: [...frontier],
      line: id === "bst" ? 2 : id === "inorder" ? 5 : 3,
      result: match ? "found" : undefined,
      message: match
        ? `ノード ${target} が見つかりました！`
        : `ノード ${node.value} を確認。${id === "bst" ? `${target < node.value ? "左" : "右"}の子へ進みます。` : "次のノードへ進みます。"}`,
    });
    visited.push(nodeId);
    return match;
  }
  if (nodes.length && id === "bst") {
    let current: number | null = 0;
    while (current !== null) {
      if (visit(current, [])) {
        return frames;
      }
      const node: TreeNode = nodes[current];
      current = target < node.value ? node.left : node.right;
    }
  } else if (id === "inorder") {
    const stack: number[] = [];
    let current: number | null = nodes.length ? 0 : null;
    while (stack.length || current !== null) {
      while (current !== null) {
        stack.push(current);
        current = nodes[current].left;
      }
      const next = stack.pop()!;
      if (visit(next, stack)) {
        return frames;
      }
      current = nodes[next].right;
    }
  } else {
    const open = nodes.length ? [0] : [];
    while (open.length) {
      const current = id === "tree-bfs" ? open.shift()! : open.pop()!;
      if (visit(current, open)) {
        return frames;
      }
      const node = nodes[current];
      const children = id === "tree-bfs" ? [node.left, node.right] : [node.right, node.left];
      for (const child of children) {
        if (child !== null) {
          open.push(child);
        }
      }
    }
  }
  frames.push({
    ...createFrame(array),
    visited: [...visited],
    comparisons: comparisons,
    line: (algorithms.find((a) => a.id === id)?.code.length ?? 1) - 1,
    result: "missing",
    message: `${target} は木の中にありません。探索が終了しました。`,
  });
  return frames;
}
