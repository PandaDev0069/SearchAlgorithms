import { BarChart3, GitBranch, Layers3, Search, Workflow } from "lucide-react";
import type { Category } from "./algorithms";

export const categories: {
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
    id: "problem",
    name: "問題の分解と探索",
    en: "PROBLEM DECOMPOSITION",
    icon: Layers3,
    description: "部分問題に分けて、答えを組み合わせよう。",
  },
  {
    id: "game",
    name: "ゲーム探索",
    en: "GAME SEARCH",
    icon: GitBranch,
    description: "相手の最善の応手まで読んで、次の一手を選ぼう。",
  },
];
