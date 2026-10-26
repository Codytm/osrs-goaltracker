import { useId, useState, type MouseEvent } from 'react';
import type { ChartRange, TimelinePoint } from '../services/osrsApi';

interface Props {
  points: TimelinePoint[];
  range: ChartRange;
  formatValue: (value: number) => string;
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 72 };

function formatTick(date: number, range: ChartRange): string {
  const d = new Date(date);
  if (range === 'day') return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (range === 'week' || range === 'month') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function formatTooltipDate(date: number, range: ChartRange): string {
  const d = new Date(date);
  if (range === 'day') {
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAxis(value: number, span: number): string {
  const abs = Math.abs(span);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}b`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2)}m`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}k`;
  return Math.round(value).toLocaleString();
}

function yDomain(points: TimelinePoint[]): { lo: number; hi: number } {
  const values = points.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.02;
    return { lo: Math.max(0, min - pad), hi: max + pad };
  }
  const pad = (max - min) * 0.08;
  return { lo: Math.max(0, min - pad), hi: max + pad };
}

export default function HistoryChart({ points, range, formatValue }: Props) {
  const gradientId = `history-fill-${useId().replace(/:/g, '')}`;
  const [hover, setHover] = useState<number | null>(null);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const { lo, hi } = yDomain(points);
  const t0 = points[0].date;
  const t1 = points[points.length - 1].date;
  const spanT = t1 - t0;

  const coords = points.map((point, index) => {
    const xRatio = spanT === 0
      ? (points.length === 1 ? 0.5 : index / (points.length - 1))
      : (point.date - t0) / spanT;
    const yRatio = hi === lo ? 0.5 : (point.value - lo) / (hi - lo);
    return {
      x: PAD.left + xRatio * innerW,
      y: PAD.top + (1 - yRatio) * innerH,
    };
  });

  const line = coords.map(coord => `${coord.x},${coord.y}`).join(' ');
  const baseline = PAD.top + innerH;
  const area = `M ${coords[0].x} ${baseline} L ${coords.map(coord => `${coord.x} ${coord.y}`).join(' L ')} L ${coords[coords.length - 1].x} ${baseline} Z`;

  const yTicks = [0, 1, 2, 3].map(step => lo + ((hi - lo) * step) / 3);
  const labelCount = Math.min(4, points.length);
  const labelIndexes = [...new Set(
    Array.from({ length: labelCount }, (_, index) =>
      Math.round((index * (points.length - 1)) / Math.max(1, labelCount - 1)),
    ),
  )];

  const onMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let nearestDist = Infinity;
    coords.forEach((coord, index) => {
      const dist = Math.abs(coord.x - x);
      if (dist < nearestDist) {
        nearest = index;
        nearestDist = dist;
      }
    });
    setHover(nearest);
  };

  const active = hover == null ? null : coords[hover];

  return (
    <div className="history-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="History chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8c96a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e8c96a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, index) => {
          const y = PAD.top + (1 - (hi === lo ? 0.5 : (tick - lo) / (hi - lo))) * innerH;
          return (
            <g key={index}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} className="history-chart__grid" />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="history-chart__label">
                {formatAxis(tick, hi - lo)}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradientId})`} />
        <polyline points={line} className="history-chart__line" />
        {points.length === 1 && (
          <circle cx={coords[0].x} cy={coords[0].y} r="4" className="history-chart__dot" />
        )}

        {labelIndexes.map((pointIndex, labelIndex) => {
          const anchor = labelIndex === 0 ? 'start' : labelIndex === labelIndexes.length - 1 ? 'end' : 'middle';
          return (
            <text
              key={`${points[pointIndex].date}-${pointIndex}`}
              x={coords[pointIndex].x}
              y={H - 8}
              textAnchor={anchor}
              className="history-chart__label"
            >
              {formatTick(points[pointIndex].date, range)}
            </text>
          );
        })}

        {active && hover != null && (
          <>
            <line x1={active.x} y1={PAD.top} x2={active.x} y2={baseline} className="history-chart__cursor" />
            <circle cx={active.x} cy={active.y} r="4" className="history-chart__dot" />
          </>
        )}
      </svg>

      {active && hover != null && (
        <div className="history-chart__tip" style={{ left: `${(active.x / W) * 100}%` }}>
          <strong>{formatValue(points[hover].value)}</strong>
          <span>{formatTooltipDate(points[hover].date, range)}</span>
        </div>
      )}
    </div>
  );
}
