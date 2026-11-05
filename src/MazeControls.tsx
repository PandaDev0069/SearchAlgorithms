import type { AlgorithmId, Frame } from "./algorithms";

export function MazeSettings({
  algorithmId,
  heuristicWeight,
  maxDepth,
  onWeight,
  onDepth,
}: {
  algorithmId: AlgorithmId;
  heuristicWeight: number;
  maxDepth: number;
  onWeight: (n: number) => void;
  onDepth: (n: number) => void;
}) {
  if (algorithmId === "iddfs") {
    return (
      <div className="search-options">
        <label htmlFor="depth-limit">
          深さの上限
          <select
            id="depth-limit"
            value={maxDepth}
            onChange={(e) => onDepth(Number(e.target.value))}
          >
            <option value={0}>自動（通路数 − 1）</option>
            {[8, 16, 32, 64, 128].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <p>
          上限を1ずつ広げて再探索。訪問は累積で表示します。30,000回で停止し「上限到達」と表示します。
        </p>
      </div>
    );
  }
  if (algorithmId === "a-search") {
    return (
      <div className="search-options">
        <label htmlFor="heuristic-weight">
          予測の係数 α
          <select
            id="heuristic-weight"
            value={heuristicWeight}
            onChange={(e) => onWeight(Number(e.target.value))}
          >
            {[0, 0.5, 1, 1.5, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 0 ? "（ダイクストラ）" : n === 1 ? "（A* と同じ）" : ""}
              </option>
            ))}
          </select>
        </label>
        <p>
          f = g + α × マンハッタン距離。
          {heuristicWeight <= 1
            ? "現在の予測は過大評価しないため、最小コストを保証します。"
            : "α > 1 は予測を強めます。最小コストを保証しません。"}
        </p>
      </div>
    );
  }
  if (algorithmId === "greedy") {
    return (
      <div className="search-options">
        <span className="evaluation-formula">f(n) = h(n)</span>
        <p>ゴールまでの予測だけで次の候補を選びます。g は経路コストとして記録します。</p>
      </div>
    );
  }
  return null;
}

export function MazeEvaluation({
  algorithmId,
  frame,
  heuristicWeight,
}: {
  algorithmId: AlgorithmId;
  frame: Frame;
  heuristicWeight: number;
}) {
  if (algorithmId === "iddfs") {
    return (
      <div className="maze-evaluation">
        <span>今回の探索</span>
        <strong>
          深さ {frame.depth ?? "—"} <span>/ 上限 {frame.depthLimit ?? 0}</span>
        </strong>
        <span>
          累積訪問 <b>{frame.comparisons}</b> 回
        </span>
        <small>濃い緑：現在たどっている経路</small>
      </div>
    );
  }
  if (!["greedy", "a-search", "astar", "dijkstra"].includes(algorithmId)) {
    return null;
  }
  return (
    <div className="maze-evaluation">
      <span className="evaluation-formula">
        {algorithmId === "greedy"
          ? "f = h"
          : algorithmId === "dijkstra"
            ? "f = g"
            : `f = g + ${algorithmId === "a-search" ? heuristicWeight : 1} × 距離`}
      </span>
      <span>
        g <b>{frame.g ?? "—"}</b>
      </span>
      <span>
        h <b>{frame.h ?? "—"}</b>
      </span>
      <span>
        f <b>{frame.f ?? "—"}</b>
      </span>
      <small>g：実コスト ／ h：残りの予測</small>
    </div>
  );
}
