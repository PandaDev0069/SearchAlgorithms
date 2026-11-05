import { algorithms } from "./algorithmCatalog";
import type { AlgorithmId, Frame } from "./algorithmTypes";
import { createFrame } from "./frames";

export const defaultArray = [3, 8, 12, 17, 23, 28, 34, 42, 49, 56, 63, 71, 78, 85, 92];

type Probe = (index: number, line: number, left?: number, right?: number) => boolean;

/**
 * Record an array search without changing its input.
 * @param id Search strategy; all strategies except linear require ascending values.
 * @param array Values to search.
 * @param target Value to find.
 * @returns Playback snapshots ending in a match or a missing result.
 */
export function searchFrames(id: AlgorithmId, array: number[], target: number): Frame[] {
  const frames: Frame[] = [createFrame(array)];
  const visited: number[] = [];
  let comparisons = 0;

  const probe: Probe = (index, line, left, right) => {
    comparisons++;
    const value = array[index];
    const match = value === target;

    frames.push({
      ...createFrame(array),
      active: [index],
      visited: [...visited],
      found: match ? [index] : [],
      comparisons,
      left,
      right,
      mid: index,
      line,
      result: match ? "found" : undefined,
      message: match
        ? `a[${index}] = ${value}。目標の ${target} が見つかりました！`
        : `a[${index}] = ${value} と ${target} を比較。${value < target ? "目標より小さい値です。" : "目標より大きい値です。"}`,
    });

    // Capture the comparison before marking this index as previously visited.
    if (!visited.includes(index)) {
      visited.push(index);
    }
    return match;
  };

  let found: boolean;
  switch (id) {
    case "linear":
      found = linearSearch(array.length, probe);
      break;
    case "binary":
      found = binarySearch(array, target, probe);
      break;
    case "jump":
      found = jumpSearch(array, target, probe);
      break;
    default:
      found = interpolationSearch(array, target, probe);
  }

  if (found) {
    return frames;
  }

  frames.push({
    ...createFrame(array),
    visited: [...visited],
    comparisons,
    line: (algorithms.find((a) => a.id === id)?.code.length ?? 1) - 1,
    result: "missing",
    message: `${target} は配列内にありません。探索が終了しました。`,
  });
  return frames;
}

function linearSearch(length: number, probe: Probe): boolean {
  for (let index = 0; index < length; index++) {
    if (probe(index, 2)) {
      return true;
    }
  }
  return false;
}

function binarySearch(array: number[], target: number, probe: Probe): boolean {
  let left = 0;
  let right = array.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    if (probe(middle, 4, left, right)) {
      return true;
    }

    if (array[middle] < target) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }
  return false;
}

function jumpSearch(array: number[], target: number, probe: Probe): boolean {
  const step = Math.max(1, Math.floor(Math.sqrt(array.length)));
  let start = 0;
  let end = Math.min(step - 1, array.length - 1);

  while (start < array.length) {
    if (probe(end, 3, start, end)) {
      return true;
    }

    if (array[end] >= target) {
      for (let index = start; index < end; index++) {
        if (probe(index, 7, start, end)) {
          return true;
        }
      }
      break;
    }

    start = end + 1;
    end = Math.min(end + step, array.length - 1);
  }
  return false;
}

function interpolationSearch(array: number[], target: number, probe: Probe): boolean {
  let left = 0;
  let right = array.length - 1;

  while (left <= right && target >= array[left] && target <= array[right]) {
    // Equal endpoints need no estimate and would otherwise divide by zero.
    const position =
      array[left] === array[right]
        ? left
        : left +
          Math.floor(((target - array[left]) * (right - left)) / (array[right] - array[left]));
    if (probe(position, 6, left, right)) {
      return true;
    }

    if (array[position] < target) {
      left = position + 1;
    } else {
      right = position - 1;
    }
  }
  return false;
}

/**
 * @param raw Integers separated by whitespace, commas, or Japanese commas.
 * @param max Maximum number of accepted values.
 * @returns Parsed integers between −999 and 999; throws for invalid input.
 */
export function parseValues(raw: string, max = 32): number[] {
  const parts = raw
    .trim()
    .split(/[\s,、，]+/)
    .filter(Boolean);
  if (parts.length < 1 || parts.length > max) {
    throw new Error(`数値を 1〜${max} 個入力してください。`);
  }
  const values = parts.map(Number);
  if (values.some((v) => !Number.isInteger(v) || Math.abs(v) > 999)) {
    throw new Error("−999〜999 の整数を、カンマまたは空白で区切って入力してください。");
  }
  return values;
}
