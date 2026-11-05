import {
  ArrowDown,
  Check,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  StepBack,
  StepForward,
  Timer,
} from "lucide-react";
import type { AlgorithmId, Category, Frame } from "./algorithms";

export const playbackSpeeds = [0.25, 0.5, 1, 2, 4, 8, 16];

type PlaybackProps = {
  playing: boolean;
  ended: boolean;
  step: number;
  lastStep: number;
  speed: number;
  shortcuts: boolean;
  onToggle: () => void;
  onReset: () => void;
  onSeek: (step: number) => void;
  onSpeed: (speed: number) => void;
};

export function PlaybackControls({
  playing,
  ended,
  step,
  lastStep,
  speed,
  shortcuts,
  onToggle,
  onReset,
  onSeek,
  onSpeed,
}: PlaybackProps) {
  return (
    <div className="playback" role="region" aria-label="実行コントロール">
      <div className="playback-top">
        <div className="transport">
          <button
            className="icon-button reset-control"
            onClick={onReset}
            title={shortcuts ? "最初に戻る (Home / R)" : "最初に戻る"}
            aria-label="リセット"
            aria-keyshortcuts={shortcuts ? "Home R" : undefined}
          >
            <RotateCcw size={17} />
          </button>
          <button
            className="step-button"
            disabled={step === 0}
            onClick={() => onSeek(step - 1)}
            aria-label="1ステップ戻る"
            aria-keyshortcuts={shortcuts ? "ArrowLeft" : undefined}
            title={shortcuts ? "1ステップ戻る (←)" : "1ステップ戻る"}
          >
            <StepBack size={18} />
            <span>戻る</span>
            {shortcuts && <kbd>←</kbd>}
          </button>
          <button
            className="play-button"
            onClick={onToggle}
            aria-label={playing ? "一時停止" : "再生"}
            aria-keyshortcuts={shortcuts ? "Space" : undefined}
            title={shortcuts ? "再生・一時停止 (Space)" : "再生・一時停止"}
          >
            {playing ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            <span>{playing ? "一時停止" : ended ? "もう一度" : "再生"}</span>
            {shortcuts && <kbd>Space</kbd>}
          </button>
          <button
            className="step-button"
            disabled={ended}
            onClick={() => onSeek(step + 1)}
            aria-label="1ステップ進む"
            aria-keyshortcuts={shortcuts ? "ArrowRight" : undefined}
            title={shortcuts ? "1ステップ進む (→)" : "1ステップ進む"}
          >
            <StepForward size={18} />
            <span>進む</span>
            {shortcuts && <kbd>→</kbd>}
          </button>
          <button
            className="icon-button end-control"
            disabled={ended}
            onClick={() => onSeek(lastStep)}
            aria-label="最後まで進む"
            aria-keyshortcuts={shortcuts ? "End" : undefined}
            title={shortcuts ? "最後まで進む (End)" : "最後まで進む"}
          >
            <SkipForward size={18} />
          </button>
        </div>
        <div className="speed-control">
          <Timer size={16} aria-hidden="true" />
          <label htmlFor="speed">速度</label>
          <select
            id="speed"
            value={speed}
            onChange={(event) => onSpeed(Number(event.target.value))}
            title={shortcuts ? "速度を変更 ([ / ])" : "速度を変更"}
          >
            {playbackSpeeds.map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
          <span className="playback-state">
            {playing ? "再生中" : ended ? "完了" : "停止中"}
          </span>
        </div>
      </div>
      <div className="timeline">
        <input
          type="range"
          aria-label="実行ステップ"
          aria-valuetext={`${lastStep} ステップ中 ${step} ステップ`}
          min="0"
          max={lastStep}
          value={step}
          onChange={(event) => onSeek(Number(event.target.value))}
          style={
            {
              "--progress": `${lastStep ? (step / lastStep) * 100 : 0}%`,
            } as React.CSSProperties
          }
        />
        <span>
          <b>{String(step).padStart(2, "0")}</b> / {lastStep} ステップ
        </span>
      </div>
    </div>
  );
}

// These are recorded snapshot values, not reconstructed interpreter locals.
export function watchEntries(
  frame: Frame,
  category: Category,
  algorithmId: AlgorithmId,
  target: number,
): [string, string][] {
  const list = (values: number[]) => (values.length ? values.join(", ") : "—");
  const entries: [string, string][] = [];
  if (category === "array") {
    entries.push(["target", String(target)]);
    if (frame.left !== undefined) entries.push(["left", String(frame.left)]);
    if (frame.right !== undefined) entries.push(["right", String(frame.right)]);
    entries.push([
      algorithmId === "binary"
        ? "mid"
        : algorithmId === "interpolation"
          ? "pos"
          : "確認 index",
      list(frame.active),
    ]);
    entries.push([
      "確認値",
      list(frame.active.map((index) => frame.array[index])),
    ]);
  } else if (category === "sort") {
    entries.push(
      ["比較 index", list(frame.active)],
      ["交換回数", String(frame.swaps)],
    );
    if (frame.left !== undefined) entries.push(["left", String(frame.left)]);
    if (frame.right !== undefined) entries.push(["right", String(frame.right)]);
  } else {
    entries.push(["現在ノード", list(frame.active)]);
    if (category === "tree") entries.push(["target", String(target)]);
    if (frame.frontier)
      entries.push(["探索待ち", String(frame.frontier.length)]);
    if (frame.depth !== undefined) entries.push(["深さ", String(frame.depth)]);
    for (const key of ["g", "h", "f", "alpha", "beta", "value"] as const)
      if (frame[key] !== undefined)
        entries.push([
          key === "alpha" ? "α" : key === "beta" ? "β" : key,
          String(frame[key]),
        ]);
  }
  entries.push([
    category === "array" || category === "sort" ? "比較回数" : "訪問回数",
    String(frame.comparisons),
  ]);
  return entries;
}

export function WatchStates({
  frame,
  previous,
  category,
  algorithmId,
  target,
}: {
  frame: Frame;
  previous?: Frame;
  category: Category;
  algorithmId: AlgorithmId;
  target: number;
}) {
  const before = new Map(
    previous ? watchEntries(previous, category, algorithmId, target) : [],
  );
  return (
    <section className="watch-panel" aria-label="現在の変数と状態">
      <span className="watch-title">変数・状態</span>
      <dl>
        {watchEntries(frame, category, algorithmId, target).map(
          ([name, value]) => {
            const changed = before.has(name) && before.get(name) !== value;
            return (
              <div
                key={name}
                className={changed ? "watch-changed" : ""}
                title={
                  changed ? `前のステップ: ${before.get(name)}` : undefined
                }
              >
                <dt>{name}</dt>
                <dd>
                  {value}
                  {changed && (
                    <span
                      className="watch-change"
                      aria-label="前のステップから変化"
                    >
                      •
                    </span>
                  )}
                </dd>
              </div>
            );
          },
        )}
      </dl>
    </section>
  );
}

export function CurrentInstruction({
  lines,
  line,
}: {
  lines: string[];
  line: number;
}) {
  return (
    <div className="current-instruction" aria-label="可視化に対応するコード行">
      <span>
        <ArrowDown size={14} aria-hidden="true" />
        対応行 <b>L{line + 1}</b>
      </span>
      <code>{lines[line]}</code>
      <Check
        size={14}
        className="instruction-sync"
        aria-label="同じステップに同期"
      />
    </div>
  );
}
