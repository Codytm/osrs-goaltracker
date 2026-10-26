import { useEffect, useState } from 'react';
import type { PlayerData } from '../types';
import { SKILL_ORDER, formatNumber, formatXp } from '../types';
import {
  bossMetric,
  fetchTimeline,
  skillMetric,
  type ChartRange,
  type TimelinePoint,
} from '../services/osrsApi';
import HistoryChart from './HistoryChart';
import './ProgressPanel.css';

interface Props {
  player: PlayerData;
}

const RANGES: { id: ChartRange; label: string }[] = [
  { id: 'day', label: '24 hours' },
  { id: 'week', label: '1 week' },
  { id: 'month', label: '1 month' },
  { id: 'six_months', label: '6 months' },
  { id: 'year', label: '1 year' },
];

function useTimeline(username: string, metric: string | null, range: ChartRange) {
  const [points, setPoints] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(metric != null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metric) {
      setPoints([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPoints([]);

    fetchTimeline(username, metric, range, controller.signal)
      .then(next => {
        if (controller.signal.aborted) return;
        setPoints(next);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setError(error instanceof Error ? error.message : 'Could not load history.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [username, metric, range]);

  return { points, loading, error };
}

function gainedLabel(points: TimelinePoint[], formatValue: (value: number) => string, unit: string): string {
  if (points.length === 0) return 'No snapshots';
  if (points.length === 1) return 'One snapshot';
  const delta = points[points.length - 1].value - points[0].value;
  if (delta === 0) return `No ${unit} change`;
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${formatValue(Math.abs(delta))} ${unit}`;
}

function ChartCard({
  title,
  valueLabel,
  options,
  selected,
  onSelect,
  points,
  loading,
  error,
  range,
  formatValue,
  formatPoint,
  unit,
  empty,
}: {
  title: string;
  valueLabel: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  points: TimelinePoint[];
  loading: boolean;
  error: string | null;
  range: ChartRange;
  formatValue: (value: number) => string;
  formatPoint: (value: number) => string;
  unit: string;
  empty?: string;
}) {
  const delta = points.length >= 2 ? points[points.length - 1].value - points[0].value : 0;
  const deltaClass = delta > 0 ? 'progress-card__gain--up' : delta < 0 ? 'progress-card__gain--down' : '';

  return (
    <section className="progress-card">
      <div className="progress-card__header">
        <div>
          <h2>{title}</h2>
          <p className={`progress-card__gain ${deltaClass}`}>
            {empty ? '—' : loading ? 'Loading…' : gainedLabel(points, formatValue, unit)}
          </p>
        </div>
        {options.length > 0 && (
          <label className="progress-card__picker">
            <span>{valueLabel}</span>
            <select value={selected} onChange={event => onSelect(event.target.value)}>
              {options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="progress-card__plot">
        {empty && <p className="progress-card__status">{empty}</p>}
        {!empty && loading && <p className="progress-card__status">Loading history…</p>}
        {!empty && !loading && error && <p className="progress-card__status progress-card__status--error">{error}</p>}
        {!empty && !loading && !error && points.length === 0 && (
          <p className="progress-card__status">
            No snapshots in this range yet. History starts once Wise Old Man has tracked the account through it.
          </p>
        )}
        {!empty && !loading && !error && points.length > 0 && (
          <HistoryChart points={points} range={range} formatValue={formatPoint} />
        )}
      </div>
      {!empty && !loading && !error && points.length > 1 && (
        <p className="progress-card__meta">{points.length.toLocaleString()} snapshots</p>
      )}
    </section>
  );
}

export default function ProgressPanel({ player }: Props) {
  const [range, setRange] = useState<ChartRange>('week');
  const [skill, setSkill] = useState('Overall');
  const bossNames = Object.values(player.bosses)
    .sort((a, b) => b.kills - a.kills)
    .map(boss => boss.name);
  const [boss, setBoss] = useState(bossNames[0] ?? '');

  useEffect(() => {
    setBoss(bossNames[0] ?? '');
  }, [player.username, bossNames[0]]);

  const skillOptions = ['Overall', ...SKILL_ORDER.filter(name => name !== 'Overall' && player.skills[name])]
    .filter(name => player.skills[name])
    .map(name => ({ value: name, label: name }));

  const xp = useTimeline(player.username, skillMetric(skill), range);
  const kc = useTimeline(player.username, boss ? bossMetric(boss) : null, range);

  return (
    <section className="progress-section">
      <div className="progress-section__toolbar">
        <div className="progress-ranges" role="group" aria-label="History range">
          {RANGES.map(item => (
            <button
              key={item.id}
              type="button"
              className={`progress-ranges__btn ${range === item.id ? 'active' : ''}`}
              aria-pressed={range === item.id}
              onClick={() => setRange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="progress-section__note">Snapshots from Wise Old Man. A range stays empty until the account has been tracked through it.</p>
      </div>

      <ChartCard
        title="Experience"
        valueLabel="Skill"
        options={skillOptions}
        selected={skill}
        onSelect={setSkill}
        points={xp.points}
        loading={xp.loading}
        error={xp.error}
        range={range}
        formatValue={formatXp}
        formatPoint={formatNumber}
        unit="xp"
      />

      <ChartCard
        title="Kill count"
        valueLabel="Boss"
        options={bossNames.map(name => ({ value: name, label: name }))}
        selected={boss}
        onSelect={setBoss}
        points={kc.points}
        loading={kc.loading}
        error={kc.error}
        range={range}
        formatValue={formatNumber}
        formatPoint={formatNumber}
        unit="kc"
        empty={boss ? undefined : 'No boss kills on this account yet.'}
      />
    </section>
  );
}
