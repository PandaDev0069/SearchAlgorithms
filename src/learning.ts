import { algorithms } from "./algorithms.ts";
import type { AlgorithmId } from "./algorithms.ts";

export const LEARNING_KEY = "tansaku-learning-v1";
export const DAILY_GOAL = 3,
  STUDY_XP = 20,
  CHEST_XP = 50;
export type StudyDay = { algorithms: AlgorithmId[]; chestOpened: boolean };
export type LearningState = {
  version: 1;
  days: Record<string, StudyDay>;
  legacyAlgorithms: AlgorithmId[];
};
export const emptyLearning: LearningState = {
  version: 1,
  days: {},
  legacyAlgorithms: [],
};
const validId = (id: unknown): id is AlgorithmId =>
  algorithms.some((a) => a.id === id);
const uniqueIds = (value: unknown): AlgorithmId[] =>
  Array.isArray(value) ? [...new Set(value.filter(validId))] : [];
const validDay = (day: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(day) &&
  !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) &&
  new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;

export function getStudyDay(date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function previousDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);
}
export function sanitizeLearning(value: unknown): LearningState {
  if (!value || typeof value !== "object")
    return { ...emptyLearning, days: {} };
  const input = value as Partial<LearningState>,
    days: Record<string, StudyDay> = {};
  if (input.days && typeof input.days === "object")
    for (const [date, entry] of Object.entries(input.days)) {
      if (!validDay(date) || !entry || typeof entry !== "object") continue;
      const ids = uniqueIds(entry.algorithms);
      if (!ids.length) continue;
      days[date] = {
        algorithms: ids,
        chestOpened: entry.chestOpened === true && ids.length >= DAILY_GOAL,
      };
    }
  return {
    version: 1,
    days,
    legacyAlgorithms: uniqueIds(input.legacyAlgorithms),
  };
}
export function recordStudy(
  state: LearningState,
  id: AlgorithmId,
  day: string,
): LearningState {
  if (
    !validDay(day) ||
    !validId(id) ||
    state.days[day]?.algorithms.includes(id)
  )
    return state;
  return {
    ...state,
    days: {
      ...state.days,
      [day]: {
        algorithms: [...(state.days[day]?.algorithms ?? []), id],
        chestOpened: state.days[day]?.chestOpened ?? false,
      },
    },
  };
}
export function mergeLearning(
  first: LearningState,
  second: LearningState,
): LearningState {
  const days: Record<string, StudyDay> = {};
  for (const day of [
    ...new Set([...Object.keys(first.days), ...Object.keys(second.days)]),
  ].sort())
    days[day] = {
      algorithms: [
        ...new Set([
          ...(first.days[day]?.algorithms ?? []),
          ...(second.days[day]?.algorithms ?? []),
        ]),
      ].sort(),
      chestOpened: !!(
        first.days[day]?.chestOpened || second.days[day]?.chestOpened
      ),
    };
  const merged: LearningState = {
    version: 1,
    days,
    legacyAlgorithms: [
      ...new Set([...first.legacyAlgorithms, ...second.legacyAlgorithms]),
    ].sort(),
  };
  return JSON.stringify(first) === JSON.stringify(merged) ? first : merged;
}
export function openDailyChest(
  state: LearningState,
  day: string,
): LearningState {
  const entry = state.days[day];
  if (!entry || entry.algorithms.length < DAILY_GOAL || entry.chestOpened)
    return state;
  return {
    ...state,
    days: { ...state.days, [day]: { ...entry, chestOpened: true } },
  };
}

export function learningStats(state: LearningState, today: string) {
  const days = Object.keys(state.days)
    .filter((day) => state.days[day].algorithms.length > 0)
    .sort();
  const distinct = [
    ...new Set([
      ...state.legacyAlgorithms,
      ...days.flatMap((day) => state.days[day].algorithms),
    ]),
  ];
  const chests = days.filter((day) => state.days[day].chestOpened).length;
  const sessions = days.reduce(
    (sum, day) => sum + state.days[day].algorithms.length,
    0,
  );
  const xp = sessions * STUDY_XP + chests * CHEST_XP;
  let streak = 0,
    cursor = state.days[today] ? today : previousDay(today);
  while (state.days[cursor]?.algorithms.length) {
    streak++;
    cursor = previousDay(cursor);
  }
  let longest = 0,
    run = 0,
    last = "";
  for (const day of days) {
    run = last === previousDay(day) ? run + 1 : 1;
    longest = Math.max(longest, run);
    last = day;
  }
  return {
    xp,
    level: Math.floor(xp / 100) + 1,
    levelXp: xp % 100,
    streak,
    longest,
    distinct,
    sessions,
    chests,
    days: days.length,
    today: state.days[today]?.algorithms.length ?? 0,
    chestReady:
      (state.days[today]?.algorithms.length ?? 0) >= DAILY_GOAL &&
      !state.days[today]?.chestOpened,
    chestOpened: state.days[today]?.chestOpened ?? false,
  };
}
export const achievements = [
  {
    id: "first",
    name: "冒険のはじまり",
    description: "はじめてアルゴリズムを体験",
    icon: "sparkles",
  },
  {
    id: "five",
    name: "好奇心の探検家",
    description: "5種類のアルゴリズムを体験",
    icon: "compass",
  },
  {
    id: "ten",
    name: "知識の収集家",
    description: "10種類のアルゴリズムを体験",
    icon: "book",
  },
  {
    id: "all",
    name: "アルゴリズムの賢者",
    description: `全${algorithms.length}種類のアルゴリズムを体験`,
    icon: "crown",
  },
  {
    id: "daily",
    name: "今日の冒険者",
    description: "1日で3種類を体験",
    icon: "sun",
  },
  {
    id: "streak3",
    name: "三日坊主を越えて",
    description: "3日連続で学習",
    icon: "flame",
  },
  {
    id: "streak7",
    name: "継続の達人",
    description: "7日連続で学習",
    icon: "flame",
  },
  {
    id: "chest",
    name: "お宝発見！",
    description: "はじめて宝箱を開ける",
    icon: "gift",
  },
  {
    id: "chest5",
    name: "トレジャーハンター",
    description: "5個の宝箱を開ける",
    icon: "gem",
  },
] as const;
export function unlockedAchievements(
  state: LearningState,
  today: string,
): string[] {
  const stats = learningStats(state, today);
  const checks: Record<string, boolean> = {
    first: stats.distinct.length >= 1,
    five: stats.distinct.length >= 5,
    ten: stats.distinct.length >= 10,
    all: stats.distinct.length >= algorithms.length,
    daily: Object.values(state.days).some(
      (d) => d.algorithms.length >= DAILY_GOAL,
    ),
    streak3: stats.longest >= 3,
    streak7: stats.longest >= 7,
    chest: stats.chests >= 1,
    chest5: stats.chests >= 5,
  };
  return achievements.filter((a) => checks[a.id]).map((a) => a.id);
}
export function dailyTreasure(day: string): string {
  const treasures = [
    "ひらめきのクリスタル",
    "探究のコンパス",
    "知恵のしおり",
    "継続のスター",
  ];
  return treasures[
    [...day].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      treasures.length
  ];
}
