import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeExperiment,
  defaultExperiment,
  encodeExperiment,
  parseExperiment,
  validateExperiment,
} from "../src/experiment.ts";
import { defaultPreferences, sanitizePreferences } from "../src/preferences.ts";

test("experiment files and share links round-trip every route and search setting", () => {
  const experiment = defaultExperiment();
  experiment.category = "maze";
  experiment.algorithmId = "a-search";
  experiment.selections.maze = "a-search";
  experiment.heuristicWeight = 1.5;
  experiment.maxDepth = 64;
  experiment.grid[35] = 5;
  assert.deepEqual(parseExperiment(JSON.stringify(experiment)), experiment);
  assert.deepEqual(decodeExperiment(encodeExperiment(experiment)), experiment);
  assert.ok(!encodeExperiment(experiment).includes("+"));
});
test("invalid imports fail without partially applying unsafe or oversized state", () => {
  for (const change of [
    { version: 2 },
    { category: "missing" },
    { algorithmId: "bfs" },
    { target: NaN },
    { grid: [0, 1] },
    { start: -1 },
    { goal: 26 },
    { maxDepth: 1000 },
    { heuristicWeight: Infinity },
    { data: { array: [1.5], tree: [1], sort: [2] } },
  ]) {
    assert.throws(() => validateExperiment({ ...defaultExperiment(), ...change }));
  }
  assert.throws(() => parseExperiment("not json"));
  assert.throws(() => parseExperiment(" ".repeat(65537)));
  assert.throws(() => decodeExperiment("invalid!"));
});
test("restoring a sorted-search experiment enforces its ascending input prerequisite", () => {
  const experiment = defaultExperiment();
  experiment.data.array = [5, 1, 3, 1];
  assert.deepEqual(validateExperiment(experiment).data.array, [1, 1, 3, 5]);
  experiment.algorithmId = "linear";
  assert.deepEqual(validateExperiment(experiment).data.array, [5, 1, 3, 1]);
});
test("invalid preference saves fall back and clamp text and layout to usable bounds", () => {
  assert.deepEqual(sanitizePreferences(null), defaultPreferences);
  const p = sanitizePreferences({
    theme: "unknown",
    fontSize: 999,
    splitRatio: -4,
    speed: 64,
    showTrace: false,
  });
  assert.equal(p.theme, "system");
  assert.equal(p.fontSize, 160);
  assert.equal(p.splitRatio, 45);
  assert.equal(p.speed, 1);
  assert.equal(p.showTrace, false);
});

test("new search sections preserve leaf order, duplicates and choices in files and shared links", () => {
  for (const [category, ids] of [
    ["problem", ["decomposition", "and-or"]],
    ["game", ["game-tree", "minimax", "alpha-beta"]],
  ] as const) {
    for (const algorithmId of ids) {
      const experiment = defaultExperiment();
      experiment.category = category;
      experiment.algorithmId = algorithmId;
      experiment.selections[category] = algorithmId;
      experiment.data[category] = [-3, 5, 5, 0, -1];
      assert.deepEqual(parseExperiment(JSON.stringify(experiment)), experiment);
      assert.deepEqual(decodeExperiment(encodeExperiment(experiment)), experiment);
      assert.throws(() =>
        validateExperiment({ ...experiment, data: { ...experiment.data, [category]: [] } }),
      );
      assert.throws(() =>
        validateExperiment({ ...experiment, data: { ...experiment.data, [category]: null } }),
      );
      assert.throws(() =>
        validateExperiment({ ...experiment, data: { ...experiment.data, [category]: [1.5] } }),
      );
      assert.throws(() =>
        validateExperiment({
          ...experiment,
          data: { ...experiment.data, [category]: Array(33).fill(1) },
        }),
      );
    }
  }
});

test("older version 1 saves gain default problem and game data without losing existing work", () => {
  const previous = defaultExperiment();
  const { problem: _problem, game: _game, ...data } = previous.data;
  const restored = validateExperiment({
    ...previous,
    data,
    selections: { array: "binary", maze: "bfs", tree: "bst", sort: "bubble" },
  });
  assert.deepEqual(restored, previous);
  assert.notEqual(restored.data.game, previous.data.game);
  assert.throws(() => validateExperiment({ ...previous, category: "game", algorithmId: "and-or" }));
});
