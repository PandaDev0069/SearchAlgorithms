import { useMemo } from "react";
import type { AdvancedId, SearchNode } from "./advancedSearch";
import { buildSearchGraph } from "./advancedSearch";
import type { Frame } from "./algorithms";
import { formatNodeScore, formatScore } from "./scoreFormatting";

function nodeLabel(id: AdvancedId, node: SearchNode, frame: Frame): string | number | undefined {
  if (node.kind === "leaf") {
    if (id === "and-or") {
      return node.value === 0 ? "失敗" : "成功";
    }
    return node.value;
  }

  const score = frame.evaluations?.[node.id];
  if (score === null || score === undefined) {
    return "?";
  }
  if (id === "and-or") {
    return score ? "成功" : "失敗";
  }
  return formatNodeScore(frame, node.id);
}

export function SearchGraphDiagram({
  id,
  values,
  frame,
}: {
  id: AdvancedId;
  values: number[];
  frame: Frame;
}) {
  const nodes = useMemo(() => buildSearchGraph(id, values), [id, values]);
  const width = Math.max(600, values.length * 84);
  const height = Math.max(270, (Math.max(0, ...nodes.map((node) => node.depth)) + 1) * 88);
  const x = (nodeId: number) => 38 + nodes[nodeId].x * (width - 76);
  const y = (nodeId: number) => 36 + nodes[nodeId].depth * 88;
  const edgeSelected = (parent: number, child: number) =>
    frame.solutionEdges?.some(([from, to]) => from === parent && to === child);
  return (
    <div className="search-graph">
      <div className="search-evaluation" aria-label="探索の評価">
        {id === "alpha-beta" && (
          <span>
            α = {formatScore(frame.alpha)} / β = {formatScore(frame.beta)} / 枝刈り{" "}
            {frame.pruned?.length ?? 0} ノード
          </span>
        )}
        <span>
          {id === "decomposition" ? "総和" : id === "and-or" ? "根の成否" : "根の評価値"}：
          {id === "and-or" && frame.value !== undefined
            ? frame.value
              ? "成功"
              : "失敗"
            : formatScore(frame.value)}
        </span>
        {frame.path && frame.path.length > 1 && <span>最善手：ノード {frame.path[1]}</span>}
      </div>
      <div className="search-graph-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: width, height }}
          role="img"
          aria-label={
            id === "and-or"
              ? "共有する終端を持つ AND/OR グラフ"
              : id === "decomposition"
                ? "総和の問題分解木"
                : "MAX と MIN が交互に手番を持つゲーム木"
          }
        >
          {nodes.flatMap((node) =>
            node.children.map((child) => (
              <line
                key={`${node.id}-${child}`}
                x1={x(node.id)}
                y1={y(node.id)}
                x2={x(child)}
                y2={y(child)}
                className={`search-edge ${edgeSelected(node.id, child) ? "selected" : ""} ${frame.pruned?.includes(child) ? "pruned" : ""}`}
              />
            )),
          )}
          {nodes.map((node) => {
            const pruned = frame.pruned?.includes(node.id);
            const display = nodeLabel(id, node, frame);
            return (
              <g
                key={node.id}
                className={`search-node ${pruned ? "pruned" : frame.active.includes(node.id) ? "active" : frame.found.includes(node.id) ? "found" : frame.visited.includes(node.id) ? "visited" : ""}`}
              >
                <title>{`ノード ${node.id}：${node.kind.toUpperCase()}、${display}${pruned ? "（枝刈り・未訪問）" : ""}`}</title>
                <rect
                  x={x(node.id) - 32}
                  y={y(node.id) - 25}
                  width="64"
                  height="50"
                  rx={node.kind === "leaf" ? 20 : 8}
                />
                {(frame.active.includes(node.id) || frame.found.includes(node.id)) && (
                  <text
                    className="node-state"
                    x={x(node.id)}
                    y={y(node.id) - 29}
                    textAnchor="middle"
                  >
                    {frame.found.includes(node.id) ? "✓" : "▼"}
                  </text>
                )}
                <text
                  className="search-node-kind"
                  x={x(node.id)}
                  y={y(node.id) - 9}
                  textAnchor="middle"
                >
                  {node.kind === "leaf" ? `#${node.id}` : node.kind.toUpperCase()}
                </text>
                <text x={x(node.id)} y={y(node.id) + 12} textAnchor="middle">
                  {display}
                </text>
                {pruned && (
                  <line
                    className="pruned-mark"
                    x1={x(node.id) - 28}
                    y1={y(node.id) + 22}
                    x2={x(node.id) + 28}
                    y2={y(node.id) - 22}
                  />
                )}
                {node.kind !== "leaf" && (
                  <text
                    className="search-node-id"
                    x={x(node.id)}
                    y={y(node.id) + 39}
                    textAnchor="middle"
                  >
                    #{node.id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="search-graph-note">
        {id === "and-or"
          ? "AND：すべて必要 / OR：どれか1つ。隣の AND ノードと終端を共有します。"
          : id === "decomposition"
            ? "SUM：左右の部分問題の答えを足し合わせます。"
            : "MAX：自分の手番 / MIN：相手の手番。終端の値は MAX 側の得点です。"}{" "}
        訪問したノード数を記録します。
      </p>
    </div>
  );
}
