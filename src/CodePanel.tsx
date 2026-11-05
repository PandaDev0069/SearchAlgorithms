import { BookOpen, Clock3, Code2, Copy, Layers3, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Algorithm, Category, Frame } from "./algorithms";
import { CodeHighlight } from "./CodeHighlight";
import type { Preferences } from "./preferences";

type CodePanelProps = {
  algorithm: Algorithm;
  category: Category;
  frame: Frame;
  hidden: boolean;
  layout: Preferences["layout"];
  onCopy: (text: string, message: string) => void;
};

export function CodePanel({ algorithm, category, frame, hidden, layout, onCopy }: CodePanelProps) {
  const [codeTab, setCodeTab] = useState<"code" | "about">("code");
  const activeCodeLine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = activeCodeLine.current;
    const pane = row?.closest<HTMLElement>(".code-content");
    if (!row || !pane) {
      return;
    }
    const rowBox = row.getBoundingClientRect();
    const paneBox = pane.getBoundingClientRect();
    if (rowBox.top < paneBox.top || rowBox.bottom > paneBox.bottom) {
      pane.scrollTop += rowBox.top - paneBox.top - pane.clientHeight / 3;
    }
  }, [frame, algorithm.id, codeTab, hidden, layout]);

  return (
    <section className="code-card card" aria-label="擬似コードと解説" hidden={hidden}>
      <div className="code-tabs">
        <button className={codeTab === "code" ? "active" : ""} onClick={() => setCodeTab("code")}>
          <Code2 size={16} />
          擬似コード
        </button>
        <button className={codeTab === "about" ? "active" : ""} onClick={() => setCodeTab("about")}>
          <BookOpen size={15} />
          仕組み
        </button>
        <span>Python</span>
      </div>
      {codeTab === "code" ? (
        <div className="code-content">
          <div className="code-filename">
            <i /> {algorithm.id.replaceAll("-", "_")}_search.py <span>学習用</span>
            <button
              className="icon-button"
              aria-label="擬似コードをコピー"
              onClick={() => onCopy(algorithm.code.join("\n"), "擬似コードをコピーしました。")}
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="code-lines">
            {algorithm.code.map((line, i) => (
              <div
                key={i}
                ref={frame.line === i ? activeCodeLine : undefined}
                aria-current={frame.line === i ? "step" : undefined}
                className={`code-line ${frame.line === i ? "highlighted" : ""}`}
              >
                <span className="line-indicator">{frame.line === i ? "›" : ""}</span>
                <span className="line-number">{i + 1}</span>
                <code>
                  <CodeHighlight line={line} />
                </code>
              </div>
            ))}
          </div>
          <div className="code-footnote">
            <span className="code-dot" />
            対応行を表示 · 全行の逐次実行ではありません
          </div>
        </div>
      ) : (
        <div className="about-content">
          <span className="tag">HOW IT WORKS</span>
          <h3>{algorithm.name}の仕組み</h3>
          <p>{algorithm.description}</p>
          <ul>
            {algorithm.points.map((point, i) => (
              <li key={point}>
                <span>{i + 1}</span>
                {point}
              </li>
            ))}
          </ul>
          <div className="about-complexity">
            <Clock3 size={15} />
            最悪時間 <b>{algorithm.time}</b>
            <Layers3 size={15} />
            空間 <b>{algorithm.space}</b>
          </div>
        </div>
      )}
      <details className="code-tip">
        <summary>観察のヒント</summary>
        <span>
          <Sparkles size={15} />
        </span>
        <p>
          {category === "array"
            ? "探索する値を変えると、比較する場所も変わります。配列の値をクリックして試してみましょう。"
            : category === "maze"
              ? "同じ迷路で BFS と DFS を切り替えて、訪問する順番と経路の違いを観察しましょう。"
              : category === "tree"
                ? "挿入順を昇順にしてみると、木が一直線に。木の高さと探索回数の関係を発見できます。"
                : category === "game"
                  ? "同じ終端評価でミニマックス法とアルファベータ法を比べ、答えと訪問数を確認しましょう。"
                  : category === "problem"
                    ? "SUM は左右の答えを結合します。AND/OR では、両方が必要な問題と選べる問題の違いを観察しましょう。"
                    : "ほぼ整列された配列では、どの方法が有利でしょう？ データを変えて比較してみましょう。"}
        </p>
      </details>
    </section>
  );
}
