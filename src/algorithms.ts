import { advancedAlgorithms } from './advancedSearch';

export type Category = 'array' | 'maze' | 'tree' | 'sort' | 'problem' | 'game';
export type AlgorithmId = 'linear' | 'binary' | 'jump' | 'interpolation' | 'bfs' | 'dfs' | 'iddfs' | 'greedy' | 'a-search' | 'dijkstra' | 'astar' | 'bst' | 'tree-bfs' | 'tree-dfs' | 'inorder' | 'bubble' | 'selection' | 'insertion' | 'quick' | 'decomposition' | 'and-or' | 'game-tree' | 'minimax' | 'alpha-beta';
export type Algorithm = { id: AlgorithmId; category: Category; name: string; en: string; time: string; space: string; description: string; condition: string; points: string[]; code: string[] };
export type Frame = {
  array: number[]; active: number[]; visited: number[]; found: number[];
  comparisons: number; swaps: number; line: number; message: string;
  left?: number; right?: number; mid?: number; frontier?: number[]; path?: number[]; cost?: number;
  depth?: number; depthLimit?: number; g?: number; h?: number; f?: number; trail?: number[];
  evaluations?: (number | null)[]; pruned?: number[]; solutionEdges?: [number, number][];
  scoreBounds?: ('lower' | 'upper' | null)[]; alpha?: number; beta?: number; value?: number;
  result?: 'found' | 'missing' | 'complete' | 'limited';
};

export const algorithms: Algorithm[] = [
  ...advancedAlgorithms,
  { id: 'linear', category: 'array', name: '線形探索', en: 'Linear Search', time: 'O(n)', space: 'O(1)', description: '先頭から順番に、ひとつずつ。どんな配列にも使える、探索の基本です。', condition: '並び順は自由', points: ['未整列の配列でも使えます。', '最初に一致した要素のインデックスを返します。', '最悪の場合、すべての n 個の要素を確認します。'], code: ['def linear_search(a, target):', '    for i in range(len(a)):', '        if a[i] == target:', '            return i', '    return -1'] },
  { id: 'binary', category: 'array', name: '二分探索', en: 'Binary Search', time: 'O(log n)', space: 'O(1)', description: '真ん中を調べて、探索範囲を半分に。整列済みの配列から効率よく値を見つけます。', condition: '昇順に整列済み', points: ['配列が昇順に整列されていることが前提です。', '中央の値と比較し、探索範囲を半分に絞ります。', '重複がある場合は、一致した要素のひとつを返します。'], code: ['def binary_search(a, target):', '    left, right = 0, len(a) - 1', '    while left <= right:', '        mid = (left + right) // 2', '        if a[mid] == target:', '            return mid', '        elif a[mid] < target:', '            left = mid + 1', '        else:', '            right = mid - 1', '    return -1'] },
  { id: 'jump', category: 'array', name: 'ジャンプ探索', en: 'Jump Search', time: 'O(√n)', space: 'O(1)', description: '一定の幅でジャンプし、目標の区間が見つかったら順番に調べます。', condition: '昇順に整列済み', points: ['ジャンプ幅は ⌊√n⌋ を使います。', 'ブロックの末尾で範囲を絞り、区間内を線形探索します。', '二分探索との確認回数の違いを比較してみましょう。'], code: ['def jump_search(a, target):', '    step = max(1, int(sqrt(len(a))))', '    start, end = 0, step - 1', '    while a[min(end, len(a)-1)] < target:', '        start, end = end + 1, end + step', '        if start >= len(a): return -1', '    for i in range(start, min(end+1, len(a))):', '        if a[i] == target: return i', '    return -1'] },
  { id: 'interpolation', category: 'array', name: '補間探索', en: 'Interpolation Search', time: 'O(n)', space: 'O(1)', description: '値の分布から「このあたり」を予測。値が均等に分布するほど、速く見つかります。', condition: '昇順・均等な分布に有効', points: ['平均 O(log log n) は、値がほぼ一様に分布する場合です。', '偏った分布では最悪 O(n) になります。', '両端の値が同じ場合は、ゼロ除算せずに判定します。'], code: ['def interpolation_search(a, target):', '    left, right = 0, len(a) - 1', '    while left <= right and a[left] <= target <= a[right]:', '        if a[left] == a[right]:', '            return left if a[left] == target else -1', '        pos = left + int((target-a[left]) * (right-left) / (a[right]-a[left]))', '        if a[pos] == target: return pos', '        if a[pos] < target: left = pos + 1', '        else: right = pos - 1', '    return -1'] },
  { id: 'bfs', category: 'maze', name: '幅優先探索', en: 'Breadth-First Search', time: 'O(V + E)', space: 'O(V)', description: '水の波紋のように、近いマスから順番に。重みのない迷路の最短経路を見つけます。', condition: '上下左右の4方向・各移動コスト1', points: ['キュー（FIFO）で次に調べるマスを管理します。', '重みは無視し、最小の移動回数を求めます。', 'V はマス数、E は隣接するマス間の辺の数です。'], code: ['queue = [start]', 'seen = {start}', 'while queue:', '    current = queue.pop(0)', '    if current == goal: return path', '    for next in neighbors(current):', '        if next not in seen and not wall(next):', '            seen.add(next); parent[next] = current', '            queue.append(next)'] },
  { id: 'dfs', category: 'maze', name: '深さ優先探索', en: 'Depth-First Search', time: 'O(V + E)', space: 'O(V)', description: 'ひとつの道を奥へ奥へ。行き止まりから戻りながら、ゴールへの道を探します。', condition: '最短経路の保証なし', points: ['スタック（LIFO）を使って探索します。', '経路は見つかりますが、最短とは限りません。', '重みは無視します。近傍の順番で結果が変わります。'], code: ['stack = [start]', 'seen = {start}', 'while stack:', '    current = stack.pop()', '    if current == goal: return path', '    for next in reversed(neighbors(current)):', '        if next not in seen and not wall(next):', '            seen.add(next); parent[next] = current', '            stack.append(next)'] },
  { id: 'iddfs', category: 'maze', name: '反復深化探索', en: 'Iterative Deepening DFS', time: 'O(d²(V + E))', space: 'O(V + d)', description: '深さの上限を 0、1、2… と広げて、深さ優先探索をやり直します。少しずつ遠くまで探す方法です。', condition: '重みを無視・最少の移動回数を探索', points: ['毎回スタートに戻り、深さ制限付き DFS を実行します。再訪問も累積訪問回数に数えます。', '循環する迷路に対応するため、反復ごとに各マスへの最浅の到達深さを記録し、同じか深い到達を省きます。', 'このグラフ版の上限は時間 O(d²(V + E))、空間 O(V + d)。d は試した最大深さです。通常の木探索版は時間 O(b^d)、空間 O(bd) です。', '深さや訪問回数の上限で停止した場合は「上限到達」と表示します。重いマスも1歩として扱います。'], code: ['for limit in range(max_depth + 1):', '    best_depth = {}; path = [start]', '    def visit(node, depth):', '        best_depth[node] = depth', '        if node == goal: return FOUND', '        if depth == limit: return CUTOFF', '        for next in neighbors(node):', '            if not wall(next) and depth+1 < best_depth.get(next, inf):', '                path.append(next)', '                if visit(next, depth+1) == FOUND: return FOUND', '                path.pop()', '    if visit(start, 0) == FOUND: return path', '# 上限内で未発見なら、未到達と経路なしを区別する'] },
  { id: 'greedy', category: 'maze', name: '最良優先探索', en: 'Greedy Best-First Search', time: 'O(V² + E)', space: 'O(V)', description: 'ゴールに近そうなマスから優先。ここまでの距離より、残りの距離の予測を重視して進みます。', condition: 'f(n) = h(n)・最小コストの保証なし', points: ['この教材の「最良優先探索」は貪欲最良優先探索（Greedy Best-First Search）を指します。', 'h(n) はゴールまでのマンハッタン距離。g(n) は優先順位に使いません。', '重いマスのコストは経路コストに加算しますが、経路の選択では考慮しないため、遠回りや高コストになる場合があります。'], code: ['open = [start]; seen = {start}; g[start] = 0', 'while open:', '    current = extract_min(open, manhattan)', '    if current == goal: return path', '    for next in neighbors(current):', '        if not wall(next) and next not in seen:', '            seen.add(next); parent[next] = current', '            g[next] = g[current] + weight(next)', '            open.append(next)'] },
  { id: 'a-search', category: 'maze', name: 'Aアルゴリズム', en: 'A Algorithm', time: 'O(V³ + VE)', space: 'O(V)', description: '実コスト g と予測 h を足した評価値で探索。予測の強さを変え、A* との関係を観察できます。', condition: 'f(n) = g(n) + h(n)・h(n) = α × マンハッタン距離', points: ['A は g+h を使う探索の一般形。ここでは係数 α で予測を調整し、初期値は2です。', 'α=0 はダイクストラ法、0≤α≤1 は過大評価しない予測で A* の条件を満たします。α>1 では最小コストを保証しません。', 'より低い g が見つかったら、探索済みのマスも再び候補へ戻します。g・h・f と累積訪問回数をトレースで確認できます。', 'コスト1・5の有限グラフで再展開を含む保守的な上限を表示しています。1回の最小値選択には配列を使います。'], code: ['open = [start]; g[start] = 0; closed = set()', 'while open:', '    current = extract_min(open, g + alpha * manhattan)', '    if current == goal: return path', '    closed.add(current)', '    for next in neighbors(current):', '        cost = g[current] + weight(next)', '        if not wall(next) and cost < g.get(next, inf):', '            g[next] = cost; parent[next] = current', '            closed.discard(next)  # より良い経路なら再展開', '            add_or_update(open, next)'] },
  { id: 'dijkstra', category: 'maze', name: 'ダイクストラ法', en: 'Dijkstra’s Algorithm', time: 'O(V² + E)', space: 'O(V)', description: '移動コストの合計が小さい道から確定。重みのある迷路でも最小コストの経路を探します。', condition: '非負の重み・重いマスはコスト5', points: ['未確定のマスのうち、累積コストが最小のものを選びます。', 'この教材では配列で最小値を選ぶため O(V² + E) です。', '優先度付きキューなら O((V + E) log V) に改善できます。'], code: ['open = [start]; distance[start] = 0', 'while open:', '    current = extract_min(open, distance)', '    if current == goal: return path', '    for next in neighbors(current):', '        cost = distance[current] + weight(next)', '        if cost < distance[next]:', '            distance[next] = cost; parent[next] = current', '            add_or_update(open, next)'] },
  { id: 'astar', category: 'maze', name: 'A* 探索', en: 'A* Search', time: 'O(V² + E)', space: 'O(V)', description: 'ここまでのコストと、ゴールまでの予測を合算。目的地の方向を意識して探索します。', condition: 'マンハッタン距離をヒューリスティックに使用', points: ['f(n) = g(n) + h(n) が最小のマスから調べます。', '上下左右の移動ではマンハッタン距離が安全な下界です。', 'この実装は配列で最小値を選びます。最小コストを保証します。'], code: ['open = [start]; g[start] = 0', 'while open:', '    current = extract_min(open, g + manhattan)', '    if current == goal: return path', '    for next in neighbors(current):', '        cost = g[current] + weight(next)', '        if cost < g[next]:', '            g[next] = cost; parent[next] = current', '            add_or_update(open, next)'] },
  { id: 'bst', category: 'tree', name: '二分探索木の探索', en: 'Binary Search Tree', time: 'O(h)', space: 'O(1)', description: '小さければ左、大きければ右。木の構造を使って、目的のノードへ進みます。', condition: '左の子 < 親 < 右の子', points: ['入力した順番にノードを挿入して木を作ります。重複値は除きます。', '木の高さを h とすると、探索時間は O(h) です。', '平衡な木で O(log n)、偏った木で O(n) になります。'], code: ['node = root', 'while node is not None:', '    if node.value == target: return node', '    if target < node.value:', '        node = node.left', '    else:', '        node = node.right', 'return None'] },
  { id: 'tree-bfs', category: 'tree', name: '幅優先（レベル順）', en: 'Level-Order Search', time: 'O(n)', space: 'O(n)', description: '根からひとつ下の段へ。同じ深さのノードを左から順に調べます。', condition: 'キューで管理', points: ['同じ深さのノードをすべて調べてから次の段に進みます。', '最初に目標値を見つけたところで終了します。', '二分探索木の大小関係は利用しません。'], code: ['queue = [root]', 'while queue:', '    node = queue.pop(0)', '    if node.value == target: return node', '    if node.left: queue.append(node.left)', '    if node.right: queue.append(node.right)', 'return None'] },
  { id: 'tree-dfs', category: 'tree', name: '深さ優先（先行順）', en: 'Pre-Order Search', time: 'O(n)', space: 'O(h)', description: '親、左、右の順に。左側の枝を深くたどりながらノードを探します。', condition: '根 → 左部分木 → 右部分木', points: ['先行順（pre-order）でノードを訪問します。', '目標値が見つかったら終了します。', 'スタックで再帰の動きを再現しています。'], code: ['stack = [root]', 'while stack:', '    node = stack.pop()', '    if node.value == target: return node', '    if node.right: stack.append(node.right)', '    if node.left: stack.append(node.left)', 'return None'] },
  { id: 'inorder', category: 'tree', name: '中間順探索', en: 'In-Order Search', time: 'O(n)', space: 'O(h)', description: '左、親、右の順に。二分探索木の値を、小さい順にたどります。', condition: '左部分木 → 根 → 右部分木', points: ['中間順（in-order）は二分探索木を昇順に走査します。', 'この実験では、目標値に到達したところで探索を止めます。', 'スタックを使い、再帰せずに走査します。'], code: ['stack = []; node = root', 'while stack or node:', '    while node:', '        stack.append(node); node = node.left', '    node = stack.pop()', '    if node.value == target: return node', '    node = node.right', 'return None'] },
  { id: 'bubble', category: 'sort', name: 'バブルソート', en: 'Bubble Sort', time: 'O(n²)', space: 'O(1)', description: '隣り合う値を比較して交換。大きな値が泡のように右端へ浮かび上がります。', condition: '安定ソート', points: ['隣接する要素を比較して、順序が逆なら交換します。', '一巡で交換がなければ早期終了するため、整列済みなら O(n) です。', '同じ値の相対的な順序は維持されます。'], code: ['for end in range(len(a)-1, 0, -1):', '    changed = False', '    for i in range(end):', '        if a[i] > a[i+1]:', '            a[i], a[i+1] = a[i+1], a[i]', '            changed = True', '    if not changed: break'] },
  { id: 'selection', category: 'sort', name: '選択ソート', en: 'Selection Sort', time: 'O(n²)', space: 'O(1)', description: '残りの中でいちばん小さい値を見つけて、先頭へ。確定する範囲を広げます。', condition: '不安定ソート', points: ['未整列部分から最小の要素を選びます。', '入力の順序によらず、比較回数は n(n−1)/2 です。', '交換回数を抑えられますが、安定ではありません。'], code: ['for i in range(len(a)-1):', '    smallest = i', '    for j in range(i+1, len(a)):', '        if a[j] < a[smallest]: smallest = j', '    if smallest != i:', '        a[i], a[smallest] = a[smallest], a[i]'] },
  { id: 'insertion', category: 'sort', name: '挿入ソート', en: 'Insertion Sort', time: 'O(n²)', space: 'O(1)', description: 'トランプの手札を並べるように。値をひとつずつ、正しい位置に入れていきます。', condition: '安定ソート・ほぼ整列済みなら高速', points: ['この教材では隣接交換で挿入位置へ移動します。', 'ほぼ整列された配列では比較や交換が少なくなります。', '最良 O(n)、平均・最悪 O(n²) です。'], code: ['for i in range(1, len(a)):', '    j = i', '    while j > 0:', '        if a[j-1] <= a[j]: break', '        a[j-1], a[j] = a[j], a[j-1]', '        j -= 1'] },
  { id: 'quick', category: 'sort', name: 'クイックソート', en: 'Quick Sort', time: 'O(n²)', space: 'O(n)', description: '基準値より小さい値を左へ、大きい値を右へ。分割を繰り返して整列します。', condition: '不安定ソート・末尾をピボットに使用', points: ['Lomuto 法で分割します。基準値は範囲の末尾です。', '平均 O(n log n)、最悪 O(n²) です。', 'この教材は明示スタックを使用し、補助空間の上限は O(n) です。'], code: ['stack = [(0, len(a)-1)]', 'while stack:', '    left, right = stack.pop()', '    pivot = a[right]; i = left', '    for j in range(left, right):', '        if a[j] < pivot:', '            swap(a, i, j); i += 1', '    swap(a, i, right)', '    push_valid_parts(stack, left, i, right)'] },
];

export const defaultArray = [3, 8, 12, 17, 23, 28, 34, 42, 49, 56, 63, 71, 78, 85, 92];
export const defaultTree = [42, 23, 71, 12, 34, 56, 85, 8, 17, 28, 38, 49, 63, 78, 92];
export const defaultSort = [42, 17, 71, 8, 56, 23, 92, 34, 63, 12, 85, 49];
const fresh = (array: number[]): Frame => ({ array: [...array], active: [], visited: [], found: [], comparisons: 0, swaps: 0, line: 0, message: '準備ができました。再生ボタンで、探索の流れを見てみましょう。' });

export function searchFrames(id: AlgorithmId, array: number[], target: number): Frame[] {
  const frames: Frame[] = [fresh(array)];
  const visited: number[] = [];
  let count = 0;
  const probe = (i: number, line: number, left?: number, right?: number) => {
    count++;
    const match = array[i] === target;
    frames.push({ ...fresh(array), active: [i], visited: [...visited], found: match ? [i] : [], comparisons: count, left, right, mid: i, line, result: match ? 'found' : undefined, message: match ? `a[${i}] = ${array[i]}。目標の ${target} が見つかりました！` : `a[${i}] = ${array[i]} と ${target} を比較。${array[i] < target ? '目標より小さい値です。' : '目標より大きい値です。'}` });
    if (!visited.includes(i)) visited.push(i);
    return match;
  };
  if (id === 'linear') {
    for (let i = 0; i < array.length; i++) if (probe(i, 2)) return frames;
  } else if (id === 'binary') {
    let left = 0, right = array.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (probe(mid, 4, left, right)) return frames;
      if (array[mid] < target) left = mid + 1; else right = mid - 1;
    }
  } else if (id === 'jump') {
    const step = Math.max(1, Math.floor(Math.sqrt(array.length)));
    let start = 0, end = Math.min(step - 1, array.length - 1);
    while (start < array.length) {
      if (probe(end, 3, start, end)) return frames;
      if (array[end] >= target) {
        for (let i = start; i < end; i++) if (probe(i, 7, start, end)) return frames;
        break;
      }
      start = end + 1;
      end = Math.min(end + step, array.length - 1);
    }
  } else {
    let left = 0, right = array.length - 1;
    while (left <= right && target >= array[left] && target <= array[right]) {
      const pos = array[left] === array[right] ? left : left + Math.floor((target - array[left]) * (right - left) / (array[right] - array[left]));
      if (probe(pos, 6, left, right)) return frames;
      if (array[pos] < target) left = pos + 1; else right = pos - 1;
    }
  }
  frames.push({ ...fresh(array), visited: [...visited], comparisons: count, line: (algorithms.find(a => a.id === id)?.code.length ?? 1) - 1, result: 'missing', message: `${target} は配列内にありません。探索が終了しました。` });
  return frames;
}

export type TreeNode = { id: number; value: number; left: number | null; right: number | null; x: number; depth: number };
export function buildTree(values: number[]): TreeNode[] {
  const nodes: TreeNode[] = [];
  for (const value of [...new Set(values)]) {
    const id = nodes.length;
    if (!nodes.length) { nodes.push({ id, value, left: null, right: null, x: 0, depth: 0 }); continue; }
    let node = nodes[0];
    while (true) {
      const dir = value < node.value ? 'left' : 'right';
      const child = node[dir];
      if (child === null) { node[dir] = id; nodes.push({ id, value, left: null, right: null, x: 0, depth: node.depth + 1 }); break; }
      node = nodes[child];
    }
  }
  let rank = 0;
  function layout(id: number | null) { if (id === null) return; const n = nodes[id]; layout(n.left); n.x = rank++; layout(n.right); }
  if (nodes.length) layout(0);
  return nodes;
}

export function treeFrames(id: AlgorithmId, values: number[], target: number): Frame[] {
  const nodes = buildTree(values), array = nodes.map(n => n.value), frames = [fresh(array)];
  const visited: number[] = [];
  let count = 0;
  function visit(nodeId: number, frontier: number[]) {
    const n = nodes[nodeId], match = n.value === target;
    frames.push({ ...fresh(array), active: [nodeId], visited: [...visited], found: match ? [nodeId] : [], comparisons: ++count, frontier: [...frontier], line: id === 'bst' ? 2 : id === 'inorder' ? 5 : 3, result: match ? 'found' : undefined, message: match ? `ノード ${target} が見つかりました！` : `ノード ${n.value} を確認。${id === 'bst' ? `${target < n.value ? '左' : '右'}の子へ進みます。` : '次のノードへ進みます。'}` });
    visited.push(nodeId);
    return match;
  }
  if (nodes.length && id === 'bst') {
    let current: number | null = 0;
    while (current !== null) { if (visit(current, [])) return frames; const n: TreeNode = nodes[current]; current = target < n.value ? n.left : n.right; }
  } else if (id === 'inorder') {
    const stack: number[] = []; let current: number | null = nodes.length ? 0 : null;
    while (stack.length || current !== null) {
      while (current !== null) { stack.push(current); current = nodes[current].left; }
      const next = stack.pop()!;
      if (visit(next, stack)) return frames;
      current = nodes[next].right;
    }
  } else {
    const open = nodes.length ? [0] : [];
    while (open.length) {
      const current = id === 'tree-bfs' ? open.shift()! : open.pop()!;
      if (visit(current, open)) return frames;
      const n = nodes[current];
      const children = id === 'tree-bfs' ? [n.left, n.right] : [n.right, n.left];
      for (const child of children) if (child !== null) open.push(child);
    }
  }
  frames.push({ ...fresh(array), visited: [...visited], comparisons: count, line: (algorithms.find(a => a.id === id)?.code.length ?? 1) - 1, result: 'missing', message: `${target} は木の中にありません。探索が終了しました。` });
  return frames;
}

export const ROWS = 13, COLS = 25;
export const START = COLS + 1, GOAL = (ROWS - 2) * COLS + COLS - 2;
export function neighbors(i: number, rows = ROWS, cols = COLS): number[] {
  const r = Math.floor(i / cols), c = i % cols;
  return [r > 0 ? i - cols : -1, c < cols - 1 ? i + 1 : -1, r < rows - 1 ? i + cols : -1, c > 0 ? i - 1 : -1].filter(n => n >= 0);
}
export function makeMaze(): number[] {
  const grid = Array(ROWS * COLS).fill(1) as number[], seen = new Set([START]), stack = [START];
  grid[START] = 0;
  while (stack.length) {
    const current = stack[stack.length - 1], r = Math.floor(current / COLS), c = current % COLS;
    const next = [[r-2,c],[r,c+2],[r+2,c],[r,c-2]].filter(([y,x]) => y > 0 && y < ROWS-1 && x > 0 && x < COLS-1 && !seen.has(y*COLS+x));
    if (!next.length) { stack.pop(); continue; }
    const [y,x] = next[Math.floor(Math.random()*next.length)], n = y*COLS+x;
    grid[n] = 0; grid[(current+n)/2] = 0; seen.add(n); stack.push(n);
  }
  // A few loops let different strategies take different routes.
  for (let r = 2; r < ROWS-2; r++) for (let c = 2; c < COLS-2; c++) if (Math.random() < 0.13) grid[r*COLS+c] = 0;
  grid[GOAL] = 0;
  return grid;
}
export function initialMaze(): number[] {
  return Array.from({length: ROWS*COLS}, (_,i) => {
    const r = Math.floor(i/COLS), c = i%COLS;
    if (r===0 || c===0 || r===ROWS-1 || c===COLS-1) return 1;
    if (c===6 && r!==9 || c===12 && r!==3 || c===18 && r!==9) return 1;
    if (r===6 && c>6 && c<12 && c!==9) return 1;
    return 0;
  });
}

export type MazeOptions = { heuristicWeight?: number; maxDepth?: number; maxExpansions?: number };
export const MAX_MAZE_EXPANSIONS = 30000;

export function mazeFrames(id: AlgorithmId, grid: number[], start: number, goal: number, rows = ROWS, cols = COLS, options: MazeOptions = {}): Frame[] {
  if(id === 'iddfs') return iterativeDeepeningFrames(grid,start,goal,rows,cols,options);
  // Every frame shares one immutable copy of the maze, rather than duplicating it.
  const base = fresh(grid);
  const frames: Frame[] = [{ ...base, active: [start], frontier: [start], message: 'スタートからゴールを目指します。壁を描いたり、始点・終点を移動することもできます。' }];
  const open = [start], discovered = new Set([start]), closed = new Set<number>(), parent = new Map<number,number>(), dist = new Map([[start,0]]), visited = new Set<number>();
  let expansions = 0;
  const costAware = id === 'dijkstra' || id === 'astar' || id === 'a-search';
  const informed = costAware || id === 'greedy';
  const factor = id === 'a-search' ? Math.max(0,Math.min(5,Number.isFinite(options.heuristicWeight)?options.heuristicWeight!:2)) : id === 'astar' || id === 'greedy' ? 1 : 0;
  const h = (i: number) => factor * (Math.abs(Math.floor(i/cols)-Math.floor(goal/cols))+Math.abs(i%cols-goal%cols));
  const score = (i: number) => (id==='greedy'?0:dist.get(i)!) + h(i);
  const budget = Math.max(1,Math.floor(options.maxExpansions ?? MAX_MAZE_EXPANSIONS));
  while (open.length) {
    if(expansions >= budget) {
      frames.push({...base,visited:[...visited],frontier:[...open],comparisons:expansions,line:1,result:'limited',message:`訪問回数の上限 ${budget} 回に達したため停止しました。経路がないという意味ではありません。`});return frames;
    }
    let ix = 0;
    if (informed) for (let j=1;j<open.length;j++) if (score(open[j]) < score(open[ix])) ix=j;
    const current = id === 'dfs' ? open.pop()! : open.splice(ix,1)[0];
    closed.add(current); visited.add(current); expansions++;
    const evaluation = informed ? {g:dist.get(current)!,h:h(current),f:score(current)} : {};
    if (current === goal) {
      const path = [goal]; let p = goal;
      while (parent.has(p)) { p = parent.get(p)!; path.unshift(p); }
      frames.push({ ...base, ...evaluation, active: [current], visited: [...visited], frontier: [...open], path, found: path, comparisons: expansions, cost: dist.get(goal), line: informed ? 3 : 4, result: 'found', message: `ゴールに到達！ ${path.length-1} 歩、移動コスト ${dist.get(goal)} の経路が見つかりました。` });
      return frames;
    }
    const nexts = neighbors(current,rows,cols); if (id==='dfs') nexts.reverse();
    for (const next of nexts) {
      if (grid[next]===1 || (closed.has(next) && id!=='a-search')) continue;
      const cost = dist.get(current)! + (informed && grid[next]===5 ? 5 : 1);
      if (costAware ? cost < (dist.get(next) ?? Infinity) : !discovered.has(next)) {
        closed.delete(next);
        dist.set(next,cost); parent.set(next,current); discovered.add(next); if (!open.includes(next)) open.push(next);
      }
    }
    frames.push({ ...base, ...evaluation, active: [current], visited: [...visited], frontier: [...open], comparisons: expansions, cost: dist.get(current), line: informed ? 2 : 3, message: `(${Math.floor(current/cols)}, ${current%cols}) を探索中。累積 ${expansions} 回訪問、${open.length} マスが探索待ちです。${informed?` g=${evaluation.g}, h=${evaluation.h}, f=${evaluation.f}。`:''}` });
  }
  frames.push({ ...base, visited: [...visited], frontier: [], comparisons: expansions, line: 1, result: 'missing', message: 'ゴールへの経路がありません。壁を編集して、もう一度試してみましょう。' });
  return frames;
}

function iterativeDeepeningFrames(grid: number[], start: number, goal: number, rows: number, cols: number, options: MazeOptions): Frame[] {
  const base = fresh(grid), frames: Frame[] = [{...base,active:[start],depth:0,depthLimit:0,message:'深さの上限を0から1ずつ増やし、スタートから探索を繰り返します。'}];
  const fullDepth = Math.max(0,grid.filter(cell=>cell!==1).length-1);
  const maximum = Math.min(fullDepth,Math.max(0,Math.floor(options.maxDepth ?? fullDepth)));
  const budget = Math.max(1,Math.floor(options.maxExpansions ?? MAX_MAZE_EXPANSIONS));
  let expansions=0;
  type Outcome = 'found'|'cutoff'|'exhausted'|'limited';
  for(let limit=0;limit<=maximum;limit++) {
    const bestDepth = new Map<number,number>(), visited = new Set<number>(), path=[start];
    frames.push({...base,depth:0,depthLimit:limit,comparisons:expansions,line:0,message:`深さ上限 ${limit} の探索を始めます。訪問履歴をリセットし、スタートからやり直します。`});
    function visit(current:number,depth:number): Outcome {
      if(expansions>=budget)return 'limited';
      bestDepth.set(current,depth);visited.add(current);expansions++;
      const found=current===goal;
      frames.push({...base,active:[current],visited:[...visited],trail:[...path],frontier:[],comparisons:expansions,cost:depth,depth,depthLimit:limit,line:found?4:depth===limit?5:3,
        ...(found?{path:[...path],found:[...path],result:'found' as const}:{}),
        message:found?`ゴールに到達！ ${depth} 歩の最短経路を発見。累積訪問 ${expansions} 回。`:`深さ ${depth} / 上限 ${limit}：(${Math.floor(current/cols)}, ${current%cols}) を訪問。${depth===limit?'これ以上は進まず、戻ります。':'次のマスを深さ優先で調べます。'}`});
      if(found)return 'found';
      const nexts=neighbors(current,rows,cols).filter(next=>grid[next]!==1 && depth+1<(bestDepth.get(next)??Infinity));
      if(depth===limit)return nexts.length?'cutoff':'exhausted';
      let cutoff=false;
      for(const next of nexts) {
        // A preceding branch may have reached this cell at a shallower depth.
        if(depth+1>=(bestDepth.get(next)??Infinity))continue;
        path.push(next);const outcome=visit(next,depth+1);path.pop();
        if(outcome==='found'||outcome==='limited')return outcome;
        if(outcome==='cutoff')cutoff=true;
      }
      return cutoff?'cutoff':'exhausted';
    }
    const outcome=visit(start,0);
    if(outcome==='found')return frames;
    if(outcome==='limited'||outcome==='exhausted'||limit===maximum) {
      const limited=outcome==='limited'||(outcome==='cutoff'&&maximum<fullDepth);
      frames.push({...base,visited:[...visited],frontier:[],comparisons:expansions,depthLimit:limit,line:outcome==='limited'?-1:12,result:limited?'limited':'missing',message:outcome==='limited'?`訪問回数の上限 ${budget} 回に達したため停止しました。経路がないという意味ではありません。`:limited?`深さ上限 ${maximum} まででは見つかりませんでした。上限を増やして再実行できます。`:'到達できる範囲を探索しましたが、ゴールへの経路がありません。'});
      return frames;
    }
  }
  return frames;
}

export function sortFrames(id: AlgorithmId, input: number[]): Frame[] {
  const a = [...input], frames = [{ ...fresh(a), message: '数値を小さい順に並べ替えます。比較と交換の動きを観察しましょう。' }];
  let comparisons=0, swaps=0;
  const push = (active: number[], line: number, message: string) => frames.push({ ...fresh(a), active, comparisons, swaps, line, message });
  const compare = (i: number,j: number,line: number) => { comparisons++; push([i,j],line,`${a[i]} と ${a[j]} を比較します。`); return a[i]-a[j]; };
  const swap = (i: number,j: number,line: number) => { if (i===j) return; [a[i],a[j]]=[a[j],a[i]]; swaps++; push([i,j],line,`位置 ${i} と ${j} の値を交換しました。`); };
  if (id==='bubble') {
    for (let end=a.length-1;end>0;end--) { let changed=false; for (let i=0;i<end;i++) if (compare(i,i+1,3)>0) { swap(i,i+1,4); changed=true; } if(!changed) break; }
  } else if (id==='selection') {
    for (let i=0;i<a.length-1;i++) { let min=i; for(let j=i+1;j<a.length;j++) if(compare(j,min,3)<0) min=j; swap(i,min,5); }
  } else if (id==='insertion') {
    for(let i=1;i<a.length;i++) { let j=i; while(j>0) { if(compare(j-1,j,3)<=0) break; swap(j-1,j,4); j--; } }
  } else {
    const stack: [number,number][] = a.length > 1 ? [[0,a.length-1]] : [];
    while(stack.length) { const [l,r]=stack.pop()!; let i=l; for(let j=l;j<r;j++) if(compare(j,r,5)<0) { swap(i,j,6); i++; } swap(i,r,7); if(i+1<r) stack.push([i+1,r]); if(l<i-1) stack.push([l,i-1]); }
  }
  frames.push({ ...fresh(a), found: a.map((_,i)=>i), comparisons, swaps, line: -1, result: 'complete', message: `整列が完了しました！ 比較 ${comparisons} 回、交換 ${swaps} 回。` });
  return frames;
}

export function parseValues(raw: string, max = 32): number[] {
  const parts=raw.trim().split(/[\s,、，]+/).filter(Boolean);
  if(parts.length<1 || parts.length>max) throw new Error(`数値を 1〜${max} 個入力してください。`);
  const values=parts.map(Number);
  if(values.some(v=>!Number.isInteger(v) || Math.abs(v)>999)) throw new Error('−999〜999 の整数を、カンマまたは空白で区切って入力してください。');
  return values;
}
