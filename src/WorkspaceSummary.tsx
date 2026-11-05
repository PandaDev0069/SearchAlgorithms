import type { LucideIcon } from "lucide-react";
import type { Category, Frame } from "./algorithms";

export function Stat({
  icon: Icon,
  label,
  value,
  unit = "",
  detail,
  status = false,
}: {
  icon: LucideIcon;
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

export function TraceChart({
  frames,
  category,
  onSeek,
}: {
  frames: Frame[];
  category: Category;
  onSeek: (n: number) => void;
}) {
  const maximumComparisons = Math.max(1, ...frames.map((frame) => frame.comparisons));
  const width = 880;
  const height = 180;
  const padding = 32;
  const x = (index: number) =>
    padding + (index * (width - 2 * padding)) / Math.max(1, frames.length - 1);
  const y = (v: number) => height - padding - (v * (height - 2 * padding)) / maximumComparisons;
  // Bound the SVG size while the downloadable CSV retains every recorded step.
  const stride = Math.max(1, Math.ceil(frames.length / 300));
  const samples = frames.flatMap((frame, index) =>
    index % stride === 0 || index === frames.length - 1 ? [{ frame, index }] : [],
  );
  return (
    <div className="trace-chart">
      <span className="chart-axis-label">
        {category === "maze"
          ? "累積訪問回数"
          : category === "problem" || category === "game"
            ? "訪問ノード数"
            : "比較回数"}
        {stride > 1 ? "（代表点を表示・全件はCSVへ）" : ""}
      </span>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="ステップごとの累積比較・訪問回数"
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={padding}
              x2={width - padding}
              y1={y(maximumComparisons * v)}
              y2={y(maximumComparisons * v)}
              className="chart-grid"
            />
            <text x={padding - 8} y={y(maximumComparisons * v) + 4} textAnchor="end">
              {Math.round(maximumComparisons * v)}
            </text>
          </g>
        ))}
        <path
          d={`M ${padding},${height - padding} ${samples.map(({ frame, index }) => `L ${x(index)},${y(frame.comparisons)}`).join(" ")} L ${x(frames.length - 1)},${height - padding} Z`}
          fill="#eef5df"
        />
        <polyline
          points={samples
            .map(({ frame, index }) => `${x(index)},${y(frame.comparisons)}`)
            .join(" ")}
          fill="none"
          stroke="#76964a"
          strokeWidth="2.5"
        />
        {samples.map(({ frame, index }) => (
          <g
            key={index}
            role="button"
            tabIndex={0}
            aria-label={`ステップ ${index}：${frame.comparisons} 回`}
            onClick={() => onSeek(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSeek(index);
              }
            }}
          >
            <circle
              cx={x(index)}
              cy={y(frame.comparisons)}
              r={frames.length > 70 ? 2 : 4}
              fill={index === frames.length - 1 ? "#e49c48" : "#76964a"}
            />
            {(frames.length < 18 || index === frames.length - 1) && (
              <text x={x(index)} y={height - 8} textAnchor="middle">
                {index}
              </text>
            )}
          </g>
        ))}
      </svg>
      <span className="chart-bottom-label">ステップ →</span>
    </div>
  );
}
