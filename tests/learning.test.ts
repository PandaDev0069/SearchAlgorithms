import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyLearning,
  getStudyDay,
  learningStats,
  mergeLearning,
  openDailyChest,
  previousDay,
  recordStudy,
  sanitizeLearning,
  unlockedAchievements,
} from "../src/learning.ts";
import type { LearningState } from "../src/learning.ts";

test("daily credit is idempotent, persisted, and advances on the next Japanese day", () => {
  const first = recordStudy(emptyLearning, "binary", "2026-10-29");
  assert.equal(recordStudy(first, "binary", "2026-10-29"), first);
  assert.equal(learningStats(first, "2026-10-29").xp, 20);
  const restored = sanitizeLearning(JSON.parse(JSON.stringify(first)));
  const next = recordStudy(restored, "binary", "2026-10-30");
  assert.equal(learningStats(next, "2026-10-30").xp, 40);
  assert.equal(learningStats(next, "2026-10-30").streak, 2);
});
test("treasure requires three distinct algorithms and can only be claimed once", () => {
  let state: LearningState = recordStudy(emptyLearning, "binary", "2026-10-29");
  assert.equal(openDailyChest(state, "2026-10-29"), state);
  state = recordStudy(state, "linear", "2026-10-29");
  state = recordStudy(state, "bfs", "2026-10-29");
  assert.equal(learningStats(state, "2026-10-29").chestReady, true);
  state = openDailyChest(state, "2026-10-29");
  assert.equal(learningStats(state, "2026-10-29").xp, 110);
  assert.equal(learningStats(state, "2026-10-29").level, 2);
  assert.equal(openDailyChest(state, "2026-10-29"), state);
  assert.equal(learningStats(state, "2026-10-30").chestReady, false);
});
test("streaks survive midnight, break after a missed day, and retain lifetime achievements", () => {
  let state: LearningState = emptyLearning;
  for (const day of ["2026-12-30", "2026-12-31", "2027-01-01"])
    state = recordStudy(state, "binary", day);
  assert.equal(learningStats(state, "2027-01-02").streak, 3);
  assert.equal(learningStats(state, "2027-01-03").streak, 0);
  state = recordStudy(state, "bfs", "2027-01-03");
  assert.equal(learningStats(state, "2027-01-03").streak, 1);
  assert.equal(learningStats(state, "2027-01-03").longest, 3);
  assert.ok(unlockedAchievements(state, "2027-01-03").includes("streak3"));
  assert.equal(previousDay("2024-03-01"), "2024-02-29");
});
test("Japanese daily boundary is independent of execution host timezone", () => {
  assert.equal(getStudyDay(new Date("2026-10-29T14:59:59Z")), "2026-10-29");
  assert.equal(getStudyDay(new Date("2026-10-29T15:00:00Z")), "2026-10-30");
});
test("corrupted saves cannot produce duplicate XP or claim unearned treasure", () => {
  const state = sanitizeLearning({
    days: {
      "2026-10-29": {
        algorithms: ["binary", "binary", "unknown"],
        chestOpened: true,
      },
      "2026-02-30": { algorithms: ["bfs"] },
    },
    legacyAlgorithms: ["linear", "linear", "unknown"],
    xp: 999999,
  });
  assert.deepEqual(state.days["2026-10-29"], {
    algorithms: ["binary"],
    chestOpened: false,
  });
  assert.equal(Object.keys(state.days).length, 1);
  assert.equal(learningStats(state, "2026-10-29").xp, 20);
  assert.equal(learningStats(state, "2026-10-29").distinct.length, 2);
  assert.equal(
    learningStats(
      { ...emptyLearning, legacyAlgorithms: ["binary"] },
      "2026-10-29",
    ).xp,
    0,
  );
});
test("concurrent tab progress merges without dropping study or duplicating rewards", () => {
  const left = recordStudy(emptyLearning, "binary", "2026-10-29"),
    right = recordStudy(emptyLearning, "bfs", "2026-10-29");
  let merged = mergeLearning(left, right);
  assert.equal(learningStats(merged, "2026-10-29").xp, 40);
  assert.equal(mergeLearning(merged, left), merged);
  merged = recordStudy(merged, "dfs", "2026-10-29");
  const claimed = openDailyChest(merged, "2026-10-29");
  assert.equal(
    learningStats(mergeLearning(claimed, merged), "2026-10-29").xp,
    110,
  );
});
