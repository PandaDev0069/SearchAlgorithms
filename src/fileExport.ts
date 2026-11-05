import { COLS, type Category, type Frame } from "./algorithms";
import { formatNodeScore, formatScore } from "./scoreFormatting";

export function downloadFile(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Serialize every frame as quoted CSV, with a UTF-8 BOM for spreadsheet apps. */
export function traceCsv(frames: Frame[], category: Category): string {
  const isGraph = category === "problem" || category === "game";
  const rows = [
    [
      "ステップ",
      "現在位置",
      "値",
      "left",
      "mid",
      "right",
      "深さ",
      "深さ上限",
      "g（実コスト）",
      "h（予測）",
      "f（評価値）",
      "α",
      "β",
      "根の評価値・総和・成否",
      "枝刈りノード",
      "比較・訪問回数",
      "交換回数",
      "移動コスト",
      "説明",
    ],
    ...frames.map((f, i) => [
      i,
      f.active.join(" / "),
      f.active
        .map((n) =>
          category === "maze"
            ? `(${Math.floor(n / COLS)},${n % COLS})`
            : isGraph
              ? formatNodeScore(f, n)
              : f.array[n],
        )
        .join(" / "),
      f.left ?? "",
      f.mid ?? "",
      f.right ?? "",
      f.depth ?? "",
      f.depthLimit ?? "",
      f.g ?? "",
      f.h ?? "",
      f.f ?? "",
      f.alpha === undefined ? "" : formatScore(f.alpha),
      f.beta === undefined ? "" : formatScore(f.beta),
      f.value ?? "",
      f.pruned?.join(" / ") ?? "",
      f.comparisons,
      f.swaps,
      f.cost ?? "",
      f.message,
    ]),
  ];
  return (
    "\uFEFF" +
    rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\r\n")
  );
}
