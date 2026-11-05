import { advancedFrames, type AdvancedId } from "./advancedSearch";
import {
  mazeFrames,
  searchFrames,
  sortFrames,
  treeFrames,
  type Frame,
  type MazeOptions,
} from "./algorithms";
import type { Experiment } from "./experiment";

type ExecutionInput = Pick<
  Experiment,
  "category" | "algorithmId" | "data" | "grid" | "start" | "goal" | "target"
>;

/**
 * @param input Current experiment inputs, with ascending arrays for sorted searches.
 * @param mazeOptions Heuristic weight and traversal limits for pathfinding.
 * @returns The playback trace for the selected algorithm and category.
 */
export function createExecutionFrames(
  input: ExecutionInput,
  mazeOptions: MazeOptions = {},
): Frame[] {
  const { category, algorithmId, data, grid, start, goal, target } = input;

  switch (category) {
    case "maze":
      return mazeFrames(algorithmId, grid, start, goal, undefined, undefined, mazeOptions);
    case "tree":
      return treeFrames(algorithmId, data.tree, target);
    case "sort":
      return sortFrames(algorithmId, data.sort);
    case "problem":
    case "game":
      return advancedFrames(algorithmId as AdvancedId, data[category]);
    case "array":
      return searchFrames(algorithmId, data.array, target);
  }
}
