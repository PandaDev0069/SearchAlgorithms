import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
const dom = new JSDOM(
  '<!doctype html><html><head><meta name="theme-color"></head><body></body></html>',
  { url: "http://localhost/" },
);
for (const name of [
  "window",
  "document",
  "HTMLElement",
  "HTMLInputElement",
  "Node",
  "MutationObserver",
  "localStorage",
  "getComputedStyle",
])
  Object.defineProperty(globalThis, name, {
    value: (dom.window as unknown as Record<string, unknown>)[name],
    configurable: true,
    writable: true,
  });
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
Object.defineProperty(window, "matchMedia", {
  value: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }),
  configurable: true,
});
const { render, screen, fireEvent, cleanup, waitFor, within } = await import(
  "@testing-library/react"
);
const { default: userEvent } = await import("@testing-library/user-event");
const { default: App } = await import("../src/App.tsx");
const { algorithms, searchFrames, defaultArray } = await import(
  "../src/algorithms.ts"
);
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanup();
});

test("stepping either direction restores the same code, values and visual state", () => {
  render(<App />);
  assert.ok(screen.getByRole("region", { name: "同期実行ワークスペース" }));
  assert.ok(screen.getByText("1ステップ = 比較・訪問などの操作単位"));
  assert.equal(/\?{3,}/.test(document.body.textContent ?? ""), false);
  const frames = searchFrames("binary", defaultArray, 63);
  const slider = screen.getByRole("slider", {
    name: "実行ステップ",
  }) as HTMLInputElement;
  const watch = screen.getByRole("region", { name: "現在の変数と状態" });
  const assertSnapshot = (step: number) => {
    const frame = frames[step];
    assert.equal(slider.value, String(step));
    const line = document.querySelector('.code-line[aria-current="step"]')!;
    assert.equal(
      line.querySelector("code")?.textContent,
      algorithms.find((a) => a.id === "binary")!.code[frame.line],
    );
    assert.equal(
      document.querySelector(".current-instruction code")?.textContent,
      line.querySelector("code")?.textContent,
    );
    const values = new Map(
      [...watch.querySelectorAll("dl > div")].map((entry) => [
        entry.querySelector("dt")!.textContent,
        entry.querySelector("dd")!.childNodes[0].textContent,
      ]),
    );
    assert.equal(
      values.get("mid"),
      frame.active.length ? String(frame.active[0]) : "—",
    );
    assert.equal(values.get("比較回数"), String(frame.comparisons));
    const current = document.querySelector(
      ".array-column.active .array-index, .array-column.found .array-index",
    );
    assert.equal(
      current?.textContent,
      frame.active.length ? String(frame.active[0]) : undefined,
    );
  };
  assertSnapshot(0);
  fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
  assertSnapshot(1);
  const firstWatch = watch.textContent;
  fireEvent.keyDown(document.body, { code: "ArrowRight", key: "ArrowRight" });
  assertSnapshot(2);
  assert.ok(watch.querySelector(".watch-changed"));
  fireEvent.keyDown(document.body, { code: "ArrowLeft", key: "ArrowLeft" });
  assertSnapshot(1);
  assert.equal(
    watch.textContent?.replaceAll("•", ""),
    firstWatch?.replaceAll("•", ""),
  );
});

test("Space pauses from a transport button, repeat does not toggle, and speed shortcuts preserve the step", () => {
  render(<App />);
  const next = screen.getByRole("button", { name: "1ステップ進む" });
  fireEvent.click(screen.getByRole("button", { name: "再生" }));
  assert.equal(
    document.querySelector(".explanation")?.getAttribute("aria-live"),
    "off",
  );
  next.focus();
  fireEvent.keyDown(next, { code: "Space", key: " " });
  assert.ok(screen.getByRole("button", { name: "再生" }));
  assert.equal(
    document.querySelector(".explanation")?.getAttribute("aria-live"),
    "polite",
  );
  fireEvent.keyDown(next, { code: "Space", key: " ", repeat: true });
  assert.ok(screen.getByRole("button", { name: "再生" }));
  const slider = screen.getByRole("slider", {
    name: "実行ステップ",
  }) as HTMLInputElement;
  const speed = screen.getByRole("combobox", {
    name: "速度",
  }) as HTMLSelectElement;
  fireEvent.keyDown(document.body, { code: "BracketRight", key: "]" });
  assert.equal(speed.value, "2");
  assert.equal(slider.value, "0");
  fireEvent.change(speed, { target: { value: "0.5" } });
  assert.equal(speed.value, "0.5");
  const data = screen.getByLabelText(/配列のデータ/);
  fireEvent.keyDown(data, { code: "BracketRight", key: "]" });
  fireEvent.keyDown(data, { code: "ArrowRight", key: "ArrowRight" });
  fireEvent.keyDown(data, { code: "Space", key: " " });
  assert.equal(speed.value, "0.5");
  assert.equal(slider.value, "0");
  assert.ok(screen.getByRole("button", { name: "再生" }));
  fireEvent.click(screen.getByRole("button", { name: "表示設定" }));
  fireEvent.click(
    screen.getByRole("switch", { name: "再生のキーボードショートカット" }),
  );
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "閉じる" }),
  );
  fireEvent.keyDown(document.body, { code: "ArrowRight", key: "ArrowRight" });
  fireEvent.keyDown(document.body, { code: "Space", key: " " });
  assert.equal(slider.value, "0");
  assert.ok(screen.getByRole("button", { name: "再生" }));
  assert.equal(
    screen
      .getByRole("button", { name: "1ステップ進む" })
      .getAttribute("aria-keyshortcuts"),
    null,
  );
  fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
  assert.equal(slider.value, "1");
});

test("navigation drawer traps focus, closes with Escape and hands focus to a selected dialog", async () => {
  render(<App />);
  const user = userEvent.setup({ document });
  const trigger = screen.getByRole("button", { name: "メニューを開く" });
  fireEvent.click(screen.getByRole("button", { name: "再生" }));
  fireEvent.click(trigger);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  const drawer = screen.getByRole("dialog", { name: "実験室と学習ツール" });
  const last = within(drawer).getByRole("button", { name: "ヘルプ" });
  last.focus();
  await user.keyboard("{Tab}");
  assert.equal(
    document.activeElement,
    within(drawer).getByRole("button", { name: "メニューを閉じる" }),
  );
  fireEvent.keyDown(document.activeElement!, { code: "Escape", key: "Escape" });
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, trigger);
  assert.ok(screen.getByRole("button", { name: "再生" }));
  fireEvent.click(trigger);
  fireEvent.click(
    within(
      screen.getByRole("dialog", { name: "実験室と学習ツール" }),
    ).getByRole("button", { name: "表示・操作の設定" }),
  );
  assert.equal(screen.getAllByRole("dialog").length, 1);
  assert.equal(
    document.activeElement,
    within(screen.getByRole("dialog")).getByRole("button", { name: "閉じる" }),
  );
});

test("appearance, layout and accessible display controls apply immediately and survive remount", async () => {
  const view = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "表示設定" }));
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("button", { name: "ダーク" }));
  fireEvent.change(dialog.getByRole("slider", { name: /文字サイズ/ }), {
    target: { value: "135" },
  });
  fireEvent.click(dialog.getByRole("button", { name: "縦並び" }));
  fireEvent.click(
    dialog.getByRole("switch", { name: "色に加えて枠線・模様で区別" }),
  );
  assert.equal(document.documentElement.dataset.theme, "dark");
  assert.equal(
    document.documentElement.style.getPropertyValue("--font-scale"),
    "1.35",
  );
  assert.equal(document.documentElement.dataset.contrast, "high");
  fireEvent.click(dialog.getByRole("button", { name: "閉じる" }));
  assert.ok(document.querySelector(".layout-stacked"));
  view.unmount();
  render(<App />);
  assert.ok(document.querySelector(".layout-stacked"));
  assert.equal(document.documentElement.dataset.theme, "dark");
  fireEvent.click(screen.getByRole("button", { name: "集中レイアウト" }));
  assert.equal(document.querySelector<HTMLElement>(".code-card")?.hidden, true);
});

test("editing is undoable and redoable, native text editing stays native", () => {
  render(<App />);
  const input = screen.getByLabelText(/配列のデータ/) as HTMLInputElement;
  fireEvent.change(input, { target: { value: "1, 2, 3" } });
  fireEvent.click(screen.getByRole("button", { name: "適用" }));
  assert.equal(input.value, "1, 2, 3");
  fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
  assert.ok(input.value.includes("92"));
  fireEvent.click(screen.getByRole("button", { name: "やり直す" }));
  assert.equal(input.value, "1, 2, 3");
  fireEvent.keyDown(input, { key: "z", ctrlKey: true });
  assert.equal(input.value, "1, 2, 3");
});

test("completed algorithms grant daily credit once and a chest cannot be opened twice", async () => {
  const view = render(<App />);
  for (const id of ["binary", "linear", "jump"]) {
    fireEvent.change(screen.getByLabelText("アルゴリズム"), {
      target: { value: id },
    });
    fireEvent.click(screen.getByRole("button", { name: "最後まで進む" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "学習の冒険" }));
  let dialog = within(screen.getByRole("dialog"));
  assert.ok(dialog.getByText("合計 60 XP ・次のレベルまで 40 XP"));
  fireEvent.click(dialog.getByRole("button", { name: "宝箱を開ける" }));
  assert.ok(dialog.getByText("合計 110 XP ・次のレベルまで 90 XP"));
  assert.equal(
    (dialog.getByRole("button", { name: "受け取り済み" }) as HTMLButtonElement)
      .disabled,
    true,
  );
  view.unmount();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "学習の冒険" }));
  dialog = within(screen.getByRole("dialog"));
  assert.ok(dialog.getByText("合計 110 XP ・次のレベルまで 90 XP"));
  fireEvent.click(dialog.getByRole("button", { name: "閉じる" }));
  fireEvent.click(screen.getByRole("button", { name: "リセット" }));
  fireEvent.click(screen.getByRole("button", { name: "最後まで進む" }));
  fireEvent.click(screen.getByRole("button", { name: "学習の冒険" }));
  assert.ok(
    within(screen.getByRole("dialog")).getByText(
      "合計 110 XP ・次のレベルまで 90 XP",
    ),
  );
  await waitFor(() => assert.ok(localStorage.getItem("tansaku-learning-v1")));
});

test("saved experiments restore stopped and a malformed share link leaves a usable workspace", async () => {
  const view = render(<App />);
  const input = screen.getByLabelText(/配列のデータ/);
  fireEvent.change(input, { target: { value: "10, 20, 30" } });
  fireEvent.click(screen.getByRole("button", { name: "適用" }));
  await waitFor(() =>
    assert.ok(
      localStorage.getItem("tansaku-experiment-v1")?.includes("10,20,30"),
    ),
  );
  view.unmount();
  render(<App />);
  assert.equal(
    (screen.getByLabelText(/配列のデータ/) as HTMLInputElement).value,
    "10, 20, 30",
  );
  assert.ok(screen.getByRole("button", { name: "再生" }));
  cleanup();
  window.history.replaceState(null, "", "/#lab=invalid!");
  render(<App />);
  assert.ok(
    screen
      .getByRole("status")
      .textContent?.includes("共有リンクを読み込めません"),
  );
  assert.ok(screen.getByLabelText("アルゴリズム"));
});

test("modal closes with Escape and restores focus; trace visibility is configurable", () => {
  render(<App />);
  const opener = screen.getByRole("button", { name: "表示設定" });
  opener.focus();
  fireEvent.click(opener);
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.click(dialog.getByRole("switch", { name: "トレースを表示" }));
  fireEvent.keyDown(document, { key: "Escape" });
  assert.equal(screen.queryByRole("dialog"), null);
  assert.equal(document.activeElement, opener);
  assert.equal(
    document.querySelector<HTMLElement>(".trace-card")?.hidden,
    true,
  );
});

test("maze arrows move focus without advancing playback; a painted stroke undoes as one action", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: "迷路の探索" }));
  const first = screen.getByRole("button", { name: "マス 1, 2：通路" }),
    second = screen.getByRole("button", { name: "マス 1, 3：通路" });
  fireEvent.pointerDown(first);
  fireEvent.pointerEnter(second);
  fireEvent.pointerUp(window);
  assert.ok(first.classList.contains("wall"));
  assert.ok(second.classList.contains("wall"));
  fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
  assert.equal(first.classList.contains("wall"), false);
  assert.equal(second.classList.contains("wall"), false);
  first.focus();
  fireEvent.keyDown(first, { key: "ArrowRight", code: "ArrowRight" });
  assert.equal(document.activeElement, second);
  assert.equal(
    (screen.getByRole("slider", { name: "実行ステップ" }) as HTMLInputElement)
      .value,
    "0",
  );
});

test("dialogs retain keyboard focus and background tabs pause playback", async () => {
  render(<App />);
  const user = userEvent.setup({ document });
  fireEvent.click(screen.getByRole("button", { name: "表示設定" }));
  const close = within(screen.getByRole("dialog")).getByRole("button", {
    name: "閉じる",
  });
  assert.equal(document.activeElement, close);
  await user.keyboard("{Shift>}{Tab}{/Shift}");
  assert.equal(
    document.activeElement,
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "表示設定を初期値に戻す",
    }),
  );
  await user.keyboard("{Tab}");
  assert.equal(document.activeElement, close);
  fireEvent.click(close);
  fireEvent.click(screen.getByRole("button", { name: "再生" }));
  assert.ok(screen.getByRole("button", { name: "一時停止" }));
  Object.defineProperty(document, "hidden", {
    value: true,
    configurable: true,
  });
  fireEvent(document, new window.Event("visibilitychange"));
  assert.ok(screen.getByRole("button", { name: "再生" }));
  Object.defineProperty(document, "hidden", {
    value: false,
    configurable: true,
  });
});

test("problem decomposition and AND/OR graphs support editing, solutions and failure states", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: "問題の分解と探索" }));
  assert.equal(screen.queryByLabelText("探索する値"), null);
  const input = screen.getByLabelText(/分解して合計する値/);
  fireEvent.change(input, { target: { value: "-3, 5, 5, 0" } });
  fireEvent.click(screen.getByRole("button", { name: "適用" }));
  fireEvent.click(screen.getByRole("button", { name: "最後まで進む" }));
  assert.ok(
    within(
      screen.getByRole("region", { name: "アルゴリズムの可視化" }),
    ).getByText("部分問題を結合しました。総和は 7 です。"),
  );
  fireEvent.change(screen.getByLabelText("アルゴリズム"), {
    target: { value: "and-or" },
  });
  assert.ok(
    screen.getByRole("img", { name: "共有する終端を持つ AND/OR グラフ" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "最後まで進む" }));
  assert.ok(document.querySelectorAll(".search-edge.selected").length > 0);
  fireEvent.change(screen.getByLabelText(/終端の成否/), {
    target: { value: "0, 1, 0" },
  });
  fireEvent.click(screen.getByRole("button", { name: "適用" }));
  fireEvent.click(screen.getByRole("button", { name: "最後まで進む" }));
  assert.ok(
    within(
      screen.getByRole("region", { name: "アルゴリズムの可視化" }),
    ).getByText("根の問題を解決できる選択肢はありません。"),
  );
  assert.equal(document.querySelectorAll(".search-edge.selected").length, 0);
});

test("game search renders pruning, compares results and restores the saved experiment stopped", async () => {
  const view = render(<App />);
  fireEvent.click(screen.getByRole("tab", { name: "ゲーム探索" }));
  const input = screen.getByLabelText(/終端局面の評価値/);
  fireEvent.change(input, { target: { value: "5, 6, 3, 9" } });
  fireEvent.click(screen.getByRole("button", { name: "適用" }));
  fireEvent.change(screen.getByLabelText("アルゴリズム"), {
    target: { value: "alpha-beta" },
  });
  fireEvent.click(screen.getByRole("button", { name: "最後まで進む" }));
  assert.ok(
    within(
      screen.getByRole("region", { name: "アルゴリズムの可視化" }),
    ).getByText(/根の評価値は 5/),
  );
  assert.equal(document.querySelectorAll(".search-node.pruned").length, 1);
  assert.ok(
    within(
      screen.getByRole("region", { name: "アルゴリズムの可視化" }),
    ).getByText("≤3"),
  );
  assert.ok(screen.getByRole("columnheader", { name: "α" }));
  fireEvent.click(screen.getByRole("button", { name: "比較してみる" }));
  const dialog = within(screen.getByRole("dialog"));
  assert.equal(dialog.getAllByText(/評価値 5 \/ 最善手 1/).length, 2);
  assert.ok(dialog.getByText("全局面を走査（最善手の選択なし）"));
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
  assert.equal(
    (screen.getByLabelText(/終端局面の評価値/) as HTMLInputElement).value,
    "3, 5, 6, 9, 1, 2, 0, -1",
  );
  fireEvent.click(screen.getByRole("button", { name: "やり直す" }));
  await waitFor(() =>
    assert.ok(
      localStorage
        .getItem("tansaku-experiment-v1")
        ?.includes('"algorithmId":"alpha-beta"'),
    ),
  );
  view.unmount();
  render(<App />);
  assert.equal(
    (screen.getByLabelText("アルゴリズム") as HTMLSelectElement).value,
    "alpha-beta",
  );
  assert.equal(
    (screen.getByLabelText(/終端局面の評価値/) as HTMLInputElement).value,
    "5, 6, 3, 9",
  );
  assert.equal(
    (screen.getByRole("slider", { name: "実行ステップ" }) as HTMLInputElement)
      .value,
    "0",
  );
  assert.ok(screen.getByRole("button", { name: "再生" }));
  assert.ok(
    localStorage.getItem("tansaku-learning-v1")?.includes("alpha-beta"),
  );
});
