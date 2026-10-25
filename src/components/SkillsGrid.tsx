import type { PlayerData, Goal } from '../types';
import { SKILL_ORDER } from '../types';
import SkillCard from './SkillCard';
import './SkillsGrid.css';

interface Props {
  player: PlayerData;
  goals: Goal[];
  onAddGoal: (skillName: string) => void;
}

export default function SkillsGrid({ player, goals, onAddGoal }: Props) {
  // Total level & XP
  const overall = player.skills['Overall'];

  return (
    <section className="skills-section">
      <div className="skills-section__header">
        <h2>Skills</h2>
        {overall && (
          <div className="skills-section__totals">
            <span><span className="dim">Total level</span> {overall.level.toLocaleString()}</span>
            <span><span className="dim">Total XP</span> {overall.xp.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="skills-grid">
        {[...SKILL_ORDER, ...Object.keys(player.skills).filter(name => !SKILL_ORDER.includes(name))].map(name => {
          const skill = player.skills[name];
          if (!skill) return null;
          return (
            <SkillCard
              key={name}
              skill={skill}
              goals={goals}
              onAddGoal={() => onAddGoal(name)}
            />
          );
        })}
      </div>
    </section>
  );
}
