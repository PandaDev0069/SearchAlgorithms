import { BookOpen, Layers3, Sparkles } from "lucide-react";
import { useMemo } from "react";
import type { Category, MazeOptions } from "./algorithms";
import { algorithms } from "./algorithms";
import { createExecutionFrames } from "./execution";
import type { Experiment } from "./experiment";

export function Guide() {
  return (
    <>
      <span className="modal-eyebrow">
        <BookOpen size={16} />
        QUICK START
      </span>
      <h2 id="modal-title">動かして、理解しよう。</h2>
      <p className="modal-description">はじめての探索ラボ。3つのステップで始められます。</p>
      <div className="guide-steps">
        <div>
          <span>01</span>
          <div>
            <h3>アルゴリズムを選ぶ</h3>
            <p>
              配列・迷路・木・整列から実験室を選択。同じデータのまま、アルゴリズムを切り替えられます。
            </p>
          </div>
        </div>
        <div>
          <span>02</span>
          <div>
            <h3>データと目標を設定する</h3>
            <p>
              整数をカンマで区切って入力し「適用」を押します。探索対象は直接入力するほか、配列や木の値をクリックして設定できます。迷路はマスをなぞって壁を描けます。
            </p>
          </div>
        </div>
        <div>
          <span>03</span>
          <div>
            <h3>再生し、トレースで確かめる</h3>
            <p>
              1ステップずつ進めたり、前の状態へ戻ったりできます。「仕組み」で前提と計算量を読み、CSV
              で全ステップを保存しましょう。
            </p>
          </div>
        </div>
      </div>
      <div className="keyboard-guide">
        <strong>キーボードでも操作できます</strong>
        <span>
          <kbd>Space</kbd> 再生 / 停止
        </span>
        <span>
          <kbd>←</kbd>
          <kbd>→</kbd> ステップ移動
        </span>
        <span>
          <kbd>R</kbd> リセット
        </span>
        <span>
          <kbd>Shift</kbd>＋<kbd>←</kbd>
          <kbd>→</kbd> 10ステップ移動
        </span>
        <span>
          <kbd>Home</kbd> 最初へ / <kbd>End</kbd> 最後へ
        </span>
        <span>
          <kbd>[</kbd> 減速 / <kbd>]</kbd> 加速
        </span>
        <span>
          <kbd>Ctrl / ⌘</kbd>＋<kbd>Z</kbd> 元に戻す（Shiftでやり直し）
        </span>
        <span>
          <kbd>?</kbd> このガイドを開く
        </span>
        <small>
          入力中は通常の編集操作が優先されます。迷路内の矢印キーはマスの移動、Enter / Space
          は編集に使います。表示設定で再生のショートカットを無効にできます。
        </small>
      </div>
      <p className="guide-note">
        1ステップは比較・訪問などの操作単位です。擬似コードは対応行を示し、すべての行を逐次実行するデバッガーではありません。変数・状態の印は前のステップからの変化を表します。
      </p>
      <p className="guide-note">
        インデックスと迷路の座標は 0
        始まり。配列の最大要素数は32、木は31ノードです。整列が前提の探索では、入力を自動的に昇順にします。表示設定・実験・学習記録はブラウザーに保存します。
      </p>
      <p className="guide-note">
        「表示設定」でテーマ・文字サイズ・レイアウトを変更できます。ツールバーから実験の保存・読み込み・共有、30回分の元に戻す操作ができます。「学習の冒険」では、毎日の体験でXPや宝箱、実績を獲得できます。
      </p>
    </>
  );
}

export function Comparison({
  category,
  data,
  grid,
  start,
  goal,
  target,
  mazeOptions,
}: {
  category: Category;
  data: Experiment["data"];
  grid: number[];
  start: number;
  goal: number;
  target: number;
  mazeOptions: MazeOptions;
}) {
  const results = useMemo(() => {
    const sortedArray = [...data.array].sort((left, right) => left - right);

    return algorithms
      .filter((a) => a.category === category)
      .map((a) => {
        const frames = createExecutionFrames(
          {
            category,
            algorithmId: a.id,
            data: { ...data, array: a.id === "linear" ? data.array : sortedArray },
            grid,
            start,
            goal,
            target,
          },
          mazeOptions,
        );

        return {
          algorithm: a,
          last: frames[frames.length - 1],
          steps: frames.length - 1,
        };
      });
  }, [category, data, grid, start, goal, target, mazeOptions]);
  const max = Math.max(1, ...results.map((r) => r.last.comparisons));
  return (
    <>
      <span className="modal-eyebrow">
        <Layers3 size={16} />
        COMPARE & DISCOVER
      </span>
      <h2 id="modal-title">同じデータで、比べてみる。</h2>
      <p className="modal-description">
        現在の
        {category === "maze"
          ? "迷路"
          : category === "tree"
            ? "木"
            : category === "game"
              ? "終端評価"
              : category === "problem"
                ? "入力値"
                : "配列"}
        を使った、実際の実行結果です。
        {category === "array" || category === "tree" ? ` 探索する値：${target}` : ""}
      </p>
      <div className="comparison-list">
        {results.map(({ algorithm: a, last, steps }) => (
          <div className="comparison-item" key={a.id}>
            <div>
              <strong>{a.name}</strong>
              <span>{a.time}</span>
              <b>
                {last.comparisons}{" "}
                <small>
                  {category === "maze"
                    ? "マス訪問"
                    : category === "problem" || category === "game"
                      ? "ノード訪問"
                      : "回比較"}
                </small>
              </b>
            </div>
            <div className="comparison-bar">
              <span style={{ width: `${(last.comparisons / max) * 100}%` }} />
            </div>
            <p>
              {last.result === "limited"
                ? "上限到達（経路の有無は未確定）"
                : last.result === "missing"
                  ? category === "problem"
                    ? "根の問題を解決できませんでした"
                    : "目標は見つかりませんでした"
                  : category === "game"
                    ? a.id === "game-tree"
                      ? "全局面を走査（最善手の選択なし）"
                      : `評価値 ${last.value} / 最善手 ${last.path?.[1] ?? "終端"} / 枝刈り ${last.pruned?.length ?? 0} ノード`
                    : category === "problem"
                      ? a.id === "and-or"
                        ? "解グラフを発見"
                        : `総和 ${last.value}`
                      : category === "maze"
                        ? `${(last.path?.length ?? 1) - 1} 歩 / コスト ${last.cost}`
                        : category === "sort"
                          ? `交換 ${last.swaps} 回`
                          : "目標を発見"}
              <span>{steps} ステップ</span>
            </p>
          </div>
        ))}
      </div>
      <div className="comparison-note">
        <Sparkles size={16} />
        <p>
          {category === "array"
            ? "線形探索以外には、同じ値を昇順に並べた配列を使います。整列のコストは含みません。比較回数は要素と目標の比較を1回として数えます。"
            : category === "maze"
              ? "BFS / DFS / 反復深化は重みを無視します。最良優先 / A / A* / ダイクストラは重みをコストに加算します。最良優先と α>1 の A は最小コストを保証しません。反復深化は再訪問を累積し、設定した深さ上限を使用します。"
              : category === "tree"
                ? "同じ木と目標値でも、ノードを訪問する順番によって比較回数が変わります。"
                : category === "game"
                  ? "同じゲーム木を左から探索します。ミニマックス法とアルファベータ法の根の評価と最善手は一致します。訪問数には内部ノードも含み、枝刈りした局面は含みません。"
                  : category === "problem"
                    ? "同じ数列を、分解では加算、AND/OR では成否（0 は失敗）として使います。異なる問題なので、訪問数は処理の違いを観察するための指標です。"
                    : "交換回数には、同じ位置どうしの交換は含みません。入力の並びを変えると、結果も変わります。"}
        </p>
      </div>
    </>
  );
}
