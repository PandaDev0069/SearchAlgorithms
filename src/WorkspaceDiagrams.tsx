import { ArrowDown, ArrowRight, Check, Target } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { Category, Frame } from "./algorithms";
import { buildTree } from "./algorithms";

export function ArrayDiagram({
  frame,
  target,
  view,
  category,
  onPick,
}: {
  frame: Frame;
  target: number;
  view: "boxes" | "bars";
  category: Category;
  onPick: (n: number) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pane = viewport.current;
    const cell = pane?.querySelector<HTMLElement>(".array-column.active, .array-column.found");
    if (!pane || !cell) {
      return;
    }
    const cellBox = cell.getBoundingClientRect();
    const paneBox = pane.getBoundingClientRect();
    if (cellBox.left < paneBox.left || cellBox.right > paneBox.right) {
      pane.scrollLeft += cellBox.left - paneBox.left - (pane.clientWidth - cellBox.width) / 2;
    }
  }, [frame, view]);
  const low = frame.left ?? 0;
  const high = frame.right ?? frame.array.length - 1;
  const min = Math.min(0, ...frame.array);
  const max = Math.max(1, ...frame.array);
  return (
    <div className={`array-canvas ${view}`}>
      <div className="canvas-topline">
        <span>
          {category === "sort" ? "ARRAY → ASCENDING" : "ARRAY"}
          <span className="mono">[{frame.array.length}]</span>
        </span>
        {category !== "sort" && (
          <span className="target-pill">
            <Target size={12} />
            target <b>{target}</b>
          </span>
        )}
      </div>
      {category === "array" && frame.active.length > 0 && (
        <div className="comparison-readout" aria-label="値の比較">
          <span>比較</span>
          <code>
            a[{frame.active[0]}] = {frame.array[frame.active[0]]}{" "}
            <b>
              {frame.array[frame.active[0]] === target
                ? "="
                : frame.array[frame.active[0]] < target
                  ? "<"
                  : ">"}
            </b>{" "}
            target ({target})
          </code>
        </div>
      )}
      <div className="array-scroll" ref={viewport}>
        <div
          className="array-track"
          style={
            {
              "--array-length": frame.array.length,
              gridTemplateColumns: `repeat(${frame.array.length}, minmax(${frame.array.length > 20 ? "33" : "38"}px, 1fr))`,
            } as React.CSSProperties
          }
        >
          {frame.array.map((value, i) => {
            const active = frame.active.includes(i);
            const found = frame.found.includes(i);
            const visited = frame.visited.includes(i);
            const inRange = i >= low && i <= high;
            return (
              <div
                key={i}
                className={`array-column ${category === "sort" ? "sorting" : ""} ${found ? "found" : active ? "active" : !inRange ? "excluded" : visited ? "visited" : "in-range"}`}
              >
                <div className="pointer-label">
                  {active && !found ? (
                    <>
                      <ArrowDown size={15} />
                      <span>{category === "sort" ? "比較" : frame.mid === i ? "mid" : "i"}</span>
                    </>
                  ) : found ? (
                    <>
                      <Check size={15} />
                      <span>{category === "sort" ? "確定" : "発見"}</span>
                    </>
                  ) : category === "array" && (i === low || i === high) ? (
                    <>
                      <ArrowDown size={12} />
                      <span>
                        {i === low && i === high ? "L / R" : i === low ? "left" : "right"}
                      </span>
                    </>
                  ) : null}
                </div>
                <button
                  className="array-value"
                  style={
                    view === "bars"
                      ? {
                          height: `${48 + ((value - min) / (max - min)) * 100}px`,
                        }
                      : undefined
                  }
                  onClick={() => {
                    if (category !== "sort") {
                      onPick(value);
                    }
                  }}
                  disabled={category === "sort"}
                  title={category === "sort" ? `a[${i}] = ${value}` : `${value} を探索対象にする`}
                  aria-label={`a[${i}] = ${value}：${found ? (category === "sort" ? "整列確定" : "発見") : active ? "比較中・現在位置" : !inRange ? "探索範囲外" : visited ? "確認済み" : "未確認"}${category !== "sort" ? `。${value} を探索対象にする` : ""}`}
                >
                  <span>{value}</span>
                </button>
                <span className="array-index">{i}</span>
                <span className="cell-state">
                  {found
                    ? category === "sort"
                      ? "確定"
                      : "発見"
                    : active
                      ? category === "sort"
                        ? "比較"
                        : "現在"
                      : !inRange
                        ? "対象外"
                        : visited
                          ? "確認済"
                          : ""}
                </span>
                <div
                  className={`range-line ${category === "array" && inRange && !frame.result ? "visible" : ""}`}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="canvas-bottomline">
        <span>
          index <ArrowRight size={11} />
        </span>
        <span>{category === "sort" ? "昇順に並べ替えます" : "値をクリックして探索対象に設定"}</span>
      </div>
    </div>
  );
}

export function TreeDiagram({
  values,
  frame,
  onPick,
}: {
  values: number[];
  frame: Frame;
  onPick: (n: number) => void;
}) {
  const nodes = useMemo(() => buildTree(values), [values]);
  const depth = Math.max(...nodes.map((n) => n.depth));
  const width = Math.max(600, nodes.length * 44);
  const height = Math.max(240, (depth + 1) * 66 + 22);
  const x = (id: number) => 32 + (nodes[id].x * (width - 64)) / Math.max(1, nodes.length - 1);
  const y = (id: number) => 32 + nodes[id].depth * 66;
  return (
    <div className="tree-canvas">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          minWidth: Math.min(width, 800),
          height: Math.min(520, height),
        }}
        role="img"
        aria-label="入力順から構築した二分探索木"
      >
        {nodes.flatMap((n) =>
          [n.left, n.right]
            .filter((id): id is number => id !== null)
            .map((id) => (
              <line
                key={`${n.id}-${id}`}
                x1={x(n.id)}
                y1={y(n.id)}
                x2={x(id)}
                y2={y(id)}
                className={
                  frame.visited.includes(n.id) &&
                  (frame.visited.includes(id) || frame.active.includes(id))
                    ? "tree-edge visited"
                    : "tree-edge"
                }
              />
            )),
        )}
        {nodes.map((n) => (
          <g
            key={n.id}
            role="button"
            tabIndex={0}
            aria-label={`${n.value} を探索対象にする：${frame.found.includes(n.id) ? "発見" : frame.active.includes(n.id) ? "現在位置" : frame.visited.includes(n.id) ? "確認済み" : "未確認"}`}
            onClick={() => onPick(n.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onPick(n.value);
              }
            }}
            className={`tree-node ${frame.found.includes(n.id) ? "found" : frame.active.includes(n.id) ? "active" : frame.visited.includes(n.id) ? "visited" : ""}`}
          >
            <circle cx={x(n.id)} cy={y(n.id)} r="21" />
            {(frame.active.includes(n.id) || frame.found.includes(n.id)) && (
              <text className="node-state" x={x(n.id)} y={y(n.id) - 27} textAnchor="middle">
                {frame.found.includes(n.id) ? "✓" : "▼"}
              </text>
            )}
            <text x={x(n.id)} y={y(n.id) + 5} textAnchor="middle">
              {n.value}
            </text>
            {n.id === 0 && (
              <text className="root-label" x={x(n.id) + 30} y={y(n.id) + 4}>
                root
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
