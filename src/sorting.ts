import type { AlgorithmId, Frame } from "./algorithmTypes";
import { createFrame } from "./frames";

export const defaultSort = [42, 17, 71, 8, 56, 23, 92, 34, 63, 12, 85, 49];

type Compare = (left: number, right: number, line: number) => number;
type Swap = (left: number, right: number, line: number) => void;

/**
 * @param id Sorting strategy to demonstrate.
 * @param input Values to sort; the original array is left unchanged.
 * @returns Snapshots of each comparison and swap, followed by the sorted result.
 */
export function sortFrames(id: AlgorithmId, input: number[]): Frame[] {
  const values = [...input];
  const frames = [
    {
      ...createFrame(values),
      message: "数値を小さい順に並べ替えます。比較と交換の動きを観察しましょう。",
    },
  ];
  let comparisons = 0;
  let swaps = 0;

  function record(active: number[], line: number, message: string) {
    frames.push({ ...createFrame(values), active, comparisons, swaps, line, message });
  }

  const compare: Compare = (left, right, line) => {
    comparisons++;
    record([left, right], line, `${values[left]} と ${values[right]} を比較します。`);
    return values[left] - values[right];
  };

  const swap: Swap = (left, right, line) => {
    if (left === right) {
      return;
    }

    [values[left], values[right]] = [values[right], values[left]];
    swaps++;
    record([left, right], line, `位置 ${left} と ${right} の値を交換しました。`);
  };

  switch (id) {
    case "bubble":
      bubbleSort(values.length, compare, swap);
      break;
    case "selection":
      selectionSort(values.length, compare, swap);
      break;
    case "insertion":
      insertionSort(values.length, compare, swap);
      break;
    default:
      quickSort(values.length, compare, swap);
  }

  frames.push({
    ...createFrame(values),
    found: values.map((_, index) => index),
    comparisons,
    swaps,
    line: -1,
    result: "complete",
    message: `整列が完了しました！ 比較 ${comparisons} 回、交換 ${swaps} 回。`,
  });
  return frames;
}

function bubbleSort(length: number, compare: Compare, swap: Swap) {
  for (let end = length - 1; end > 0; end--) {
    let changed = false;

    for (let index = 0; index < end; index++) {
      if (compare(index, index + 1, 3) > 0) {
        swap(index, index + 1, 4);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }
}

function selectionSort(length: number, compare: Compare, swap: Swap) {
  for (let start = 0; start < length - 1; start++) {
    let minimum = start;

    for (let index = start + 1; index < length; index++) {
      if (compare(index, minimum, 3) < 0) {
        minimum = index;
      }
    }

    swap(start, minimum, 5);
  }
}

function insertionSort(length: number, compare: Compare, swap: Swap) {
  for (let index = 1; index < length; index++) {
    let position = index;

    while (position > 0) {
      if (compare(position - 1, position, 3) <= 0) {
        break;
      }
      swap(position - 1, position, 4);
      position--;
    }
  }
}

function quickSort(length: number, compare: Compare, swap: Swap) {
  const pending: [number, number][] = length > 1 ? [[0, length - 1]] : [];

  while (pending.length) {
    const [left, right] = pending.pop()!;
    const pivot = partition(left, right, compare, swap);

    // Push the right partition first to preserve a left-to-right playback order.
    if (pivot + 1 < right) {
      pending.push([pivot + 1, right]);
    }
    if (left < pivot - 1) {
      pending.push([left, pivot - 1]);
    }
  }
}

function partition(left: number, right: number, compare: Compare, swap: Swap): number {
  let pivot = left;

  for (let index = left; index < right; index++) {
    if (compare(index, right, 5) < 0) {
      swap(pivot, index, 6);
      pivot++;
    }
  }

  swap(pivot, right, 7);
  return pivot;
}
