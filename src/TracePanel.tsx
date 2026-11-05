import { ArrowRight, Download, ListFilter } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { COLS, type Category, type Frame } from "./algorithms";
import { formatNodeScore, formatScore } from "./scoreFormatting";
import { TraceChart } from "./WorkspaceSummary";

type TracePanelProps = {
  frames: Frame[];
  category: Category;
  step: number;
  hidden: boolean;
  followTrace: boolean;
  onSeek: (step: number) => void;
  onExport: () => void;
};

export function TracePanel({
  frames,
  category,
  step,
  hidden,
  followTrace,
  onSeek,
  onExport,
}: TracePanelProps) {
  const [traceTab, setTraceTab] = useState<"table" | "chart">("table");
  const currentTrace = useRef<HTMLTableRowElement>(null);
  const isGraph = category === "problem" || category === "game";

  useEffect(() => {
    if (!followTrace) {
      return;
    }
    const row = currentTrace.current;
    const container = row?.closest(".trace-scroll");
    if (row && container) {
      const top = row.offsetTop;
      if (top < container.scrollTop + 35) {
        container.scrollTop = Math.max(0, top - 35);
      } else if (top + row.offsetHeight > container.scrollTop + container.clientHeight) {
        container.scrollTop = top + row.offsetHeight - container.clientHeight;
      }
    }
  }, [step, followTrace, hidden]);

  return (
    <section className="trace-card card" hidden={hidden}>
      <div className="panel-heading">
        <div className="panel-title">
          <span className="tiny-icon">
            <ListFilter size={17} />
          </span>
          <h2>トレース</h2>
          <span className="muted">実行の足あと</span>
        </div>
        <div className="trace-actions">
          <div className="trace-toggle">
            <button
              className={traceTab === "table" ? "active" : ""}
              onClick={() => setTraceTab("table")}
            >
              トレース表
            </button>
            <button
              className={traceTab === "chart" ? "active" : ""}
              onClick={() => setTraceTab("chart")}
            >
              推移チャート
            </button>
          </div>
          <button className="secondary-button export-button" onClick={onExport}>
            <Download size={14} />
            CSV
          </button>
        </div>
      </div>
      {traceTab === "table" ? (
        <div className="trace-scroll">
          <table>
            <thead>
              <tr>
                <th>ステップ</th>
                <th>{category === "maze" ? "現在のマス" : "現在の位置"}</th>
                <th>{category === "maze" ? "コスト" : "値"}</th>
                {category === "array" && (
                  <>
                    <th>left</th>
                    <th>mid / i</th>
                    <th>right</th>
                  </>
                )}
                <th>{category === "maze" ? "累積訪問数" : isGraph ? "訪問ノード数" : "比較数"}</th>
                {isGraph && (
                  <>
                    <th>根の結果</th>
                    <th>α</th>
                    <th>β</th>
                    <th>枝刈り数</th>
                  </>
                )}
                {category === "maze" && (
                  <>
                    <th>深さ / 上限</th>
                    <th>g</th>
                    <th>h</th>
                    <th>f</th>
                  </>
                )}
                <th>動作・判定</th>
              </tr>
            </thead>
            <tbody>
              {frames.slice(Math.max(0, step - 199), step + 1).map((f, offset) => {
                const i = Math.max(0, step - 199) + offset;
                return (
                  <tr
                    key={i}
                    ref={i === step ? currentTrace : undefined}
                    className={`${i === step ? "current-row" : ""} ${f.result === "found" || f.result === "complete" ? "success-row" : ""}`}
                    onClick={() => onSeek(i)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onSeek(i);
                      }
                    }}
                    aria-label={`ステップ ${i} に移動`}
                  >
                    <td>
                      <span className="step-cell">
                        {i === step ? <ArrowRight size={12} /> : <span />}
                        {String(i).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      {f.active.length
                        ? f.active
                            .map((n) =>
                              category === "maze"
                                ? `(${Math.floor(n / COLS)}, ${n % COLS})`
                                : `${category === "tree" || isGraph ? "ノード" : "a"}[${n}]`,
                            )
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="trace-value">
                      {category === "maze"
                        ? (f.cost ?? "—")
                        : f.active.length
                          ? f.active
                              .map((n) => (isGraph ? formatNodeScore(f, n) : f.array[n]))
                              .join(", ")
                          : "—"}
                    </td>
                    {category === "array" && (
                      <>
                        <td>{f.left ?? "—"}</td>
                        <td>{f.mid ?? "—"}</td>
                        <td>{f.right ?? "—"}</td>
                      </>
                    )}
                    <td>{f.comparisons}</td>
                    {isGraph && (
                      <>
                        <td>{formatScore(f.value)}</td>
                        <td>{formatScore(f.alpha)}</td>
                        <td>{formatScore(f.beta)}</td>
                        <td>{f.pruned?.length ?? 0}</td>
                      </>
                    )}
                    {category === "maze" && (
                      <>
                        <td>{f.depth !== undefined ? `${f.depth} / ${f.depthLimit}` : "—"}</td>
                        <td>{f.g ?? "—"}</td>
                        <td>{f.h ?? "—"}</td>
                        <td>{f.f ?? "—"}</td>
                      </>
                    )}
                    <td className="trace-message">{i === 0 ? "初期状態" : f.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <TraceChart frames={frames.slice(0, step + 1)} category={category} onSeek={onSeek} />
      )}
      <div className="trace-footer">
        <span>
          <i />
          現在までの直近200ステップを表示
        </span>
        <span>
          {step + 1} 行 <span className="footer-divider">|</span> 行をクリックして、その時点へ
        </span>
      </div>
    </section>
  );
}
