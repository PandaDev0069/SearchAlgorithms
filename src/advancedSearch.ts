import type { Algorithm, AlgorithmId, Frame } from './algorithms';

export type AdvancedId = Extract<AlgorithmId, 'decomposition' | 'and-or' | 'game-tree' | 'minimax' | 'alpha-beta'>;
export type SearchNode = {
  id: number;
  kind: 'sum' | 'and' | 'or' | 'max' | 'min' | 'leaf';
  children: number[];
  depth: number;
  x: number;
  value?: number;
};
export const defaultProblem = [1, 0, 1, 1];
export const defaultGame = [3, 5, 6, 9, 1, 2, 0, -1];
export const advancedAlgorithms: Algorithm[] = [
  {
    id: 'decomposition', category: 'problem', name: '問題の分解（分割）', en: 'Problem Decomposition',
    time: 'O(n)', space: 'O(log n)',
    description: '配列の総和を、小さな部分問題に分割。左右の答えを足し合わせ、元の問題を解きます。',
    condition: '分割 → 基底問題 → 結合',
    points: ['総和を例に、問題の分解と答えの結合を学びます。各 SUM ノードは両方の部分問題を必要とする AND 型です。', '中央で分割し、要素が1個ならその値を返します。負の数や重複も使えます。', 'n は入力要素数。木と可視化の記録を除く再帰スタックは O(log n) です。'],
    code: ['def decompose(values, start, end):', '    if end - start == 1:', '        return values[start]', '    middle = (start + end) // 2', '    left = decompose(values, start, middle)', '    right = decompose(values, middle, end)', '    return left + right'],
  },
  {
    id: 'and-or', category: 'problem', name: 'AND/ORグラフ探索', en: 'AND/OR Graph Search',
    time: 'O(V + E)', space: 'O(V)',
    description: 'AND はすべて、OR はどれかひとつ。共有する部分問題の答えを再利用し、解となる部分グラフを探します。',
    condition: '非循環グラフ・0 は失敗、0 以外は成功',
    points: ['この例の根は OR。隣り合う2つの入力値が両方成功する AND の選択肢を探します。入力が1個ならその値を判定します。', '隣接する選択肢は同じ終端ノードを共有します。一度解いたノードはメモ化し、再評価しません。', 'AND は失敗が1つあれば終了、OR は成功が1つあれば終了します。成功した辺を解グラフとして表示します。'],
    code: ['def solve(node):', '    if node in memo: return memo[node]', '    if node.is_leaf: result = node.value != 0', '    else:', '        results = (solve(child) for child in node.children)', '        result = all(results) if node.is_and else any(results)', '    memo[node] = result', '    return result'],
  },
  {
    id: 'game-tree', category: 'game', name: 'ゲーム木の探索', en: 'Game Tree Traversal',
    time: 'O(b^d)', space: 'O(d)',
    description: '自分と相手が交互に指すゲーム木を、左から深さ優先でたどります。終端局面の評価を確認しましょう。',
    condition: '先行順 DFS・終端評価は MAX 側の得点',
    points: ['入力した値を左から終端局面に配置した二分木です。根は MAX、次の段は MIN と交互に手番が変わります。', '全ノードを訪問し、終端の得点を読みます。この走査だけでは最善手を選びません。', 'b は分岐数、d は最大深さ。入力数が2のべき乗でなくても分割して木を作ります。可視化用の木と記録は空間計算量から除きます。'],
    code: ['def traverse(node):', '    visit(node)', '    if node.is_leaf:', '        return evaluate(node)', '    for child in node.children:', '        traverse(child)'],
  },
  {
    id: 'minimax', category: 'game', name: 'ミニマックス法', en: 'Minimax',
    time: 'O(b^d)', space: 'O(d)',
    description: '自分は得点を最大に、相手は最小に。両者が最善を尽くすときの評価値と手を求めます。',
    condition: '二人・零和・完全情報・交互手番',
    points: ['終端の評価はすべて MAX 側の視点です。MAX は最大値、MIN は最小値を親へ返します。', '同点なら左の手を選びます。緑の経路は最善応手を続けた主変化です。', '終端まで探索するため、この入力木での正確なミニマックス値が求まります。'],
    code: ['def minimax(node):', '    if node.is_leaf: return evaluate(node)', '    best = -inf if node.is_max else inf', '    for child in node.children:', '        value = minimax(child)', '        best = max(best, value) if node.is_max else min(best, value)', '    return best'],
  },
  {
    id: 'alpha-beta', category: 'game', name: 'アルファベータ法', en: 'Alpha-Beta Pruning',
    time: 'O(b^d)', space: 'O(d)',
    description: 'ミニマックス法と同じ答えを、不要な枝を省いて。α と β の境界で枝刈りを判断します。',
    condition: 'α ≥ β で枝刈り・左から探索',
    points: ['α は MAX が確保できる下界、β は MIN が許す上界です。各ノードの探索時の境界を表示します。', '枝刈りした部分は未訪問として斜線表示します。途中で打ち切ったノードの値は ≥ / ≤ の境界値です。', '根の値と最善手はミニマックス法と一致します。手の順序によって削減量が変わり、最悪 O(b^d)、理想的な順序では O(b^(d/2)) です。'],
    code: ['def alpha_beta(node, alpha, beta):', '    if node.is_leaf: return evaluate(node)', '    best = -inf if node.is_max else inf', '    for child in node.children:', '        value = alpha_beta(child, alpha, beta)', '        best = max(best, value) if node.is_max else min(best, value)', '        if node.is_max: alpha = max(alpha, best)', '        else: beta = min(beta, best)', '        if alpha >= beta: break', '    return best'],
  },
];

export function buildSearchGraph(id: AdvancedId, values: number[]): SearchNode[] {
  if (!values.length) return [];
  if (id === 'and-or') {
    const options = Math.max(1, values.length - 1), offset = options + 1;
    return [
      { id: 0, kind: 'or', children: Array.from({ length: options }, (_, i) => i + 1), depth: 0, x: .5 },
      ...Array.from({ length: options }, (_, i): SearchNode => ({
        id: i + 1, kind: 'and', children: values.length === 1 ? [offset] : [offset + i, offset + i + 1],
        depth: 1, x: (i + .5) / options,
      })),
      ...values.map((value, i): SearchNode => ({ id: offset + i, kind: 'leaf', children: [], depth: 2, x: (i + .5) / values.length, value })),
    ];
  }
  const nodes: SearchNode[] = [];
  const split = (left: number, right: number, depth: number): number => {
    const node: SearchNode = {
      id: nodes.length, kind: right - left === 1 ? 'leaf' : id === 'decomposition' ? 'sum' : depth % 2 ? 'min' : 'max',
      children: [], depth, x: (left + right) / (2 * values.length),
      value: right - left === 1 ? values[left] : undefined,
    };
    nodes.push(node);
    if (node.kind !== 'leaf') {
      const middle = left + Math.floor((right - left) / 2);
      node.children.push(split(left, middle, depth + 1), split(middle, right, depth + 1));
    }
    return node.id;
  };
  split(0, values.length, 0);
  return nodes;
}

function recorder(nodes: SearchNode[]) {
  const evaluations: (number | null)[] = nodes.map(() => null);
  const scoreBounds: ('lower' | 'upper' | null)[] = nodes.map(() => null);
  const visited: number[] = [], pruned: number[] = [];
  const frames: Frame[] = [];
  const push = (line: number, message: string, active: number[] = [], extra: Partial<Frame> = {}) => {
    frames.push({
      array: nodes.map((node) => evaluations[node.id] ?? node.value ?? 0),
      active: [...active], visited: [...visited], found: [], comparisons: visited.length, swaps: 0,
      evaluations: [...evaluations], scoreBounds: [...scoreBounds], pruned: [...pruned],
      line, message, ...extra,
    });
  };
  push(0, '準備ができました。部分問題と評価の流れを再生してみましょう。');
  return { evaluations, scoreBounds, visited, pruned, frames, push };
}

/** Solve a DAG with dense node IDs; cycles are rejected before recording a trace. */
export function andOrFrames(nodes: SearchNode[], root = 0): Frame[] {
  if (!nodes.length) {
    const trace = recorder(nodes);
    trace.push(7, '部分問題がありません。解グラフは見つかりませんでした。', [], { result: 'missing', value: 0, solutionEdges: [] });
    return trace.frames;
  }
  if (!Number.isInteger(root) || !nodes[root]) throw new Error('Invalid AND/OR root');
  for (const [index, node] of nodes.entries()) {
    if (node.id !== index || !['and', 'or', 'leaf'].includes(node.kind) ||
        node.children.some((child) => !Number.isInteger(child) || !nodes[child]) ||
        (node.kind === 'leaf' && (node.children.length > 0 || !Number.isFinite(node.value))))
      throw new Error('Invalid AND/OR graph');
  }
  const state = nodes.map(() => 0);
  const validate = (id: number) => {
    if (state[id] === 1) throw new Error('AND/OR graph must be acyclic');
    if (state[id] === 2) return;
    state[id] = 1;
    nodes[id].children.forEach(validate);
    state[id] = 2;
  };
  nodes.forEach((node) => validate(node.id));
  const { evaluations, visited, frames, push } = recorder(nodes);
  const chosen = new Map<number, number>();
  const solve = (id: number): boolean => {
    if (evaluations[id] !== null) {
      push(1, `ノード ${id} の答えを再利用します。`, [id]);
      return evaluations[id] === 1;
    }
    const node = nodes[id];
    visited.push(id);
    push(node.kind === 'leaf' ? 2 : 4, `ノード ${id}（${node.kind.toUpperCase()}）を確認します。`, [id]);
    let solved = node.kind === 'and';
    if (node.kind === 'leaf') solved = node.value !== 0;
    else for (const child of node.children) {
      const success = solve(child);
      if (node.kind === 'or' && success) { solved = true; chosen.set(id, child); break; }
      if (node.kind === 'and' && !success) { solved = false; break; }
    }
    evaluations[id] = Number(solved);
    push(6, `ノード ${id} は${solved ? '成功' : '失敗'}です。`, [id]);
    return solved;
  };
  const solved = solve(root), found: number[] = [], solutionEdges: [number, number][] = [], collected = new Set<number>();
  const collect = (id: number) => {
    if (collected.has(id)) return;
    collected.add(id);
    found.push(id);
    const node = nodes[id];
    const children = node.kind === 'and' ? node.children : chosen.has(id) ? [chosen.get(id)!] : [];
    for (const child of children) {
      solutionEdges.push([id, child]);
      collect(child);
    }
  };
  if (solved) collect(root);
  push(7, solved ? '根の問題を解決しました。緑の辺が解グラフです。' : '根の問題を解決できる選択肢はありません。', [], {
    result: solved ? 'found' : 'missing', value: Number(solved), found, solutionEdges,
  });
  return frames;
}

export function advancedFrames(id: AdvancedId, values: number[]): Frame[] {
  if (values.some((value) => !Number.isFinite(value))) throw new Error('Values must be finite');
  const nodes = buildSearchGraph(id, values);
  if (id === 'and-or') return andOrFrames(nodes);
  const { evaluations, scoreBounds, visited, pruned, frames, push } = recorder(nodes);
  if (!nodes.length) {
    push(0, id === 'decomposition' ? '空の配列の総和は 0 です。' : '探索する局面がありません。', [], {
      result: 'complete', value: id === 'decomposition' ? 0 : undefined,
    });
    return frames;
  }
  const bestChild = new Map<number, number>();
  const markPruned = (id: number) => {
    pruned.push(id);
    nodes[id].children.forEach(markPruned);
  };
  const visit = (nodeId: number, alpha: number, beta: number): number => {
    const node = nodes[nodeId], bounded = id === 'alpha-beta';
    const initialAlpha = alpha, initialBeta = beta;
    const bounds = () => bounded ? { alpha, beta } : {};
    visited.push(nodeId);
    push(node.kind === 'leaf' ? (id === 'decomposition' ? 1 : id === 'game-tree' ? 2 : 1) : id === 'decomposition' ? 3 : id === 'game-tree' ? 1 : 2,
      `ノード ${nodeId}（${node.kind.toUpperCase()}）を訪問します。`, [nodeId], { depth: node.depth, ...bounds() });
    if (node.kind === 'leaf') {
      evaluations[nodeId] = node.value!;
      push(id === 'decomposition' ? 2 : id === 'game-tree' ? 3 : 1, `終端の値 ${node.value} を返します。`, [nodeId], bounds());
      return node.value!;
    }
    let best = node.kind === 'sum' || id === 'game-tree' ? 0 : node.kind === 'max' ? -Infinity : Infinity;
    for (const [index, child] of node.children.entries()) {
      const value = visit(child, alpha, beta);
      if (id === 'game-tree') continue;
      if (node.kind === 'sum') best += value;
      else if (!bestChild.has(nodeId) || (node.kind === 'max' ? value > best : value < best)) {
        best = value;
        bestChild.set(nodeId, child);
      }
      if (node.kind === 'sum' && index === 0) {
        push(4, `左の部分問題の答えは ${value}。右の部分問題へ進みます。`, [nodeId]);
        continue;
      }
      evaluations[nodeId] = best;
      push(id === 'decomposition' ? 6 : 5, `ノード ${nodeId} の${node.kind === 'sum' ? '合計' : '暫定評価'}は ${best} です。`, [nodeId], bounds());
      if (bounded) {
        if (node.kind === 'max') alpha = Math.max(alpha, best);
        else beta = Math.min(beta, best);
        push(node.kind === 'max' ? 6 : 7, `境界を更新：α = ${alpha}、β = ${beta}。`, [nodeId], bounds());
        if (alpha >= beta && index < node.children.length - 1) {
          node.children.slice(index + 1).forEach(markPruned);
          scoreBounds[nodeId] = node.kind === 'max' ? 'lower' : 'upper';
          push(8, 'α ≥ β のため、残りの子とその子孫を枝刈りします。', [nodeId], bounds());
          break;
        }
      }
    }
    if (id !== 'game-tree') {
      evaluations[nodeId] = best;
      if (bounded) scoreBounds[nodeId] = best <= initialAlpha ? 'upper' : best >= initialBeta ? 'lower' : null;
      push(id === 'decomposition' ? 6 : bounded ? 9 : 6, `ノード ${nodeId} の評価 ${best} を親へ返します。`, [nodeId], bounds());
    }
    return best;
  };
  const value = visit(0, -Infinity, Infinity), path: number[] = [];
  if (id === 'minimax' || id === 'alpha-beta') {
    let current: number | undefined = 0;
    while (current !== undefined) { path.push(current); current = bestChild.get(current); }
  }
  const solutionEdges: [number, number][] = path.slice(1).map((child, index) => [path[index], child]);
  const rootBounds = id === 'alpha-beta' ? { alpha: frames.at(-1)!.alpha, beta: frames.at(-1)!.beta } : {};
  push(id === 'decomposition' ? 6 : id === 'game-tree' ? 5 : id === 'alpha-beta' ? 9 : 6,
    id === 'game-tree' ? 'すべての局面を訪問しました。最善手はミニマックス法で求められます。' :
      id === 'decomposition' ? `部分問題を結合しました。総和は ${value} です。` : `根の評価値は ${value}。${path.length > 1 ? `最善手はノード ${path[1]} です。` : '根が終端局面です。'}`,
    [], { result: 'complete', value: id === 'game-tree' ? undefined : value, path, ...rootBounds,
      found: id === 'decomposition' ? nodes.map((node) => node.id) : path, solutionEdges });
  return frames;
}
