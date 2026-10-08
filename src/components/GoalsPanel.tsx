import type { Goal, PlayerData } from '../types';
import { formatXp, formatNumber } from '../types';
import './GoalsPanel.css';

interface Props {
  goals: Goal[];
  player: PlayerData;
  onRemove: (id: string) => void;
  onAddGoal: () => void;
}

function getProgress(goal: Goal, player: PlayerData): { current: number; pct: number; done: boolean } {
  let current = 0;
  if (goal.type === 'skill') {
    const skill = player.skills[goal.targetName];
    if (!skill) return { current: 0, pct: 0, done: false };
    current = goal.targetType === 'level' ? skill.level : skill.xp;
  } else {
    current = player.bosses[goal.targetName]?.kills ?? goal.baselineValue;
  }
  const range = goal.targetValue - goal.baselineValue;
  const gained = current - goal.baselineValue;
  const pct = range <= 0 ? 0 : Math.min(100, Math.round((gained / range) * 100));
  return { current, pct, done: current >= goal.targetValue };
}

function formatVal(goal: Goal, val: number): string {
  if (goal.targetType === 'xp') return formatXp(val);
  return formatNumber(val);
}

export default function GoalsPanel({ goals, player, onRemove, onAddGoal }: Props) {
  if (goals.length === 0) {
    return (
      <section className="goals-section">
        <div className="goals-section__header">
          <h2>Goals</h2>
          <button className="btn-add" onClick={onAddGoal}>+ Add Goal</button>
        </div>
        <div className="goals-empty">
          <p>No goals yet.</p>
          <p className="dim">Click a skill above or use the button to set your first goal.</p>
        </div>
      </section>
    );
  }

  const active = goals.filter(g => !getProgress(g, player).done);
  const done = goals.filter(g => getProgress(g, player).done);

  return (
    <section className="goals-section">
      <div className="goals-section__header">
        <h2>Goals</h2>
        <button className="btn-add" onClick={onAddGoal}>+ Add Goal</button>
      </div>

      <div className="goals-list">
        {active.map(goal => {
          const { current, pct } = getProgress(goal, player);
          return (
            <div key={goal.id} className="goal-card">
              <div className="goal-card__top">
                <div className="goal-card__info">
                  <span className="goal-card__name">{goal.targetName}</span>
                  <span className="goal-card__type">
                    {goal.targetType === 'level' ? 'Level' : goal.targetType === 'xp' ? 'XP' : 'KC'}
                  </span>
                  <span className="goal-card__target">
                    {formatVal(goal, current)} → {formatVal(goal, goal.targetValue)}
                  </span>
                </div>
                <div className="goal-card__pct">{pct}%</div>
                <button className="goal-card__remove" onClick={() => onRemove(goal.id)} title="Remove goal">✕</button>
              </div>

              <div className="goal-card__bar">
                <div className="goal-card__bar-fill" style={{ width: `${pct}%` }} />
              </div>

              {goal.note && <div className="goal-card__note">{goal.note}</div>}
            </div>
          );
        })}

        {done.length > 0 && (
          <>
            <div className="goals-divider">Completed</div>
            {done.map(goal => {
              const { current } = getProgress(goal, player);
              return (
                <div key={goal.id} className="goal-card goal-card--done">
                  <div className="goal-card__top">
                    <div className="goal-card__info">
                      <span className="goal-card__name">{goal.targetName}</span>
                      <span className="goal-card__type done">✓</span>
                      <span className="goal-card__target">{formatVal(goal, current)} / {formatVal(goal, goal.targetValue)}</span>
                    </div>
                    <button className="goal-card__remove" onClick={() => onRemove(goal.id)} title="Remove">✕</button>
                  </div>
                  <div className="goal-card__bar">
                    <div className="goal-card__bar-fill goal-card__bar-fill--done" style={{ width: '100%' }} />
                  </div>
                  {goal.note && <div className="goal-card__note">{goal.note}</div>}
                </div>
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
