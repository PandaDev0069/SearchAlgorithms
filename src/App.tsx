import {
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
  Columns2,
  Copy,
  Download,
  Flag,
  Gem,
  Layers3,
  LayoutList,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  MousePointer2,
  PanelLeftClose,
  Play,
  Plus,
  Redo2,
  Search,
  Settings2,
  Share2,
  Shuffle,
  Sparkles,
  StepForward,
  Sun,
  Target,
  Undo2,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdvancedId } from "./advancedSearch";
import { buildSearchGraph, defaultGame, defaultProblem } from "./advancedSearch";
import type { AlgorithmId, Category, MazeOptions } from "./algorithms";
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
  parseValues,
  ROWS,
  START,
} from "./algorithms";
import { CodePanel } from "./CodePanel";
import { createExecutionFrames } from "./execution";
import {
  CurrentInstruction,
  PlaybackControls,
  playbackSpeeds,
  WatchStates,
} from "./ExecutionPanel";
import type { Experiment } from "./experiment";
import {
  categoryDefaults,
  decodeExperiment,
  defaultExperiment,
  encodeExperiment,
  EXPERIMENT_KEY,
  parseExperiment,
  validateExperiment,
} from "./experiment";
import { downloadFile, traceCsv } from "./fileExport";
import { Comparison, Guide } from "./HelpDialogs";
import {
  emptyLearning,
  getStudyDay,
  LEARNING_KEY,
  mergeLearning,
  openDailyChest,
  recordStudy,
  sanitizeLearning,
} from "./learning";
import { LearningAdventure } from "./LearningAdventure";
import { MazeEvaluation, MazeSettings } from "./MazeControls";
import { readStored, writeStored } from "./preferences";
import { formatScore } from "./scoreFormatting";
import { SearchGraphDiagram } from "./SearchGraphDiagram";
import { Settings } from "./Settings";
import { TracePanel } from "./TracePanel";
import { usePreferences } from "./usePreferences";
import { categories } from "./workspace";
import { ArrayDiagram, TreeDiagram } from "./WorkspaceDiagrams";
import { Stat } from "./WorkspaceSummary";

const presetSize = { array: 15, tree: 15, sort: 12, problem: 4, game: 8 };
type Modal = "help" | "compare" | "settings" | "learning" | "share" | null;

function App() {
  const { preferences, updatePreferences, resolvedTheme } = usePreferences();
  const [initial] = useState(() => {
    let warning = "";
    const shared = new URLSearchParams(window.location.hash.slice(1)).get("lab");
    if (shared) {
      try {
        return { experiment: decodeExperiment(shared), warning: "" };
      } catch (error) {
        warning = (error as Error).message;
      }
    }
    return {
      experiment: preferences.resume
        ? readStored(EXPERIMENT_KEY, defaultExperiment(), validateExperiment)
        : defaultExperiment(),
      warning,
    };
  });
  const [category, setCategory] = useState<Category>(initial.experiment.category);
  const [algorithmId, setAlgorithmId] = useState<AlgorithmId>(initial.experiment.algorithmId);
  const [selections, setSelections] = useState(initial.experiment.selections);
  const [data, setData] = useState(initial.experiment.data);
  const [grid, setGrid] = useState(initial.experiment.grid);

  const [heuristicWeight, setHeuristicWeight] = useState(initial.experiment.heuristicWeight);
  const [maxDepth, setMaxDepth] = useState(initial.experiment.maxDepth);
  const mazeOptions = useMemo<MazeOptions>(
    () => ({ heuristicWeight, maxDepth: maxDepth || undefined }),
    [heuristicWeight, maxDepth],
  );
  const [start, setStart] = useState(initial.experiment.start);
  const [goal, setGoal] = useState(initial.experiment.goal);
  const [target, setTarget] = useState(initial.experiment.target);
  const [targetInput, setTargetInput] = useState(String(initial.experiment.target));

  const [raw, setRaw] = useState(
    initial.experiment.category === "maze"
      ? ""
      : initial.experiment.data[initial.experiment.category].join(", "),
  );
  const [error, setError] = useState("");

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const speed = preferences.speed;
  const [view, setView] = useState<"boxes" | "bars">("boxes");

  const [modal, setModal] = useState<Modal>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [compactNavigation, setCompactNavigation] = useState(
    () =>
      typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1100px)").matches,
  );
  const [paint, setPaint] = useState<"wall" | "erase" | "weight" | "start" | "goal">("wall");
  const [toast, setToast] = useState(initial.warning);

  const [learning, setLearning] = useState(() =>
    readStored(
      LEARNING_KEY,
      {
        ...emptyLearning,
        days: {},
        legacyAlgorithms: readStored<AlgorithmId[]>("tansaku-completed", [], (value) =>
          Array.isArray(value)
            ? value.filter((id): id is AlgorithmId => algorithms.some((a) => a.id === id))
            : [],
        ),
      },
      sanitizeLearning,
    ),
  );
  const [today, setToday] = useState(getStudyDay);
  const [past, setPast] = useState<Experiment[]>([]);
  const [future, setFuture] = useState<Experiment[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [mazeFocus, setMazeFocus] = useState(initial.experiment.start);

  const fileInput = useRef<HTMLInputElement>(null);
  const modalContainer = useRef<HTMLElement>(null);
  const navigationContainer = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const dragValue = useRef(1);

  const algorithm = algorithms.find((a) => a.id === algorithmId)!;
  const categoryInfo = categories.find((c) => c.id === category)!;
  const CategoryIcon = categoryInfo.icon;
  const values = category === "maze" ? grid : data[category];
  const isGraph = category === "problem" || category === "game";
  const graphNodes = useMemo(
    () => (isGraph ? buildSearchGraph(algorithmId as AdvancedId, values) : []),
    [isGraph, algorithmId, values],
  );
  const frames = useMemo(
    () =>
      createExecutionFrames(
        { category, algorithmId, data, grid, start, goal, target },
        mazeOptions,
      ),
    [algorithmId, category, data, grid, start, goal, target, mazeOptions],
  );
  const safeStep = Math.min(step, frames.length - 1);
  const frame = frames[safeStep];
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
    [category, algorithmId, selections, data, grid, start, goal, target, heuristicWeight, maxDepth],
  );
  const shareUrl = useMemo(
    () =>
      `${window.location.origin}${window.location.pathname}${window.location.search}#lab=${encodeExperiment(experiment)}`,
    [experiment],
  );

  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 1100px)");
    if (!media) {
      return;
    }
    const change = (event: MediaQueryListEvent) => {
      setCompactNavigation(event.matches);
      if (!event.matches) {
        setMobileMenu(false);
      }
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = window.setInterval(
      () => setStep((s) => Math.min(s + 1, frames.length - 1)),
      650 / speed,
    );
    return () => window.clearInterval(timer);
  }, [playing, speed, frames.length]);
  useEffect(() => {
    if (!ended || !playing) {
      return;
    }
    if (preferences.loop) {
      const timer = window.setTimeout(() => setStep(0), 800 / speed);
      return () => window.clearTimeout(timer);
    }
    setPlaying(false);
  }, [ended, playing, preferences.loop, speed]);
  useEffect(() => {
    if (ended && frame.result && frame.result !== "limited") {
      setLearning((previous) =>
        recordStudy(
          mergeLearning(previous, readStored(LEARNING_KEY, previous, sanitizeLearning)),
          algorithmId,
          getStudyDay(),
        ),
      );
    }
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
    if (!preferences.resume) {
      return;
    }
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
      if (event.key !== LEARNING_KEY || !event.newValue) {
        return;
      }
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
      if (document.hidden && preferences.pauseWhenHidden) {
        setPlaying(false);
      }
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
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!modal) {
      return;
    }
    setPlaying(false);
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalContainer.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModal(null);
      }
      if (event.key !== "Tab") {
        return;
      }
      const controls = modalContainer.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input, select, [tabindex="0"]',
      );
      if (!controls?.length) {
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
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
    if (ended) {
      setStep(0);
    }
    setPlaying((p) => !p);
  }, [ended]);
  useEffect(() => {
    if (!mobileMenu) {
      return;
    }
    setPlaying(false);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navigationContainer.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    const closeOrTrap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenu(false);
      }
      if (event.key !== "Tab") {
        return;
      }
      const controls = navigationContainer.current?.querySelectorAll<HTMLElement>(
        "a[href], button:not(:disabled)",
      );
      if (!controls?.length) {
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", closeOrTrap);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOrTrap);
      menuTrigger.current?.focus();
    };
  }, [mobileMenu]);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) {
        return;
      }
      const el = e.target as HTMLElement;
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) ||
        el.isContentEditable ||
        modal ||
        mobileMenu
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
        return;
      }
      if (!preferences.shortcuts) {
        return;
      }
      if (e.altKey || e.isComposing) {
        return;
      }
      if (e.code === "Space" && e.repeat) {
        e.preventDefault();
        return;
      }
      if (
        el.closest("button, a, summary, [role='tab']") &&
        (e.code === "Space" || e.code === "Enter")
      ) {
        if (e.code !== "Space" || !el.closest(".transport")) {
          return;
        }
      }
      if (e.code === "BracketLeft" || e.code === "BracketRight") {
        e.preventDefault();
        const index = playbackSpeeds.indexOf(speed);
        const next = Math.max(
          0,
          Math.min(playbackSpeeds.length - 1, index + (e.code === "BracketRight" ? 1 : -1)),
        );
        updatePreferences({ speed: playbackSpeeds[next] });
      }
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
      if (e.key.toLowerCase() === "r") {
        reset();
      }
      if (e.key === "?") {
        e.preventDefault();
        openModal("help");
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [
    togglePlay,
    frames.length,
    reset,
    modal,
    mobileMenu,
    past,
    future,
    experiment,
    speed,
    updatePreferences,
    preferences.shortcuts,
  ]);

  function remember() {
    setPast((previous) => [...previous.slice(-29), experiment]);
    setFuture([]);
  }
  function openModal(next: Exclude<Modal, null>) {
    setMobileMenu(false);
    setModal(next);
  }
  function restore(next: Experiment, record = true) {
    if (record) {
      remember();
    }
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
    if (!past.length) {
      return;
    }
    setFuture((previous) => [experiment, ...previous].slice(0, 30));
    const next = past[past.length - 1];
    setPast(past.slice(0, -1));
    restore(next, false);
  }
  function redo() {
    if (!future.length) {
      return;
    }
    setPast((previous) => [...previous.slice(-29), experiment]);
    const next = future[0];
    setFuture(future.slice(1));
    restore(next, false);
  }
  function categoryKey(event: React.KeyboardEvent, index: number) {
    let next = index;
    if (event.key === "ArrowRight") {
      next = (index + 1) % categories.length;
    } else if (event.key === "ArrowLeft") {
      next = (index + categories.length - 1) % categories.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = categories.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    changeCategory(categories[next].id);
    (event.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
  }
  function mazeKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    let next = index;
    if (event.key === "ArrowRight" && col < COLS - 1) {
      next++;
    } else if (event.key === "ArrowLeft" && col > 0) {
      next--;
    } else if (event.key === "ArrowUp" && row > 0) {
      next -= COLS;
    } else if (event.key === "ArrowDown" && row < ROWS - 1) {
      next += COLS;
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      editCell(index, true);
      dragging.current = false;
      return;
    } else if (!event.key.startsWith("Arrow")) {
      return;
    }
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
      setToast("コピーできませんでした。共有リンク欄から手動でコピーできます。");
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
    if (!file) {
      return;
    }
    try {
      if (file.size > 65536) {
        throw new Error("実験ファイルは64 KB以下にしてください。");
      }
      restore(parseExperiment(await file.text()));
      setToast("実験を読み込みました。");
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setToast("このブラウザーでは全画面表示を利用できません。");
    }
  }
  function applyPreset(preset: string) {
    if (!preset) {
      return;
    }
    remember();
    reset();
    setError("");
    if (category === "maze") {
      const next = preset === "empty" ? Array(ROWS * COLS).fill(0) : initialMaze();
      if (preset === "weighted") {
        for (let c = 2; c < COLS - 2; c++) {
          if (next[COLS + c] !== 1) {
            next[COLS + c] = 5;
          }
        }
      }
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
          : category === "problem"
            ? [...defaultProblem]
            : category === "game"
              ? [...defaultGame]
              : [...defaultSort];
    if (preset === "reverse") {
      next.sort((a, b) => b - a);
    }
    if (preset === "duplicates") {
      next = [8, 3, 8, 1, 3, 5, 8, 5];
    }
    if (preset === "negative") {
      next = [-12, 7, -3, 0, 15, -8, 4];
    }
    if (preset === "skewed") {
      next = Array.from({ length: 15 }, (_, i) => i + 1);
    }
    if (category === "array" && algorithmId !== "linear") {
      next.sort((a, b) => a - b);
    }
    setData((previous) => ({ ...previous, [category]: next }));
    setRaw(next.join(", "));
  }

  function changeCategory(next: Category) {
    reset();
    setCategory(next);
    setAlgorithmId(selections[next] ?? categoryDefaults[next]);
    setError("");
    setMobileMenu(false);
    if (next !== "maze") {
      setRaw(data[next].join(", "));
    }
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
      if (category === "tree") {
        numbers = [...new Set(numbers)];
      }
      if (category === "array" && algorithmId !== "linear") {
        const sorted = [...numbers].sort((a, b) => a - b);
        if (numbers.some((v, i) => v !== sorted[i])) {
          setToast("入力値を昇順に整列して適用しました。");
        }
        numbers = sorted;
      }
      remember();
      if (category !== "maze") {
        setData((prev) => ({ ...prev, [category]: numbers }));
      }
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
    let next = Array.from({ length: presetSize[category] }, () =>
      category === "problem"
        ? Math.round(Math.random())
        : category === "game"
          ? Math.floor(Math.random() * 21) - 10
          : Math.floor(Math.random() * 96) + 3,
    );
    if (category === "array" && algorithmId !== "linear") {
      next.sort((a, b) => a - b);
    }
    if (category === "tree") {
      const sorted = [...new Set(next)].sort((a, b) => a - b);
      next = [];
      const balance = (a: number[]) => {
        if (!a.length) {
          return;
        }
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
    if (value !== target) {
      remember();
    }
    setTarget(value);
    setTargetInput(String(value));
    reset();
  }
  function seek(value: number) {
    setPlaying(false);
    setStep(Math.max(0, Math.min(frames.length - 1, Math.round(value))));
  }
  function editCell(i: number, first = false) {
    if (!first && !dragging.current) {
      return;
    }
    if (paint === "start" || paint === "goal") {
      if (!first || i === (paint === "start" ? goal : start)) {
        return;
      }
      remember();
      reset();
      if (paint === "start") {
        setStart(i);
      } else {
        setGoal(i);
      }
      setGrid((prev) => prev.map((v, j) => (i === j ? 0 : v)));
      return;
    }
    if (i === start || i === goal) {
      return;
    }
    if (first) {
      remember();
      dragging.current = true;
      dragValue.current = paint === "erase" ? 0 : paint === "weight" ? 5 : grid[i] === 1 ? 0 : 1;
    }
    reset();
    setGrid((prev) =>
      prev[i] === dragValue.current ? prev : prev.map((v, j) => (i === j ? dragValue.current : v)),
    );
  }
  function downloadTrace() {
    downloadFile(
      traceCsv(frames, category),
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
      {mobileMenu && <div className="sidebar-scrim" onClick={() => setMobileMenu(false)} />}
      <aside
        ref={navigationContainer}
        id="lab-navigation"
        className={`sidebar ${mobileMenu ? "open" : ""}`}
        inert={modal || (compactNavigation && !mobileMenu) ? true : undefined}
        role={mobileMenu ? "dialog" : undefined}
        aria-modal={mobileMenu ? true : undefined}
        aria-label="実験室と学習ツール"
      >
        <button
          className="navigation-close icon-button"
          aria-label="メニューを閉じる"
          onClick={() => setMobileMenu(false)}
        >
          <X size={20} />
        </button>
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
                {String(algorithms.filter((a) => a.category === c.id).length).padStart(2, "0")}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-separator" />
        <div className="sidebar-label">学習ツール</div>
        <button className="nav-item" onClick={() => openModal("compare")}>
          <Layers3 size={18} />
          <span>アルゴリズム比較</span>
          <ArrowUpRight size={14} />
        </button>
        <button className="nav-item" onClick={() => openModal("help")}>
          <BookOpen size={18} />
          <span>使い方ガイド</span>
        </button>
        <button className="nav-item" onClick={() => openModal("learning")} aria-label="学習の冒険">
          <Gem size={18} />
          <span>学習の冒険</span>
        </button>
        <button
          className="nav-item"
          onClick={() => openModal("settings")}
          aria-label="表示・操作の設定"
        >
          <Settings2 size={18} />
          <span>表示・操作の設定</span>
        </button>
        <div className="sidebar-bottom">
          <span className="online-dot" />
          ブラウザで、すべて完結。
          <button onClick={() => openModal("help")} aria-label="ヘルプ">
            <CircleHelp size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell" inert={mobileMenu || modal ? true : undefined}>
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              ref={menuTrigger}
              onClick={() => setMobileMenu((v) => !v)}
              aria-label="メニューを開く"
              aria-expanded={mobileMenu}
              aria-controls="lab-navigation"
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
                preferences.sidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"
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
                onClick={() => updatePreferences({ fontSize: preferences.fontSize - 5 })}
              >
                A−
              </button>
              <span>{preferences.fontSize}%</span>
              <button
                aria-label="文字サイズを拡大"
                disabled={preferences.fontSize >= 160}
                onClick={() => updatePreferences({ fontSize: preferences.fontSize + 5 })}
              >
                A＋
              </button>
            </div>
            <button
              className="icon-button"
              aria-label={
                resolvedTheme === "dark" ? "ライトテーマに切り替え" : "ダークテーマに切り替え"
              }
              onClick={() =>
                updatePreferences({
                  theme: resolvedTheme === "dark" ? "light" : "dark",
                })
              }
            >
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="settings-button secondary-button"
              onClick={() => openModal("settings")}
            >
              <Settings2 size={16} />
              表示設定
            </button>
          </div>
        </header>
        <main id="workspace-main" tabIndex={-1}>
          <section className="intro">
            <div>
              <h1>{categoryInfo.name}</h1>
            </div>
            <p className="learning-prompt">次の変化を予想して、1ステップ進めよう。</p>
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

          <section className="setup-card card" aria-label="アルゴリズムとデータの設定">
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
                      onChange={(e) => changeAlgorithm(e.target.value as AlgorithmId)}
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
              <span>
                <CheckCircle2 size={13} />
                {algorithm.condition}
              </span>
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
                    {category === "tree" && <option value="skewed">偏った木</option>}
                  </>
                )}
              </select>
            </div>
            {category !== "maze" ? (
              <div className="data-controls">
                <div className="data-input">
                  <label htmlFor="array-input">
                    {category === "tree"
                      ? "挿入する値（入力順）"
                      : category === "game"
                        ? "終端局面の評価値（左から）"
                        : category === "problem"
                          ? algorithmId === "and-or"
                            ? "終端の成否（0 は失敗、0 以外は成功）"
                            : "分解して合計する値"
                          : "配列のデータ"}
                    <span>最大 {category === "tree" ? "31" : "32"} 個</span>
                  </label>
                  <div className="input-action">
                    <input
                      id="array-input"
                      value={raw}
                      onChange={(e) => setRaw(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateData();
                        }
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
                <button className="secondary-button randomize" onClick={randomize}>
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

          <section className="learning-workspace" aria-label="同期実行ワークスペース">
            <div className="workspace-caption">
              <span>
                <span className="sync-mark" /> 可視化とコードを同期
              </span>
              <span>1ステップ = 比較・訪問などの操作単位</span>
            </div>
            <PlaybackControls
              playing={playing}
              ended={ended}
              step={safeStep}
              lastStep={frames.length - 1}
              speed={speed}
              shortcuts={preferences.shortcuts}
              onToggle={togglePlay}
              onReset={reset}
              onSeek={seek}
              onSpeed={(next) => updatePreferences({ speed: next })}
            />
            <WatchStates
              frame={frame}
              previous={frames[safeStep - 1]}
              category={category}
              algorithmId={algorithmId}
              target={target}
            />
            <div
              className={`workspace-grid ${!preferences.showCode || preferences.layout === "focus" ? "no-code" : ""} ${preferences.codePosition === "left" ? "code-left" : ""}`}
            >
              <section className="visualizer-card card" aria-label="アルゴリズムの可視化">
                <div className="panel-heading">
                  <div className="panel-title">
                    <span className="tiny-icon">
                      <CategoryIcon size={16} />
                    </span>
                    <h2>{categoryInfo.name}</h2>
                    <span className="muted">
                      {category === "maze"
                        ? `${COLS} × ${ROWS}`
                        : isGraph
                          ? `${graphNodes.length} ノード`
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
                        : isGraph
                          ? "終端の値は上の入力欄で編集"
                          : "ノードをクリックして目標に設定"}
                    </span>
                  )}
                </div>
                {preferences.showCode && preferences.layout !== "focus" && (
                  <CurrentInstruction lines={algorithm.code} line={frame.line} />
                )}
                <div className="legend">
                  <span>
                    <i className="legend-range" aria-hidden="true" />
                    {category === "maze"
                      ? "探索待ち"
                      : category === "tree" || isGraph
                        ? "未訪問"
                        : "探索範囲"}
                  </span>
                  <span>
                    <i
                      className={category === "sort" ? "legend-compare" : "legend-current"}
                      aria-hidden="true"
                    />
                    {category === "sort" ? "比較中" : "現在の位置"}
                  </span>
                  {category === "array" && (
                    <span>
                      <i className="legend-compare" aria-hidden="true" />
                      値の比較
                    </span>
                  )}
                  <span>
                    <i className="legend-visited" aria-hidden="true" />
                    {category === "sort" ? "未確定" : "確認済み"}
                  </span>
                  <span>
                    <i className="legend-found" aria-hidden="true" />
                    {category === "maze"
                      ? "経路"
                      : category === "sort"
                        ? "整列完了"
                        : isGraph
                          ? "解・主変化"
                          : "発見"}
                  </span>
                  {category === "array" && (
                    <span>
                      <i className="legend-excluded" aria-hidden="true" />
                      対象外
                    </span>
                  )}
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
                  <SearchGraphDiagram
                    id={algorithmId as AdvancedId}
                    values={values}
                    frame={frame}
                  />
                ) : category === "tree" ? (
                  <TreeDiagram values={values} frame={frame} onPick={pickTarget} />
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
                  aria-live={playing ? "off" : "polite"}
                  aria-atomic="true"
                >
                  <span className="explanation-icon">
                    {frame.result === "found" || frame.result === "complete" ? (
                      <CheckCircle2 size={18} />
                    ) : frame.result === "missing" || frame.result === "limited" ? (
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
                          ? category === "sort"
                            ? "整列が完了しました"
                            : "探索が完了しました"
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
              </section>
              <CodePanel
                algorithm={algorithm}
                category={category}
                frame={frame}
                hidden={!preferences.showCode || preferences.layout === "focus"}
                layout={preferences.layout}
                onCopy={copyText}
              />
            </div>
          </section>

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
                onClick={() => openModal("share")}
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

          <div className="stats-row" hidden={!preferences.showStats}>
            <Stat
              icon={category === "maze" ? Workflow : Search}
              label={category === "maze" ? "累積訪問回数" : isGraph ? "訪問ノード数" : "比較回数"}
              value={frame.comparisons}
              unit="回"
              detail={
                category === "maze"
                  ? "再訪問も1回として計算"
                  : isGraph
                    ? "共有ノードの答えの再利用は除く"
                    : "値を確認した回数"
              }
            />
            <Stat
              icon={category === "sort" ? Shuffle : Target}
              label={
                isGraph
                  ? category === "game"
                    ? "根の評価値"
                    : algorithmId === "and-or"
                      ? "根の成否"
                      : "総和"
                  : category === "sort"
                    ? "交換回数"
                    : category === "maze"
                      ? "経路の長さ"
                      : "探索する値"
              }
              value={
                isGraph
                  ? algorithmId === "and-or" && frame.value !== undefined
                    ? frame.value
                      ? "成功"
                      : "失敗"
                    : formatScore(frame.value)
                  : category === "sort"
                    ? frame.swaps
                    : category === "maze"
                      ? frame.path
                        ? frame.path.length - 1
                        : "—"
                      : target
              }
              unit={category === "sort" ? "回" : category === "maze" ? "歩" : ""}
              detail={
                isGraph
                  ? "最終結果まで進むと表示"
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
                isGraph
                  ? algorithmId === "alpha-beta"
                    ? "枝刈りノード数"
                    : "ノード数"
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
                isGraph
                  ? algorithmId === "alpha-beta"
                    ? (frame.pruned?.length ?? 0)
                    : graphNodes.length
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
                            : frame.left !== undefined && frame.right !== undefined
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
                isGraph
                  ? algorithmId === "alpha-beta"
                    ? "子孫も含む未訪問の局面"
                    : "内部ノードと終端ノードの合計"
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
                      i > safeStep && f.line === 0 && f.depthLimit! > (frame.depthLimit ?? 0),
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
          <TracePanel
            frames={frames}
            category={category}
            step={safeStep}
            hidden={!preferences.showTrace}
            followTrace={preferences.followTrace}
            onSeek={seek}
            onExport={downloadTrace}
          />
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
                    : category === "game"
                      ? "終端の並びを逆順にすると、評価値やアルファベータ法の訪問数はどう変わるだろう？"
                      : category === "problem"
                        ? "AND の子に失敗がある場合と、OR の子に成功がある場合で、探索はいつ止まるだろう？"
                        : "整列済みのデータと逆順のデータ。比較回数はどう変わるだろう？"}
            </p>
            <button onClick={() => openModal("compare")}>
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
              つくって、試して、学ぼう。
              <span className="footer-flower">✳</span>
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
                      mergeLearning(previous, readStored(LEARNING_KEY, previous, sanitizeLearning)),
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
                  onClick={() => copyText(shareUrl, "共有リンクをコピーしました。")}
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

export default App;
