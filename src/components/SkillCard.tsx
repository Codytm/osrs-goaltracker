import { useState } from 'react';
import type { Skill, Goal } from '../types';
import { xpToNextLevel, formatXp } from '../types';
import './SkillCard.css';

interface Props {
  skill: Skill;
  goals: Goal[];
  onAddGoal: (skill: Skill) => void;
}

export default function SkillCard({ skill, goals, onAddGoal }: Props) {
  const [hovered, setHovered] = useState(false);
  const progress = xpToNextLevel(skill.xp);
  const pct = skill.level >= 99 ? 100 : Math.round((progress.current / progress.needed) * 100);

  const skillGoals = goals.filter(
    g => g.type === 'skill' && g.targetName === skill.name
  );

  const isMaxed = skill.level >= 99;

  return (
    <div
      className={`skill-card ${hovered ? 'skill-card--hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onAddGoal(skill)}
      title={`Click to set a goal for ${skill.name}`}
    >
      <div className="skill-card__name">{skill.name}</div>
      <div className={`skill-card__level ${isMaxed ? 'skill-card__level--maxed' : ''}`}>
        {skill.level}
      </div>

      {/* XP progress bar toward next level */}
      {!isMaxed && (
        <div className="skill-card__bar" title={`${formatXp(progress.current)} / ${formatXp(progress.needed)} xp to level ${skill.level + 1}`}>
          <div className="skill-card__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Goal indicators */}
      {skillGoals.length > 0 && (
        <div className="skill-card__goals">
          {skillGoals.map(goal => {
            const currentVal = goal.targetType === 'level' ? skill.level : skill.xp;
            const goalPct = Math.min(
              100,
              Math.round(
                ((currentVal - goal.baselineValue) /
                  (goal.targetValue - goal.baselineValue)) * 100
              )
            );
            const done = currentVal >= goal.targetValue;
            return (
              <div key={goal.id} className={`skill-card__goal-pip ${done ? 'skill-card__goal-pip--done' : ''}`}
                   title={`Goal: ${goal.targetType === 'level' ? `Level ${goal.targetValue}` : formatXp(goal.targetValue) + ' xp'} (${goalPct}%)`} />
            );
          })}
        </div>
      )}

      {/* Tooltip on hover */}
      {hovered && (
        <div className="skill-card__tooltip">
          <div><span className="dim">XP</span> {skill.xp.toLocaleString()}</div>
          {!isMaxed && (
            <div><span className="dim">To next</span> {(progress.needed - progress.current).toLocaleString()}</div>
          )}
          <div><span className="dim">Rank</span> {skill.rank.toLocaleString()}</div>
          {skillGoals.length > 0 && <div className="dim mt">{skillGoals.length} goal{skillGoals.length > 1 ? 's' : ''} active</div>}
          <div className="dim mt">Click to add goal</div>
        </div>
      )}
    </div>
  );
}
