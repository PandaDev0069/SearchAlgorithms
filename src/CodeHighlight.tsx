export function CodeHighlight({ line }: { line: string }) {
  return line
    .split(
      /(\b(?:def|for|in|if|elif|else|while|return|and|or|not|is|None|True|False|break)\b|\b\d+\b|\btarget\b)/g,
    )
    .map((part, i) => (
      <span
        key={i}
        className={
          /^(def|for|in|if|elif|else|while|return|and|or|not|is|None|True|False|break)$/.test(part)
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
