import type { PlayerData, Goal } from '../types';
import { formatNumber } from '../types';
import './BossesPanel.css';

interface Props {
  player: PlayerData;
  goals: Goal[];
  onAddGoal: (bossName: string) => void;
}

export default function BossesPanel({ player, goals, onAddGoal }: Props) {
  const bossEntries = Object.values(player.bosses).sort((a, b) => b.kills - a.kills);

  if (bossEntries.length === 0) {
    return (
      <section className="bosses-section">
        <h2>Boss Kill Counts</h2>
        <div className="bosses-empty">No tracked boss kills found on your account.</div>
      </section>
    );
  }

  return (
    <section className="bosses-section">
      <div className="bosses-section__header">
        <h2>Boss Kill Counts</h2>
        <span className="bosses-section__count">{bossEntries.length} bosses</span>
      </div>
      <div className="bosses-grid">
        {bossEntries.map(boss => {
          const bossGoals = goals.filter(g => g.type === 'boss' && g.targetName === boss.name);
          const hasGoal = bossGoals.length > 0;
          return (
            <div
              key={boss.name}
              className={`boss-card ${hasGoal ? 'boss-card--has-goal' : ''}`}
              onClick={() => onAddGoal(boss.name)}
              title="Click to add a KC goal"
            >
              <div className="boss-card__name">{boss.name}</div>
              <div className="boss-card__kc">{formatNumber(boss.kills)}</div>
              <div className="boss-card__rank">#{formatNumber(boss.rank)}</div>
              {hasGoal && (
                <div className="boss-card__goal-pip" title="Goal set" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
