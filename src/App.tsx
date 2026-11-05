import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Download,
  Flag,
  GitBranch,
  Layers3,
  ListFilter,
  Menu,
  MousePointer2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Shuffle,
  SkipForward,
  Sparkles,
  StepBack,
  StepForward,
  Target,
  Timer,
  Workflow,
  X,
  Columns2,
  Copy,
  Gem,
  LayoutList,
  Maximize2,
  Minimize2,
  Moon,
  PanelLeftClose,
  Redo2,
  Settings2,
  Share2,
  Sun,
  Undo2,
  Upload,
} from "lucide-react";
import type { AlgorithmId, Category, Frame, MazeOptions } from "./algorithms";
import {
  algorithms,
  buildTree,
  COLS,
  defaultArray,
  defaultSort,
  defaultTree,
  GOAL,
  initialMaze,
  makeMaze,
  mazeFrames,
  parseValues,
  ROWS,
  searchFrames,
  sortFrames,
  START,
  treeFrames,
} from "./algorithms";
import { usePreferences } from "./usePreferences";
import { readStored, writeStored } from "./preferences";
import { Settings } from "./Settings";
import { LearningAdventure, LearningCard } from "./LearningAdventure";
import {
  emptyLearning,
  getStudyDay,
  LEARNING_KEY,
  mergeLearning,
  openDailyChest,
  recordStudy,
  sanitizeLearning,
} from "./learning";
import {
  categoryDefaults,
  decodeExperiment,
  defaultExperiment,
  encodeExperiment,
  EXPERIMENT_KEY,
  parseExperiment,
  validateExperiment,
} from "./experiment";
import type { Experiment } from "./experiment";
import { advancedFrames, buildSearchGraph, defaultGame, defaultProblem } from "./advancedSearch";
import type { AdvancedId } from "./advancedSearch";
import { formatNodeScore, formatScore, SearchGraphDiagram } from "./SearchGraphDiagram";

const categories: {
  id: Category;
  name: string;
  en: string;
  icon: typeof Search;
  description: string;
}[] = [
  {
    id: "array",
    name: "配列の探索",
    en: "ARRAY SEARCH",
    icon: Search,
    description: "並んだデータから、目的の値を探そう。",
  },
  {
    id: "maze",
    name: "迷路の探索",
    en: "PATHFINDING",
    icon: Workflow,
    description: "道を選び、行き止まりを越えて、ゴールへ。",
  },
  {
    id: "tree",
    name: "木の探索",
    en: "TREE SEARCH",
    icon: GitBranch,
    description: "枝をたどり、データの構造を見つけよう。",
  },
  {
    id: "sort",
    name: "整列アルゴリズム",
    en: "SORTING",
    icon: BarChart3,
    description: "ばらばらの値が、秩序に変わる瞬間。",
  },
  {
    id: "problem", name: "問題の分解と探索", en: "PROBLEM DECOMPOSITION", icon: Layers3,
    description: "部分問題に分けて、答えを組み合わせよう。",
  },
  {
    id: "game", name: "ゲーム探索", en: "GAME SEARCH", icon: GitBranch,
    description: "相手の最善の応手まで読んで、次の一手を選ぼう。",
  },
];
const presetSize = { array: 15, tree: 15, sort: 12, problem: 4, game: 8 };
type Modal = "help" | "compare" | "settings" | "learning" | "share" | null;

function App() {
  const { preferences, updatePreferences, resolvedTheme } = usePreferences();
  const [initial] = useState(() => {
    let warning = "";
    const shared = new URLSearchParams(window.location.hash.slice(1)).get(
      "lab",
    );
    if (shared)
      try {
        return { experiment: decodeExperiment(shared), warning: "" };
      } catch (error) {
        warning = (error as Error).message;
      }
    return {
      experiment: preferences.resume
        ? readStored(EXPERIMENT_KEY, defaultExperiment(), validateExperiment)
        : defaultExperiment(),
      warning,
    };
  });
  const [category, setCategory] = useState<Category>(
    initial.experiment.category,
  );
  const [algorithmId, setAlgorithmId] = useState<AlgorithmId>(
    initial.experiment.algorithmId,
  );
  const [selections, setSelections] = useState(initial.experiment.selections);
  const [data, setData] = useState(initial.experiment.data);
  const [grid, setGrid] = useState(initial.experiment.grid);
  const [heuristicWeight, setHeuristicWeight] = useState(
      initial.experiment.heuristicWeight,
    ),
    [maxDepth, setMaxDepth] = useState(initial.experiment.maxDepth);
  const mazeOptions = useMemo<MazeOptions>(
    () => ({ heuristicWeight, maxDepth: maxDepth || undefined }),
    [heuristicWeight, maxDepth],
  );
  const [start, setStart] = useState(initial.experiment.start),
    [goal, setGoal] = useState(initial.experiment.goal);
  const [target, setTarget] = useState(initial.experiment.target),
    [targetInput, setTargetInput] = useState(String(initial.experiment.target));
  const [raw, setRaw] = useState(
      initial.experiment.category === "maze"
        ? ""
        : initial.experiment.data[initial.experiment.category].join(", "),
    ),
    [error, setError] = useState("");
  const [step, setStep] = useState(0),
    [playing, setPlaying] = useState(false);
  const speed = preferences.speed;
  const [view, setView] = useState<"boxes" | "bars">("boxes");
  const [codeTab, setCodeTab] = useState<"code" | "about">("code");
  const [traceTab, setTraceTab] = useState<"table" | "chart">("table");
  const [modal, setModal] = useState<Modal>(null),
    [mobileMenu, setMobileMenu] = useState(false);
  const [paint, setPaint] = useState<
    "wall" | "erase" | "weight" | "start" | "goal"
  >("wall");
  const [toast, setToast] = useState(initial.warning);
  const [learning, setLearning] = useState(() =>
    readStored(
      LEARNING_KEY,
      {
        ...emptyLearning,
        days: {},
        legacyAlgorithms: readStored<AlgorithmId[]>(
          "tansaku-completed",
          [],
          (value) =>
            Array.isArray(value)
              ? value.filter((id): id is AlgorithmId =>
                  algorithms.some((a) => a.id === id),
                )
              : [],
        ),
      },
      sanitizeLearning,
    ),
  );
  const [today, setToday] = useState(getStudyDay);
  const [past, setPast] = useState<Experiment[]>([]),
    [future, setFuture] = useState<Experiment[]>([]);
  const [fullscreen, setFullscreen] = useState(false),
    [jumpInput, setJumpInput] = useState("");
  const [mazeFocus, setMazeFocus] = useState(initial.experiment.start);
  const fileInput = useRef<HTMLInputElement>(null);
  const modalContainer = useRef<HTMLElement>(null);
  const dragging = useRef(false),
    dragValue = useRef(1),
    currentTrace = useRef<HTMLTableRowElement>(null);
  const algorithm = algorithms.find((a) => a.id === algorithmId)!;
  const categoryInfo = categories.find((c) => c.id === category)!;
  const CategoryIcon = categoryInfo.icon;
  const values = category === "maze" ? grid : data[category];
  const isGraph = category === "problem" || category === "game";
  const graphNodes = useMemo(() => isGraph ? buildSearchGraph(algorithmId as AdvancedId, values) : [], [isGraph, algorithmId, values]);
  const frames = useMemo(
    () =>
      category === "maze"
        ? mazeFrames(algorithmId, grid, start, goal, ROWS, COLS, mazeOptions)
        : category === "tree"
          ? treeFrames(algorithmId, data.tree, target)
          : category === "sort"
            ? sortFrames(algorithmId, data.sort)
            : category === "problem" || category === "game"
              ? advancedFrames(algorithmId as AdvancedId, data[category])
              : searchFrames(algorithmId, data.array, target),
    [algorithmId, category, data, grid, start, goal, target, mazeOptions],
  );
  const safeStep = Math.min(step, frames.length - 1),
    frame = frames[safeStep];
  const ended = safeStep === frames.length - 1;
  const reset = useCallback(() => {
    setPlaying(false);
    setStep(0);
  }, []);
  const experiment = useMemo<Experiment>(
    () => ({
      version: 1,
      category,
      algorithmId,
      selections,
      data,
      grid,
      start,
      goal,
      target,
      heuristicWeight,
      maxDepth,
    }),
    [
      category,
      algorithmId,
      selections,
      data,
      grid,
      start,
      goal,
      target,
      heuristicWeight,
      maxDepth,
    ],
  );
  const shareUrl = useMemo(
    () =>
      `${window.location.origin}${window.location.pathname}${window.location.search}#lab=${encodeExperiment(experiment)}`,
    [experiment],
  );

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setStep((s) => Math.min(s + 1, frames.length - 1)),
      650 / speed,
    );
    return () => window.clearInterval(timer);
  }, [playing, speed, frames.length]);
  useEffect(() => {
    if (!ended || !playing) return;
    if (preferences.loop) {
      const timer = window.setTimeout(() => setStep(0), 800 / speed);
      return () => window.clearTimeout(timer);
    }
    setPlaying(false);
  }, [ended, playing, preferences.loop, speed]);
  useEffect(() => {
    if (ended && frame.result && frame.result !== "limited")
      setLearning((previous) =>
        recordStudy(
          mergeLearning(
            previous,
            readStored(LEARNING_KEY, previous, sanitizeLearning),
          ),
          algorithmId,
          getStudyDay(),
        ),
      );
  }, [ended, algorithmId, frame.result]);
  useEffect(() => {
    writeStored(LEARNING_KEY, learning);
  }, [learning]);
  useEffect(() => {
    const tick = () => setToday(getStudyDay());
    const timer = window.setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  useEffect(() => {
    if (!preferences.resume) return;
    const save = () => writeStored(EXPERIMENT_KEY, experiment);
    const timer = window.setTimeout(save, 200);
    window.addEventListener("pagehide", save);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [experiment, preferences.resume]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== LEARNING_KEY || !event.newValue) return;
      try {
        const incoming = sanitizeLearning(JSON.parse(event.newValue));
        setLearning((previous) => mergeLearning(previous, incoming));
      } catch {
        /* Ignore a malformed external save. */
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has("lab")) {
      params.delete("lab");
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${params.size ? "#" + params.toString() : ""}`,
      );
    }
  }, []);
  useEffect(() => {
    const pause = () => {
      if (document.hidden && preferences.pauseWhenHidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, [preferences.pauseWhenHidden]);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    if (!preferences.followTrace) return;
    const row = currentTrace.current,
      container = row?.closest(".trace-scroll");
    if (row && container) {
      const top = row.offsetTop;
      if (top < container.scrollTop + 35)
        container.scrollTop = Math.max(0, top - 35);
      else if (
        top + row.offsetHeight >
        container.scrollTop + container.clientHeight
      )
        container.scrollTop = top + row.offsetHeight - container.clientHeight;
    }
  }, [safeStep, preferences.followTrace, preferences.showTrace]);
  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("blur", stop);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!modal) return;
    setPlaying(false);
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalContainer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
      if (event.key !== "Tab") return;
      const controls = modalContainer.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input, select, [tabindex="0"]',
      );
      if (!controls?.length) return;
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal]);

  const togglePlay = useCallback(() => {
    if (ended) setStep(0);
    setPlaying((p) => !p);
  }, [ended]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const el = e.target as HTMLElement;
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) ||
        el.isContentEditable ||
        modal
      )
        return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
        return;
      }
      if (el.tagName === "BUTTON" && (e.code === "Space" || e.code === "Enter"))
        return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        setPlaying(false);
        setStep((s) => Math.min(s + (e.shiftKey ? 10 : 1), frames.length - 1));
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        setPlaying(false);
        setStep((s) => Math.max(s - (e.shiftKey ? 10 : 1), 0));
      }
      if (e.code === "Home") {
        e.preventDefault();
        reset();
      }
      if (e.code === "End") {
        e.preventDefault();
        seek(frames.length - 1);
      }
      if (e.key.toLowerCase() === "r") reset();
      if (e.key === "?") {
        e.preventDefault();
        setModal("help");
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [togglePlay, frames.length, reset, modal, past, future, experiment]);

  function remember() {
    setPast((previous) => [...previous.slice(-29), experiment]);
    setFuture([]);
  }
  function restore(next: Experiment, record = true) {
    if (record) remember();
    reset();
    setCategory(next.category);
    setAlgorithmId(next.algorithmId);
    setSelections(next.selections);
    setData(next.data);
    setGrid(next.grid);
    setStart(next.start);
    setGoal(next.goal);
    setTarget(next.target);
    setTargetInput(String(next.target));
    setHeuristicWeight(next.heuristicWeight);
    setMaxDepth(next.maxDepth);
    setRaw(next.category === "maze" ? "" : next.data[next.category].join(", "));
    setView(next.category === "sort" ? "bars" : "boxes");
    setError("");
  }
  function undo() {
    if (!past.length) return;
    setFuture((previous) => [experiment, ...previous].slice(0, 30));
    const next = past[past.length - 1];
    setPast(past.slice(0, -1));
    restore(next, false);
  }
  function redo() {
    if (!future.length) return;
    setPast((previous) => [...previous.slice(-29), experiment]);
    const next = future[0];
    setFuture(future.slice(1));
    restore(next, false);
  }
  function categoryKey(event: React.KeyboardEvent, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % categories.length;
    else if (event.key === "ArrowLeft")
      next = (index + categories.length - 1) % categories.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = categories.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    changeCategory(categories[next].id);
    (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
  }
  function mazeKey(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const row = Math.floor(index / COLS),
      col = index % COLS;
    let next = index;
    if (event.key === "ArrowRight" && col < COLS - 1) next++;
    else if (event.key === "ArrowLeft" && col > 0) next--;
    else if (event.key === "ArrowUp" && row > 0) next -= COLS;
    else if (event.key === "ArrowDown" && row < ROWS - 1) next += COLS;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      editCell(index, true);
      dragging.current = false;
      return;
    } else if (!event.key.startsWith("Arrow")) return;
    event.preventDefault();
    event.stopPropagation();
    setMazeFocus(next);
    (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
  }
  async function copyText(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast(success);
    } catch {
      setToast(
        "コピーできませんでした。共有リンク欄から手動でコピーできます。",
      );
    }
  }
  function exportExperiment() {
    downloadFile(
      JSON.stringify(experiment, null, 2),
      "tansaku-experiment.json",
      "application/json",
    );
    setToast("実験を JSON で保存しました。");
  }
  async function importExperiment(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 65536)
        throw new Error("実験ファイルは64 KB以下にしてください。");
      restore(parseExperiment(await file.text()));
      setToast("実験を読み込みました。");
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setToast("このブラウザーでは全画面表示を利用できません。");
    }
  }
  function applyPreset(preset: string) {
    if (!preset) return;
    remember();
    reset();
    setError("");
    if (category === "maze") {
      const next =
        preset === "empty" ? Array(ROWS * COLS).fill(0) : initialMaze();
      if (preset === "weighted")
        for (let c = 2; c < COLS - 2; c++)
          if (next[COLS + c] !== 1) next[COLS + c] = 5;
      setGrid(next);
      setStart(START);
      setGoal(GOAL);
      return;
    }
    let next =
      category === "array"
        ? [...defaultArray]
        : category === "tree"
          ? [...defaultTree]
          : category === "problem" ? [...defaultProblem]
            : category === "game" ? [...defaultGame] : [...defaultSort];
    if (preset === "reverse") next.sort((a, b) => b - a);
    if (preset === "duplicates") next = [8, 3, 8, 1, 3, 5, 8, 5];
    if (preset === "negative") next = [-12, 7, -3, 0, 15, -8, 4];
    if (preset === "skewed") next = Array.from({ length: 15 }, (_, i) => i + 1);
    if (category === "array" && algorithmId !== "linear")
      next.sort((a, b) => a - b);
    setData((previous) => ({ ...previous, [category]: next }));
    setRaw(next.join(", "));
  }

  function changeCategory(next: Category) {
    reset();
    setCategory(next);
    setAlgorithmId(selections[next] ?? categoryDefaults[next]);
    setError("");
    setMobileMenu(false);
    if (next !== "maze") setRaw(data[next].join(", "));
    setView(next === "sort" ? "bars" : "boxes");
  }
  function changeAlgorithm(id: AlgorithmId) {
    reset();
    setAlgorithmId(id);
    setSelections((previous) => ({ ...previous, [category]: id }));
    if (category === "array" && id !== "linear") {
      const sorted = [...data.array].sort((a, b) => a - b);
      if (sorted.some((v, i) => v !== data.array[i])) {
        setData((prev) => ({ ...prev, array: sorted }));
        setRaw(sorted.join(", "));
        setToast("この探索の前提に合わせて、配列を昇順に整列しました。");
      }
    }
  }
  function updateData() {
    try {
      let numbers = parseValues(raw, category === "tree" ? 31 : 32);
      if (category === "tree") numbers = [...new Set(numbers)];
      if (category === "array" && algorithmId !== "linear") {
        const sorted = [...numbers].sort((a, b) => a - b);
        if (numbers.some((v, i) => v !== sorted[i]))
          setToast("入力値を昇順に整列して適用しました。");
        numbers = sorted;
      }
      remember();
      if (category !== "maze")
        setData((prev) => ({ ...prev, [category]: numbers }));
      setRaw(numbers.join(", "));
      setError("");
      reset();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function updateTarget(next: string) {
    setTargetInput(next);
    if (
      next.trim() !== "" &&
      Number.isInteger(Number(next)) &&
      Math.abs(Number(next)) <= 999 &&
      Number(next) !== target
    ) {
      remember();
      setTarget(Number(next));
      reset();
    }
  }
  function randomize() {
    remember();
    reset();
    setError("");
    if (category === "maze") {
      setGrid(makeMaze());
      setStart(START);
      setGoal(GOAL);
      return;
    }
    let next = Array.from(
      { length: presetSize[category] },
      () => category === "problem" ? Math.round(Math.random())
        : category === "game" ? Math.floor(Math.random() * 21) - 10
          : Math.floor(Math.random() * 96) + 3,
    );
    if (category === "array" && algorithmId !== "linear")
      next.sort((a, b) => a - b);
    if (category === "tree") {
      const sorted = [...new Set(next)].sort((a, b) => a - b);
      next = [];
      const balance = (a: number[]) => {
        if (!a.length) return;
        const m = Math.floor(a.length / 2);
        next.push(a[m]);
        balance(a.slice(0, m));
        balance(a.slice(m + 1));
      };
      balance(sorted);
    }
    setData((prev) => ({ ...prev, [category]: next }));
    setRaw(next.join(", "));
    if (category === "array" || category === "tree") {
      const t = next[Math.floor(Math.random() * next.length)];
      setTarget(t);
      setTargetInput(String(t));
    }
  }
  function pickTarget(value: number) {
    if (value !== target) remember();
    setTarget(value);
    setTargetInput(String(value));
    reset();
  }
  function seek(value: number) {
    setPlaying(false);
    setStep(Math.max(0, Math.min(frames.length - 1, Math.round(value))));
  }
  function editCell(i: number, first = false) {
    if (!first && !dragging.current) return;
    if (paint === "start" || paint === "goal") {
      if (!first || i === (paint === "start" ? goal : start)) return;
      remember();
      reset();
      if (paint === "start") setStart(i);
      else setGoal(i);
      setGrid((prev) => prev.map((v, j) => (i === j ? 0 : v)));
      return;
    }
    if (i === start || i === goal) return;
    if (first) {
      remember();
      dragging.current = true;
      dragValue.current =
        paint === "erase" ? 0 : paint === "weight" ? 5 : grid[i] === 1 ? 0 : 1;
    }
    reset();
    setGrid((prev) =>
      prev[i] === dragValue.current
        ? prev
        : prev.map((v, j) => (i === j ? dragValue.current : v)),
    );
  }
  function downloadTrace() {
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
        "α", "β", "根の評価値・総和・成否", "枝刈りノード",
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
              : isGraph ? formatNodeScore(f, n) : f.array[n],
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
        f.value ?? "", f.pruned?.join(" / ") ?? "",
        f.comparisons,
        f.swaps,
        f.cost ?? "",
        f.message,
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
        )
        .join("\r\n");
    downloadFile(
      csv,
      `tansaku-${algorithmId}-trace.csv`,
      "text/csv;charset=utf-8;",
    );
    setToast("全ステップのトレースを CSV で書き出しました。");
  }

  return (
    <div
      className={`app-shell layout-${preferences.layout} density-${preferences.density} ${preferences.sidebarCollapsed ? "sidebar-collapsed" : ""} ${preferences.wide ? "wide" : ""}`}
      style={
        {
          "--visual-size": `${preferences.splitRatio}fr`,
          "--code-size": `${100 - preferences.splitRatio}fr`,
        } as React.CSSProperties
      }
    >
      <a href="#workspace-main" className="skip-link">
        メインコンテンツへ移動
      </a>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="実験ファイルを選択"
        onChange={importExperiment}
      />
      {mobileMenu && (
        <div className="sidebar-scrim" onClick={() => setMobileMenu(false)} />
      )}
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            changeCategory("array");
          }}
          aria-label="探索ラボ ホーム"
        >
          <span className="brand-mark">
            <Search size={23} />
          </span>
          <div>
            探索ラボ<span>TANSAKU LAB</span>
          </div>
          <span className="version">β</span>
        </a>
        <div className="sidebar-label">ワークスペース</div>
        <nav aria-label="実験室の選択">
          {categories.map((c) => (
            <button
              key={c.id}
              title={c.name}
              aria-label={c.name}
              className={`nav-item ${category === c.id ? "selected" : ""}`}
              onClick={() => changeCategory(c.id)}
              aria-current={category === c.id ? "page" : undefined}
            >
              <c.icon size={18} />
              <span>{c.name}</span>
              <span className="nav-count">
                {String(
                  algorithms.filter((a) => a.category === c.id).length,
                ).padStart(2, "0")}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-separator" />
        <div className="sidebar-label">学習ツール</div>
        <button className="nav-item" onClick={() => setModal("compare")}>
          <Layers3 size={18} />
          <span>アルゴリズム比較</span>
          <ArrowUpRight size={14} />
        </button>
        <button className="nav-item" onClick={() => setModal("help")}>
          <BookOpen size={18} />
          <span>使い方ガイド</span>
        </button>
        <LearningCard
          state={learning}
          today={today}
          onOpen={() => setModal("learning")}
        />
        <button
          className="nav-item"
          onClick={() => setModal("learning")}
          aria-label="学習の冒険"
        >
          <Gem size={18} />
          <span>学習の冒険</span>
        </button>
        <button
          className="nav-item"
          onClick={() => setModal("settings")}
          aria-label="表示・操作の設定"
        >
          <Settings2 size={18} />
          <span>表示・操作の設定</span>
        </button>
        <div className="sidebar-bottom">
          <span className="online-dot" />
          ブラウザで、すべて完結。
          <button onClick={() => setModal("help")} aria-label="ヘルプ">
            <CircleHelp size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileMenu((v) => !v)}
              aria-label="メニューを開く"
            >
              <Menu size={20} />
            </button>
            <button
              className="desktop-collapse icon-button"
              onClick={() =>
                updatePreferences({
                  sidebarCollapsed: !preferences.sidebarCollapsed,
                })
              }
              aria-label={
                preferences.sidebarCollapsed
                  ? "サイドバーを展開"
                  : "サイドバーを折りたたむ"
              }
            >
              <PanelLeftClose size={18} />
            </button>
            <span>ワークスペース</span>
            <ChevronRight size={13} />
            <strong>{categoryInfo.name}</strong>
          </div>
          <div className="topbar-right">
            <div className="font-quick">
              <button
                aria-label="文字サイズを縮小"
                disabled={preferences.fontSize <= 80}
                onClick={() =>
                  updatePreferences({ fontSize: preferences.fontSize - 5 })
                }
              >
                A−
              </button>
              <span>{preferences.fontSize}%</span>
              <button
                aria-label="文字サイズを拡大"
                disabled={preferences.fontSize >= 160}
                onClick={() =>
                  updatePreferences({ fontSize: preferences.fontSize + 5 })
                }
              >
                A＋
              </button>
            </div>
            <button
              className="icon-button"
              aria-label={
                resolvedTheme === "dark"
                  ? "ライトテーマに切り替え"
                  : "ダークテーマに切り替え"
              }
              onClick={() =>
                updatePreferences({
                  theme: resolvedTheme === "dark" ? "light" : "dark",
                })
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
            <button
              className="settings-button secondary-button"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={16} />
              表示設定
            </button>
          </div>
        </header>
        <main id="workspace-main" tabIndex={-1}>
          <section className="intro">
            <div>
              <div className="eyebrow">
                <span />
                LEARN BY EXPLORING
              </div>
              <h1>
                {category === "sort"
                  ? "整列を、"
                  : category === "tree"
                    ? "構造を、"
                    : category === "game" ? "次の一手を、"
                    : category === "problem" ? "問題の分解を、"
                    : category === "maze"
                      ? "道すじを、"
                      : "探索を、"}
                <span>ひと目で。</span>
              </h1>
              <p>アルゴリズムの「なぜ？」を、動かして理解しよう。</p>
            </div>
            <div className="intro-note">
              <span className="note-icon">
                <MousePointer2 size={19} />
              </span>
              <div>
                <strong>見て、触れて、理解する。</strong>
                <p>
                  {category === "maze"
                    ? "マスをなぞって、自分だけの迷路を。"
                    : isGraph ? "終端の値を変えて、答えを比べてみよう。"
                    : "データも目標も、自由に変えてみよう。"}
                </p>
              </div>
              <span className="note-spark">✳</span>
            </div>
          </section>
          <div className="category-tabs" role="tablist" aria-label="カテゴリー">
            {categories.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={category === c.id}
                tabIndex={category === c.id ? 0 : -1}
                onKeyDown={(event) => categoryKey(event, categories.indexOf(c))}
                className={category === c.id ? "active" : ""}
                onClick={() => changeCategory(c.id)}
              >
                <c.icon size={17} />
                {c.name}
                {category === c.id && <span className="tab-dot" />}
              </button>
            ))}
          </div>
          <div className="workspace-toolbar" aria-label="ワークスペースの操作">
            <div className="toolbar-layout">
              <span>レイアウト</span>
              {(
                [
                  { id: "split", label: "横並び", icon: Columns2 },
                  { id: "stacked", label: "縦並び", icon: LayoutList },
                  { id: "focus", label: "集中", icon: Maximize2 },
                ] as const
              ).map((layout) => (
                <button
                  key={layout.id}
                  aria-label={layout.label + "レイアウト"}
                  aria-pressed={preferences.layout === layout.id}
                  className={preferences.layout === layout.id ? "selected" : ""}
                  onClick={() => updatePreferences({ layout: layout.id })}
                >
                  <layout.icon size={16} />
                  <span>{layout.label}</span>
                </button>
              ))}
            </div>
            <div className="toolbar-actions">
              <button
                className="icon-button"
                onClick={undo}
                disabled={!past.length}
                aria-label="元に戻す"
                title="元に戻す (Ctrl+Z)"
              >
                <Undo2 size={17} />
              </button>
              <button
                className="icon-button"
                onClick={redo}
                disabled={!future.length}
                aria-label="やり直す"
                title="やり直す (Ctrl+Shift+Z)"
              >
                <Redo2 size={17} />
              </button>
              <select
                aria-label="サンプルを読み込む"
                value=""
                onChange={(e) => applyPreset(e.target.value)}
              >
                <option value="">サンプル</option>
                <option value="default">初期データ</option>
                {category === "maze" ? (
                  <>
                    <option value="empty">壁なし</option>
                    <option value="weighted">重み付き</option>
                  </>
                ) : (
                  <>
                    <option value="reverse">逆順</option>
                    <option value="duplicates">重複あり</option>
                    <option value="negative">負の数</option>
                    {category === "tree" && (
                      <option value="skewed">偏った木</option>
                    )}
                  </>
                )}
              </select>
              <button
                className="icon-button"
                onClick={() => fileInput.current?.click()}
                aria-label="実験を読み込む"
                title="JSONを読み込む"
              >
                <Upload size={17} />
              </button>
              <button
                className="icon-button"
                onClick={exportExperiment}
                aria-label="実験を保存"
                title="JSONで保存"
              >
                <Download size={17} />
              </button>
              <button
                className="icon-button"
                onClick={() => setModal("share")}
                aria-label="実験を共有"
                title="実験の共有リンク"
              >
                <Share2 size={17} />
              </button>
              <button
                className="icon-button"
                onClick={toggleFullscreen}
                disabled={!document.documentElement.requestFullscreen}
                aria-label={fullscreen ? "全画面表示を終了" : "全画面表示"}
              >
                {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
            </div>
          </div>

          <section
            className="setup-card card"
            aria-label="アルゴリズムとデータの設定"
          >
            <div className="setup-top">
              <div className="algorithm-select-wrap">
                <div className="algorithm-icon">
                  <CategoryIcon size={22} />
                </div>
                <div>
                  <label htmlFor="algorithm">アルゴリズム</label>
                  <div className="algorithm-select">
                    <select
                      id="algorithm"
                      value={algorithmId}
                      onChange={(e) =>
                        changeAlgorithm(e.target.value as AlgorithmId)
                      }
                    >
                      {algorithms
                        .filter((a) => a.category === category)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </div>
                <span className="english-name">{algorithm.en}</span>
              </div>
              <div className="complexity">
                <span>
                  <Clock3 size={13} />
                  最悪時間 <b>{algorithm.time}</b>
                </span>
                <span>
                  <Layers3 size={13} />
                  空間 <b>{algorithm.space}</b>
                </span>
              </div>
            </div>
            <div className="setup-description">
              <p>{algorithm.description}</p>
              <span>
                <CheckCircle2 size={13} />
                {algorithm.condition}
              </span>
            </div>
            {category !== "maze" ? (
              <div className="data-controls">
                <div className="data-input">
                  <label htmlFor="array-input">
                    {category === "tree"
                      ? "挿入する値（入力順）"
                      : category === "game" ? "終端局面の評価値（左から）"
                        : category === "problem" ? algorithmId === "and-or" ? "終端の成否（0 は失敗、0 以外は成功）" : "分解して合計する値"
                          : "配列のデータ"}
                    <span>最大 {category === "tree" ? "31" : "32"} 個</span>
                  </label>
                  <div className="input-action">
                    <input
                      id="array-input"
                      value={raw}
                      onChange={(e) => setRaw(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateData();
                      }}
                      aria-invalid={!!error}
                      aria-describedby={error ? "data-error" : undefined}
                    />
                    <button onClick={updateData}>
                      適用
                      <Check size={13} />
                    </button>
                  </div>
                </div>
                {(category === "array" || category === "tree") && (
                  <div className="target-input">
                    <label htmlFor="target-input">
                      <Target size={13} />
                      探索する値
                    </label>
                    <input
                      id="target-input"
                      type="number"
                      min="-999"
                      max="999"
                      step="1"
                      value={targetInput}
                      onChange={(e) => updateTarget(e.target.value)}
                      onBlur={() => setTargetInput(String(target))}
                    />
                  </div>
                )}
                <button
                  className="secondary-button randomize"
                  onClick={randomize}
                >
                  <Shuffle size={15} />
                  ランダム生成
                </button>
              </div>
            ) : (
              <div className="maze-tools">
                <div className="paint-buttons" aria-label="迷路の編集ツール">
                  {(
                    [
                      { id: "wall", name: "壁を描く", icon: Plus },
                      { id: "erase", name: "消しゴム", icon: X },
                      { id: "weight", name: "重み 5", icon: Layers3 },
                      { id: "start", name: "スタート", icon: Play },
                      { id: "goal", name: "ゴール", icon: Flag },
                    ] as const
                  ).map((tool) => (
                    <button
                      className={paint === tool.id ? "selected" : ""}
                      aria-pressed={paint === tool.id}
                      key={tool.id}
                      onClick={() => setPaint(tool.id)}
                    >
                      <tool.icon size={13} />
                      {tool.name}
                    </button>
                  ))}
                </div>
                <button
                  className="secondary-button"
                  onClick={() => {
                    remember();
                    reset();
                    setGrid(Array(ROWS * COLS).fill(0));
                    setStart(START);
                    setGoal(GOAL);
                  }}
                >
                  壁をクリア
                </button>
                <button className="secondary-button" onClick={randomize}>
                  <Shuffle size={14} />
                  迷路を生成
                </button>
              </div>
            )}
            {category === "maze" && (
              <MazeSettings
                algorithmId={algorithmId}
                heuristicWeight={heuristicWeight}
                maxDepth={maxDepth}
                onWeight={(n) => {
                  remember();
                  reset();
                  setHeuristicWeight(n);
                }}
                onDepth={(n) => {
                  remember();
                  reset();
                  setMaxDepth(n);
                }}
              />
            )}
            {error && (
              <p className="input-error" id="data-error" role="alert">
                {error}
              </p>
            )}
          </section>

          <div
            className={`workspace-grid ${!preferences.showCode || preferences.layout === "focus" ? "no-code" : ""} ${preferences.codePosition === "left" ? "code-left" : ""}`}
          >
            <section
              className="visualizer-card card"
              aria-label="アルゴリズムの可視化"
            >
              <div className="panel-heading">
                <div className="panel-title">
                  <span className="tiny-icon">
                    <CategoryIcon size={16} />
                  </span>
                  <h2>{categoryInfo.name}</h2>
                  <span className="muted">
                    {category === "maze"
                      ? `${COLS} × ${ROWS}`
                      : isGraph ? `${graphNodes.length} ノード`
                        : `${category === "tree" ? buildTree(values).length : values.length} ${category === "tree" ? "ノード" : "要素"}`}
                  </span>
                </div>
                {category === "array" || category === "sort" ? (
                  <div className="segmented">
                    <button
                      className={view === "boxes" ? "selected" : ""}
                      onClick={() => setView("boxes")}
                      aria-label="ボックス表示"
                      title="ボックス表示"
                    >
                      <Braces size={15} />
                    </button>
                    <button
                      className={view === "bars" ? "selected" : ""}
                      onClick={() => setView("bars")}
                      aria-label="棒グラフ表示"
                      title="棒グラフ表示"
                    >
                      <BarChart3 size={15} />
                    </button>
                  </div>
                ) : (
                  <span className="canvas-hint">
                    {category === "maze"
                      ? "クリック・ドラッグで編集"
                      : isGraph ? "終端の値は上の入力欄で編集"
                        : "ノードをクリックして目標に設定"}
                  </span>
                )}
              </div>
              <div className="legend">
                <span>
                  <i className="legend-range" />
                  {category === "maze"
                    ? "探索待ち"
                    : category === "tree" || isGraph
                      ? "未訪問"
                      : "探索範囲"}
                </span>
                <span>
                  <i className="legend-current" />
                  {category === "sort" ? "比較中" : "現在の位置"}
                </span>
                <span>
                  <i className="legend-visited" />
                  {category === "sort" ? "未確定" : "確認済み"}
                </span>
                <span>
                  <i className="legend-found" />
                  {category === "maze"
                    ? "経路"
                    : category === "sort"
                      ? "整列完了"
                      : isGraph ? "解・主変化" : "発見"}
                </span>
              </div>
              {category === "maze" && (
                <MazeEvaluation
                  algorithmId={algorithmId}
                  frame={frame}
                  heuristicWeight={heuristicWeight}
                />
              )}
              {category === "maze" ? (
                <div className="maze-wrap">
                  <div
                    className="maze-grid"
                    style={{ gridTemplateColumns: `repeat(${COLS},1fr)` }}
                    onPointerLeave={() => {
                      dragging.current = false;
                    }}
                  >
                    {grid.map((cell, i) => (
                      <button
                        key={i}
                        className={`maze-cell ${cell === 1 ? "wall" : cell === 5 ? "weighted" : ""} ${frame.visited.includes(i) ? "visited" : ""} ${frame.frontier?.includes(i) ? "frontier" : ""} ${frame.trail?.includes(i) ? "trail" : ""} ${frame.path?.includes(i) ? "path" : ""} ${frame.active.includes(i) ? "current" : ""} ${i === start ? "start" : ""} ${i === goal ? "goal" : ""}`}
                        aria-label={`マス ${Math.floor(i / COLS)}, ${i % COLS}：${i === start ? "スタート" : i === goal ? "ゴール" : cell === 1 ? "壁" : cell === 5 ? "重み5" : "通路"}`}
                        tabIndex={i === mazeFocus ? 0 : -1}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setMazeFocus(i);
                          e.currentTarget.focus();
                          editCell(i, true);
                        }}
                        onPointerEnter={() => editCell(i)}
                        onKeyDown={(e) => mazeKey(e, i)}
                      >
                        {i === start ? (
                          <Play size={12} fill="currentColor" />
                        ) : i === goal ? (
                          <Flag size={13} />
                        ) : cell === 5 ? (
                          "5"
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : isGraph ? (
                <SearchGraphDiagram id={algorithmId as AdvancedId} values={values} frame={frame} />
              ) : category === "tree" ? (
                <TreeDiagram
                  values={values}
                  frame={frame}
                  onPick={pickTarget}
                />
              ) : (
                <ArrayDiagram
                  frame={frame}
                  target={target}
                  view={view}
                  category={category}
                  onPick={pickTarget}
                />
              )}
              <div
                className={`explanation ${frame.result ? "result-" + frame.result : ""}`}
                aria-live="polite"
              >
                <span className="explanation-icon">
                  {frame.result === "found" || frame.result === "complete" ? (
                    <CheckCircle2 size={18} />
                  ) : frame.result === "missing" ||
                    frame.result === "limited" ? (
                    <CircleHelp size={18} />
                  ) : (
                    <MousePointer2 size={18} />
                  )}
                </span>
                <div>
                  <strong>
                    {frame.result === "found"
                      ? "見つかりました！"
                      : frame.result === "complete"
                        ? category === "sort" ? "整列が完了しました" : "探索が完了しました"
                        : frame.result === "missing"
                          ? "探索が終了しました"
                          : frame.result === "limited"
                            ? "探索の上限に達しました"
                            : safeStep === 0
                              ? "準備完了"
                              : `STEP ${String(safeStep).padStart(2, "0")} — ${category === "maze" ? "マスを訪問" : isGraph ? "ノードの探索・評価" : category === "sort" ? "比較・交換" : "値を比較"}`}
                  </strong>
                  <p>{frame.message}</p>
                </div>
              </div>
              <div className="playback">
                <div className="playback-top">
                  <div className="transport">
                    <button
                      className="icon-button"
                      onClick={reset}
                      title="リセット (R)"
                      aria-label="リセット"
                    >
                      <RotateCcw size={17} />
                    </button>
                    <span className="control-divider" />
                    <button
                      className="icon-button"
                      disabled={safeStep === 0}
                      onClick={() => seek(Math.max(0, safeStep - 1))}
                      aria-label="1ステップ戻る"
                      title="1ステップ戻る (←)"
                    >
                      <StepBack size={19} />
                    </button>
                    <button
                      className="play-button"
                      onClick={togglePlay}
                      aria-label={playing ? "一時停止" : "再生"}
                    >
                      {playing ? (
                        <Pause size={15} fill="currentColor" />
                      ) : (
                        <Play size={15} fill="currentColor" />
                      )}
                      {playing ? "一時停止" : ended ? "もう一度" : "再生"}
                    </button>
                    <button
                      className="icon-button"
                      disabled={ended}
                      onClick={() =>
                        seek(Math.min(frames.length - 1, safeStep + 1))
                      }
                      aria-label="1ステップ進む"
                      title="1ステップ進む (→)"
                    >
                      <StepForward size={19} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={ended}
                      onClick={() => seek(frames.length - 1)}
                      aria-label="最後まで進む"
                      title="最後まで進む"
                    >
                      <SkipForward size={17} />
                    </button>
                  </div>
                  <div className="speed-control">
                    <Timer size={14} />
                    <label htmlFor="speed">再生速度</label>
                    <select
                      id="speed"
                      value={speed}
                      onChange={(e) =>
                        updatePreferences({ speed: Number(e.target.value) })
                      }
                    >
                      <option value="0.25">0.25×</option>
                      <option value="0.5">0.5×</option>
                      <option value="1">1×</option>
                      <option value="2">2×</option>
                      <option value="4">4×</option>
                      <option value="8">8×</option>
                      <option value="16">16×</option>
                    </select>
                  </div>
                </div>
                <div className="timeline">
                  <input
                    type="range"
                    aria-label="実行ステップ"
                    min="0"
                    max={frames.length - 1}
                    value={safeStep}
                    onChange={(e) => seek(Number(e.target.value))}
                    style={
                      {
                        "--progress": `${(safeStep / (frames.length - 1)) * 100}%`,
                      } as React.CSSProperties
                    }
                  />
                  <span>
                    <b>{String(safeStep).padStart(2, "0")}</b> /{" "}
                    {String(frames.length - 1).padStart(2, "0")} ステップ
                  </span>
                </div>
              </div>
            </section>
            <section
              className="code-card card"
              hidden={!preferences.showCode || preferences.layout === "focus"}
            >
              <div className="code-tabs">
                <button
                  className={codeTab === "code" ? "active" : ""}
                  onClick={() => setCodeTab("code")}
                >
                  <Code2 size={16} />
                  擬似コード
                </button>
                <button
                  className={codeTab === "about" ? "active" : ""}
                  onClick={() => setCodeTab("about")}
                >
                  <BookOpen size={15} />
                  仕組み
                </button>
                <span>Python</span>
              </div>
              {codeTab === "code" ? (
                <div className="code-content">
                  <div className="code-filename">
                    <i /> {algorithmId.replaceAll("-", "_")}_search.py{" "}
                    <span>学習用</span>
                    <button
                      className="icon-button"
                      aria-label="擬似コードをコピー"
                      onClick={() =>
                        copyText(
                          algorithm.code.join("\n"),
                          "擬似コードをコピーしました。",
                        )
                      }
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <div className="code-lines">
                    {algorithm.code.map((line, i) => (
                      <div
                        key={i}
                        className={`code-line ${frame.line === i ? "highlighted" : ""}`}
                      >
                        <span className="line-indicator">
                          {frame.line === i ? "›" : ""}
                        </span>
                        <span className="line-number">{i + 1}</span>
                        <code>{colorCode(line)}</code>
                      </div>
                    ))}
                  </div>
                  <div className="code-footnote">
                    <span className="code-dot" />
                    現在のステップに対応する行を表示
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
              <div className="code-tip">
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
                        : category === "game" ? "同じ終端評価でミニマックス法とアルファベータ法を比べ、答えと訪問数を確認しましょう。"
                          : category === "problem" ? "SUM は左右の答えを結合します。AND/OR では、両方が必要な問題と選べる問題の違いを観察しましょう。"
                            : "ほぼ整列された配列では、どの方法が有利でしょう？ データを変えて比較してみましょう。"}
                </p>
              </div>
            </section>
          </div>

          <div className="stats-row" hidden={!preferences.showStats}>
            <Stat
              icon={category === "maze" ? Workflow : Search}
              label={category === "maze" ? "累積訪問回数" : isGraph ? "訪問ノード数" : "比較回数"}
              value={frame.comparisons}
              unit="回"
              detail={
                category === "maze"
                  ? "再訪問も1回として計算"
                  : isGraph ? "共有ノードの答えの再利用は除く" : "値を確認した回数"
              }
            />
            <Stat
              icon={category === "sort" ? Shuffle : Target}
              label={
                isGraph ? category === "game" ? "根の評価値" : algorithmId === "and-or" ? "根の成否" : "総和"
                : category === "sort"
                  ? "交換回数"
                  : category === "maze"
                    ? "経路の長さ"
                    : "探索する値"
              }
              value={
                isGraph ? algorithmId === "and-or" && frame.value !== undefined ? frame.value ? "成功" : "失敗" : formatScore(frame.value)
                : category === "sort"
                  ? frame.swaps
                  : category === "maze"
                    ? frame.path
                      ? frame.path.length - 1
                      : "—"
                    : target
              }
              unit={
                category === "sort" ? "回" : category === "maze" ? "歩" : ""
              }
              detail={
                isGraph ? "最終結果まで進むと表示"
                : category === "maze"
                  ? frame.cost !== undefined
                    ? `移動コスト：${frame.cost}`
                    : "ゴール到達時に表示"
                  : category === "sort"
                    ? "要素を入れ替えた回数"
                    : "目標のデータ"
              }
            />
            <Stat
              icon={Layers3}
              label={
                isGraph ? algorithmId === "alpha-beta" ? "枝刈りノード数" : "ノード数"
                : category === "maze"
                  ? algorithmId === "iddfs"
                    ? "深さ / 上限"
                    : "探索待ち"
                  : category === "tree"
                    ? "木の高さ"
                    : category === "sort"
                      ? "要素数"
                      : "残りの探索範囲"
              }
              value={
                isGraph ? algorithmId === "alpha-beta" ? frame.pruned?.length ?? 0 : graphNodes.length
                : category === "maze"
                  ? algorithmId === "iddfs"
                    ? `${frame.depth ?? "—"} / ${frame.depthLimit ?? 0}`
                    : (frame.frontier?.length ?? 0)
                  : category === "tree"
                    ? Math.max(0, ...buildTree(values).map((n) => n.depth)) + 1
                    : category === "sort"
                      ? values.length
                      : frame.result === "missing"
                        ? 0
                        : frame.result === "found"
                          ? 1
                          : frame.left !== undefined &&
                              frame.right !== undefined
                            ? frame.right - frame.left + 1
                            : Math.max(0, values.length - frame.visited.length)
              }
              unit={
                category === "maze"
                  ? algorithmId === "iddfs"
                    ? ""
                    : "マス"
                  : category === "tree"
                    ? "段"
                    : "個"
              }
              detail={
                isGraph ? algorithmId === "alpha-beta" ? "子孫も含む未訪問の局面" : "内部ノードと終端ノードの合計"
                : category === "tree"
                  ? "根を1段目として計算"
                  : category === "sort"
                    ? "昇順に並べ替え"
                    : "ステップごとに変化"
              }
            />
            <Stat
              icon={CheckCircle2}
              label="実行ステータス"
              value={
                frame.result === "found"
                  ? "発見"
                  : frame.result === "complete"
                    ? "完了"
                    : frame.result === "missing"
                      ? "未発見"
                      : frame.result === "limited"
                        ? "上限到達"
                        : playing
                          ? "実行中"
                          : safeStep
                            ? "一時停止"
                            : "待機中"
              }
              status
              detail={
                frame.result
                  ? "別のデータでも試してみよう"
                  : playing
                    ? "アルゴリズムを実行しています"
                    : "自分のペースで進めましょう"
              }
            />
          </div>

          <div className="trace-navigation" hidden={!preferences.showTrace}>
            <label htmlFor="jump-step">ステップへ移動</label>
            <input
              id="jump-step"
              type="number"
              min={0}
              max={frames.length - 1}
              placeholder={String(safeStep)}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && jumpInput.trim()) {
                  seek(Number(jumpInput));
                  setJumpInput("");
                }
              }}
            />
            <button
              className="secondary-button"
              disabled={!jumpInput.trim()}
              onClick={() => {
                seek(Number(jumpInput));
                setJumpInput("");
              }}
            >
              移動
              <ArrowRight size={13} />
            </button>
            {algorithmId === "iddfs" && (
              <button
                className="secondary-button"
                disabled={ended}
                onClick={() => {
                  const next = frames.findIndex(
                    (f, i) =>
                      i > safeStep &&
                      f.line === 0 &&
                      f.depthLimit! > (frame.depthLimit ?? 0),
                  );
                  seek(next < 0 ? frames.length - 1 : next);
                }}
              >
                次の深さへ
                <StepForward size={14} />
              </button>
            )}
            <span>Shift＋← / → で10ステップ移動</span>
          </div>
          <section className="trace-card card" hidden={!preferences.showTrace}>
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
                <button
                  className="secondary-button export-button"
                  onClick={downloadTrace}
                >
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
                      <th>
                        {category === "maze" ? "現在のマス" : "現在の位置"}
                      </th>
                      <th>{category === "maze" ? "コスト" : "値"}</th>
                      {category === "array" && (
                        <>
                          <th>left</th>
                          <th>mid / i</th>
                          <th>right</th>
                        </>
                      )}
                      <th>{category === "maze" ? "累積訪問数" : isGraph ? "訪問ノード数" : "比較数"}</th>
                      {isGraph && <><th>根の結果</th><th>α</th><th>β</th><th>枝刈り数</th></>}
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
                    {frames
                      .slice(Math.max(0, safeStep - 199), safeStep + 1)
                      .map((f, offset) => {
                        const i = Math.max(0, safeStep - 199) + offset;
                        return (
                          <tr
                            key={i}
                            ref={i === safeStep ? currentTrace : undefined}
                            className={`${i === safeStep ? "current-row" : ""} ${f.result === "found" || f.result === "complete" ? "success-row" : ""}`}
                            onClick={() => seek(i)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") seek(i);
                            }}
                            aria-label={`ステップ ${i} に移動`}
                          >
                            <td>
                              <span className="step-cell">
                                {i === safeStep ? (
                                  <ArrowRight size={12} />
                                ) : (
                                  <span />
                                )}
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
                                  ? f.active.map((n) => isGraph ? formatNodeScore(f, n) : f.array[n]).join(", ")
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
                            {isGraph && <><td>{formatScore(f.value)}</td><td>{formatScore(f.alpha)}</td><td>{formatScore(f.beta)}</td><td>{f.pruned?.length ?? 0}</td></>}
                            {category === "maze" && (
                              <>
                                <td>
                                  {f.depth !== undefined
                                    ? `${f.depth} / ${f.depthLimit}`
                                    : "—"}
                                </td>
                                <td>{f.g ?? "—"}</td>
                                <td>{f.h ?? "—"}</td>
                                <td>{f.f ?? "—"}</td>
                              </>
                            )}
                            <td className="trace-message">
                              {i === 0 ? "初期状態" : f.message}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <TraceChart
                frames={frames.slice(0, safeStep + 1)}
                category={category}
                onSeek={seek}
              />
            )}
            <div className="trace-footer">
              <span>
                <i />
                現在までの直近200ステップを表示
              </span>
              <span>
                {safeStep + 1} 行 <span className="footer-divider">|</span>{" "}
                行をクリックして、その時点へ
              </span>
            </div>
          </section>
          <div className="bottom-note">
            <span>
              <Sparkles size={14} />
              試してみよう
            </span>
            <p>
              {category === "array"
                ? "存在しない値や配列の端の値を探すと、どんな違いがあるだろう？"
                : category === "maze"
                  ? "壁や重いマスを置くと、最短の「距離」と最小の「コスト」は同じになるだろう？"
                  : category === "tree"
                    ? "同じ値でも、挿入する順番を変えると木の形はどう変わるだろう？"
                    : category === "game" ? "終端の並びを逆順にすると、評価値やアルファベータ法の訪問数はどう変わるだろう？"
                      : category === "problem" ? "AND の子に失敗がある場合と、OR の子に成功がある場合で、探索はいつ止まるだろう？"
                        : "整列済みのデータと逆順のデータ。比較回数はどう変わるだろう？"}
            </p>
            <button onClick={() => setModal("compare")}>
              比較してみる
              <ArrowUpRight size={14} />
            </button>
          </div>
          <footer className="page-footer">
            <span>
              <Search size={13} />
              探索ラボ <span>—</span> アルゴリズムを、見て理解する。
            </span>
            <span>
              つくって、試して、学ぼう。<span className="footer-flower">✳</span>
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <section
            ref={modalContainer}
            className={`modal modal-${modal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              onClick={() => setModal(null)}
              aria-label="閉じる"
            >
              <X size={20} />
            </button>
            {modal === "settings" ? (
              <Settings value={preferences} onChange={updatePreferences} />
            ) : modal === "learning" ? (
              <LearningAdventure
                state={learning}
                today={today}
                onClaim={() => {
                  setLearning((previous) =>
                    openDailyChest(
                      mergeLearning(
                        previous,
                        readStored(LEARNING_KEY, previous, sanitizeLearning),
                      ),
                      today,
                    ),
                  );
                  setToast("宝物と 50 XP を獲得しました！");
                }}
              />
            ) : modal === "share" ? (
              <>
                <span className="modal-eyebrow">
                  <Share2 size={16} />
                  SHARE YOUR EXPERIMENT
                </span>
                <h2 id="modal-title">同じ実験を、一緒に。</h2>
                <p className="modal-description">
                  データ・迷路・目標値・アルゴリズムの設定をリンクで共有できます。表示設定や学習記録は含みません。
                </p>
                <label className="share-label" htmlFor="share-link">
                  共有リンク
                </label>
                <input
                  id="share-link"
                  className="share-input"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  className="play-button share-copy"
                  onClick={() =>
                    copyText(shareUrl, "共有リンクをコピーしました。")
                  }
                >
                  <Copy size={15} />
                  リンクをコピー
                </button>
                <p className="setting-note">
                  リンクの内容は開いた人のブラウザーで読み込まれます。実験ファイルとして保存・読み込みすることもできます。
                </p>
              </>
            ) : modal === "help" ? (
              <Guide />
            ) : (
              <Comparison
                category={category}
                data={data}
                grid={grid}
                start={start}
                goal={goal}
                target={target}
                mazeOptions={mazeOptions}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function downloadFile(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function colorCode(line: string) {
  return line
    .split(
      /(\b(?:def|for|in|if|elif|else|while|return|and|or|not|is|None|True|False|break)\b|\b\d+\b|\btarget\b)/g,
    )
    .map((part, i) => (
      <span
        key={i}
        className={
          /^(def|for|in|if|elif|else|while|return|and|or|not|is|None|True|False|break)$/.test(
            part,
          )
            ? "syntax-keyword"
            : /^\d+$/.test(part)
              ? "syntax-number"
              : part === "target"
                ? "syntax-target"
                : ""
        }
      >
        {part}
      </span>
    ));
}

function MazeSettings({
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
  if (algorithmId === "iddfs")
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
  if (algorithmId === "a-search")
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
  if (algorithmId === "greedy")
    return (
      <div className="search-options">
        <span className="evaluation-formula">f(n) = h(n)</span>
        <p>
          ゴールまでの予測だけで次の候補を選びます。g
          は経路コストとして記録します。
        </p>
      </div>
    );
  return null;
}

function MazeEvaluation({
  algorithmId,
  frame,
  heuristicWeight,
}: {
  algorithmId: AlgorithmId;
  frame: Frame;
  heuristicWeight: number;
}) {
  if (algorithmId === "iddfs")
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
  if (!["greedy", "a-search", "astar", "dijkstra"].includes(algorithmId))
    return null;
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

function ArrayDiagram({
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
  const low = frame.left ?? 0,
    high = frame.right ?? frame.array.length - 1;
  const min = Math.min(0, ...frame.array),
    max = Math.max(1, ...frame.array);
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
      <div className="array-scroll">
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
            const active = frame.active.includes(i),
              found = frame.found.includes(i),
              visited = frame.visited.includes(i),
              inRange = i >= low && i <= high;
            return (
              <div
                key={i}
                className={`array-column ${found ? "found" : active ? "active" : visited ? "visited" : inRange ? "in-range" : "excluded"}`}
              >
                <div className="pointer-label">
                  {active && !found ? (
                    <>
                      <ArrowDown size={15} />
                      <span>
                        {category === "sort"
                          ? "比較"
                          : frame.mid === i
                            ? "mid"
                            : "i"}
                      </span>
                    </>
                  ) : found ? (
                    <>
                      <Check size={15} />
                      <span>発見</span>
                    </>
                  ) : category === "array" && (i === low || i === high) ? (
                    <>
                      <ArrowDown size={12} />
                      <span>
                        {i === low && i === high
                          ? "L / R"
                          : i === low
                            ? "left"
                            : "right"}
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
                    if (category !== "sort") onPick(value);
                  }}
                  disabled={category === "sort"}
                  title={
                    category === "sort"
                      ? `a[${i}] = ${value}`
                      : `${value} を探索対象にする`
                  }
                  aria-label={
                    category === "sort"
                      ? `a[${i}] = ${value}`
                      : `${value} を探索対象にする`
                  }
                >
                  <span>{value}</span>
                </button>
                <span className="array-index">{i}</span>
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
        <span>
          {category === "sort"
            ? "昇順に並べ替えます"
            : "値をクリックして探索対象に設定"}
        </span>
      </div>
    </div>
  );
}

function TreeDiagram({
  values,
  frame,
  onPick,
}: {
  values: number[];
  frame: Frame;
  onPick: (n: number) => void;
}) {
  const nodes = buildTree(values),
    depth = Math.max(...nodes.map((n) => n.depth)),
    width = Math.max(600, nodes.length * 44),
    height = Math.max(240, (depth + 1) * 66 + 22);
  const x = (id: number) =>
      32 + (nodes[id].x * (width - 64)) / Math.max(1, nodes.length - 1),
    y = (id: number) => 32 + nodes[id].depth * 66;
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
            aria-label={`${n.value} を探索対象にする`}
            onClick={() => onPick(n.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onPick(n.value);
            }}
            className={`tree-node ${frame.found.includes(n.id) ? "found" : frame.active.includes(n.id) ? "active" : frame.visited.includes(n.id) ? "visited" : ""}`}
          >
            <circle cx={x(n.id)} cy={y(n.id)} r="21" />
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

function Stat({
  icon: Icon,
  label,
  value,
  unit = "",
  detail,
  status = false,
}: {
  icon: typeof Search;
  label: string;
  value: number | string;
  unit?: string;
  detail: string;
  status?: boolean;
}) {
  return (
    <div className={`stat-card ${status ? "status-stat" : ""}`}>
      <div className="stat-label">
        <Icon size={15} />
        {label}
      </div>
      <div className="stat-value">
        {status && <i />}
        {value}
        <span>{unit}</span>
      </div>
      <p>{detail}</p>
    </div>
  );
}

function TraceChart({
  frames,
  category,
  onSeek,
}: {
  frames: Frame[];
  category: Category;
  onSeek: (n: number) => void;
}) {
  const max = Math.max(1, ...frames.map((f) => f.comparisons)),
    w = 880,
    h = 180,
    p = 32;
  const x = (i: number) =>
      p + (i * (w - 2 * p)) / Math.max(1, frames.length - 1),
    y = (v: number) => h - p - (v * (h - 2 * p)) / max;
  const stride = Math.max(1, Math.ceil(frames.length / 300));
  const samples = frames.flatMap((f, i) =>
    i % stride === 0 || i === frames.length - 1 ? [{ f, i }] : [],
  );
  return (
    <div className="trace-chart">
      <span className="chart-axis-label">
        {category === "maze" ? "累積訪問回数" : category === "problem" || category === "game" ? "訪問ノード数" : "比較回数"}
        {stride > 1 ? "（代表点を表示・全件はCSVへ）" : ""}
      </span>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="ステップごとの累積比較・訪問回数"
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={p}
              x2={w - p}
              y1={y(max * v)}
              y2={y(max * v)}
              className="chart-grid"
            />
            <text x={p - 8} y={y(max * v) + 4} textAnchor="end">
              {Math.round(max * v)}
            </text>
          </g>
        ))}
        <path
          d={`M ${p},${h - p} ${samples.map(({ f, i }) => `L ${x(i)},${y(f.comparisons)}`).join(" ")} L ${x(frames.length - 1)},${h - p} Z`}
          fill="#eef5df"
        />
        <polyline
          points={samples
            .map(({ f, i }) => `${x(i)},${y(f.comparisons)}`)
            .join(" ")}
          fill="none"
          stroke="#76964a"
          strokeWidth="2.5"
        />
        {samples.map(({ f, i }) => (
          <g
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`ステップ ${i}：${f.comparisons} 回`}
            onClick={() => onSeek(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSeek(i);
            }}
          >
            <circle
              cx={x(i)}
              cy={y(f.comparisons)}
              r={frames.length > 70 ? 2 : 4}
              fill={i === frames.length - 1 ? "#e49c48" : "#76964a"}
            />
            {(frames.length < 18 || i === frames.length - 1) && (
              <text x={x(i)} y={h - 8} textAnchor="middle">
                {i}
              </text>
            )}
          </g>
        ))}
      </svg>
      <span className="chart-bottom-label">ステップ →</span>
    </div>
  );
}

function Guide() {
  return (
    <>
      <span className="modal-eyebrow">
        <BookOpen size={16} />
        QUICK START
      </span>
      <h2 id="modal-title">動かして、理解しよう。</h2>
      <p className="modal-description">
        はじめての探索ラボ。3つのステップで始められます。
      </p>
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
          <kbd>Ctrl / ⌘</kbd>＋<kbd>Z</kbd> 元に戻す（Shiftでやり直し）
        </span>
        <span>
          <kbd>?</kbd> このガイドを開く
        </span>
        <small>
          入力中は通常の編集操作が優先されます。迷路内の矢印キーはマスの移動、Enter
          / Space は編集に使います。
        </small>
      </div>
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

function Comparison({
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
  const results = useMemo(
    () =>
      algorithms
        .filter((a) => a.category === category)
        .map((a) => {
          const sorted = [...data.array].sort((x, y) => x - y);
          const frames =
            category === "maze"
              ? mazeFrames(a.id, grid, start, goal, ROWS, COLS, mazeOptions)
              : category === "tree"
                ? treeFrames(a.id, data.tree, target)
                : category === "sort"
                  ? sortFrames(a.id, data.sort)
                  : category === "problem" || category === "game" ? advancedFrames(a.id as AdvancedId, data[category])
                    : searchFrames(
                      a.id,
                      a.id === "linear" ? data.array : sorted,
                      target,
                    );
          return {
            algorithm: a,
            last: frames[frames.length - 1],
            steps: frames.length - 1,
          };
        }),
    [category, data, grid, start, goal, target, mazeOptions],
  );
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
        {category === "maze" ? "迷路" : category === "tree" ? "木" : category === "game" ? "終端評価" : category === "problem" ? "入力値" : "配列"}
        を使った、実際の実行結果です。
        {category === "array" || category === "tree"
          ? ` 探索する値：${target}`
          : ""}
      </p>
      <div className="comparison-list">
        {results.map(({ algorithm: a, last, steps }) => (
          <div className="comparison-item" key={a.id}>
            <div>
              <strong>{a.name}</strong>
              <span>{a.time}</span>
              <b>
                {last.comparisons}{" "}
                <small>{category === "maze" ? "マス訪問" : category === "problem" || category === "game" ? "ノード訪問" : "回比較"}</small>
              </b>
            </div>
            <div className="comparison-bar">
              <span style={{ width: `${(last.comparisons / max) * 100}%` }} />
            </div>
            <p>
              {last.result === "limited"
                ? "上限到達（経路の有無は未確定）"
                : last.result === "missing"
                  ? category === "problem" ? "根の問題を解決できませんでした" : "目標は見つかりませんでした"
                  : category === "game" ? a.id === "game-tree" ? "全局面を走査（最善手の選択なし）" : `評価値 ${last.value} / 最善手 ${last.path?.[1] ?? "終端"} / 枝刈り ${last.pruned?.length ?? 0} ノード`
                  : category === "problem" ? a.id === "and-or" ? "解グラフを発見" : `総和 ${last.value}`
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
                : category === "game" ? "同じゲーム木を左から探索します。ミニマックス法とアルファベータ法の根の評価と最善手は一致します。訪問数には内部ノードも含み、枝刈りした局面は含みません。"
                  : category === "problem" ? "同じ数列を、分解では加算、AND/OR では成否（0 は失敗）として使います。異なる問題なので、訪問数は処理の違いを観察するための指標です。"
                    : "交換回数には、同じ位置どうしの交換は含みません。入力の並びを変えると、結果も変わります。"}
        </p>
      </div>
    </>
  );
}

export default App;
