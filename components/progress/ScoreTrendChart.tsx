/**
 * A small hand-rolled SVG line chart for the assessment score trend.
 *
 * The project has no charting library installed, and per the enhancement
 * brief ("do not introduce a large charting library unnecessarily") this
 * intentionally stays dependency-free — it's ~40 lines of SVG math for a
 * single line series, which doesn't justify pulling in recharts/visx.
 */
export function ScoreTrendChart({ points }: { points: { label: string; score: number }[] }) {
  if (points.length === 0) return null;

  const width = 640;
  const height = 160;
  const padding = { top: 16, right: 16, bottom: 24, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH * (1 - p.score / 100),
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padding.bottom} L ${coords[0].x.toFixed(1)} ${height - padding.bottom} Z`;
  const gridLines = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full font-sans" role="img" aria-label="Assessment score trend over time">
      <defs>
        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B9D9F5" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFF9EE" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {gridLines.map((g) => {
        const y = padding.top + innerH * (1 - g / 100);
        return (
          <g key={g}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#D7EAFB" strokeWidth={1} strokeDasharray={g > 0 && g < 100 ? "4 4" : undefined} />
            <text x={padding.left - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="#6C7C91" fontWeight={500}>
              {g}
            </text>
          </g>
        );
      })}

      {coords.length > 1 && (
        <path d={areaPath} fill="url(#trendGradient)" />
      )}
      <path d={linePath} fill="none" stroke="#5A9BD5" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={4.5} fill="#FFFFFF" stroke="#5A9BD5" strokeWidth={2.5} />
          <title>
            {c.label}: {c.score}%
          </title>
        </g>
      ))}
      {coords.map((c, i) =>
        i === 0 || i === coords.length - 1 || coords.length <= 6 ? (
          <text key={`label-${i}`} x={c.x} y={height - 6} textAnchor="middle" fontSize={10} fill="#6C7C91" fontWeight={500}>
            {c.label}
          </text>
        ) : null
      )}
    </svg>
  );
}

