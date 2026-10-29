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
const { render, screen, fireEvent, cleanup, waitFor, within } =
  await import("@testing-library/react");
const { default: userEvent } = await import("@testing-library/user-event");
const { default: App } = await import("../src/App.tsx");
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanup();
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
