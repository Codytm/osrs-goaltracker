import { useState } from 'react';
import type { PlayerData, Goal } from '../types';
import { xpForLevel, formatXp } from '../types';
import './GoalModal.css';

interface Props {
  player: PlayerData;
  prefillSkill?: string;
  prefillBoss?: string;
  onAdd: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function GoalModal({ player, prefillSkill, prefillBoss, onAdd, onClose }: Props) {
  const [type, setType] = useState<'skill' | 'boss'>(prefillBoss ? 'boss' : 'skill');
  const [skillName, setSkillName] = useState(prefillSkill ?? 'Attack');
  const [bossName, setBossName] = useState(prefillBoss ?? Object.keys(player.bosses)[0] ?? '');
  const [targetType, setTargetType] = useState<'level' | 'xp' | 'kc'>('level');
  const [targetValue, setTargetValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const skill = player.skills[skillName];
  const boss = player.bosses[bossName];

  const handleSubmit = () => {
    setError('');
    const val = Number(targetValue);
    if (!targetValue || isNaN(val) || val <= 0) { setError('Enter a valid target value.'); return; }

    if (type === 'skill') {
      if (!skill) { setError('Skill not found.'); return; }
      const currentVal = targetType === 'level' ? skill.level : skill.xp;
      if (targetType === 'level' && (val < 1 || val > 99)) { setError('Level must be 1–99.'); return; }
      if (val <= currentVal) { setError('Target must be higher than your current value.'); return; }

      onAdd({
        type: 'skill',
        targetName: skillName,
        targetType,
        targetValue: targetType === 'level' ? val : val,
        baselineValue: currentVal,
        note: note || undefined,
      });
    } else {
      const currentKc = boss?.kills ?? 0;
      if (val <= currentKc) { setError('Target must be higher than your current KC.'); return; }
      onAdd({
        type: 'boss',
        targetName: bossName,
        targetType: 'kc',
        targetValue: val,
        baselineValue: currentKc,
        note: note || undefined,
      });
    }
    onClose();
  };

  // Smart hint for level → xp conversion
  const xpHint = type === 'skill' && targetType === 'level' && targetValue && skill
    ? `≈ ${formatXp(xpForLevel(Number(targetValue)) - skill.xp)} xp needed`
    : null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal__header">
          <h2>Add Goal</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="modal__body">
          {/* Type toggle */}
          <div className="modal__toggle">
            <button className={type === 'skill' ? 'active' : ''} onClick={() => { setType('skill'); setTargetType('level'); }}>Skill</button>
            <button className={type === 'boss' ? 'active' : ''} onClick={() => { setType('boss'); setTargetType('kc'); }}>Boss KC</button>
          </div>

          {type === 'skill' ? (
            <>
              <label className="modal__label">Skill
                <select value={skillName} onChange={e => setSkillName(e.target.value)}>
                  {Object.keys(player.skills).filter(s => s !== 'Overall').sort().map(s => (
                    <option key={s} value={s}>{s} — Lv {player.skills[s].level}</option>
                  ))}
                </select>
              </label>

              <div className="modal__row">
                <label className="modal__label">Goal type
                  <select value={targetType} onChange={e => setTargetType(e.target.value as 'level' | 'xp')}>
                    <option value="level">Target level</option>
                    <option value="xp">Target XP</option>
                  </select>
                </label>
                <label className="modal__label">Target value
                  <input
                    type="number"
                    value={targetValue}
                    onChange={e => setTargetValue(e.target.value)}
                    placeholder={targetType === 'level' ? 'e.g. 85' : 'e.g. 10000000'}
                  />
                  {xpHint && <span className="modal__hint">{xpHint}</span>}
                </label>
              </div>

              {skill && (
                <div className="modal__current">
                  Current: <strong>Lv {skill.level}</strong> — {skill.xp.toLocaleString()} xp
                </div>
              )}
            </>
          ) : (
            <>
              {Object.keys(player.bosses).length === 0 ? (
                <p className="modal__empty">No boss kills found on your account.</p>
              ) : (
                <>
                  <label className="modal__label">Boss
                    <select value={bossName} onChange={e => setBossName(e.target.value)}>
                      {Object.keys(player.bosses).sort().map(b => (
                        <option key={b} value={b}>{b} — {player.bosses[b].kills.toLocaleString()} kc</option>
                      ))}
                    </select>
                  </label>
                  <label className="modal__label">Target KC
                    <input
                      type="number"
                      value={targetValue}
                      onChange={e => setTargetValue(e.target.value)}
                      placeholder={`e.g. ${((boss?.kills ?? 0) + 100)}`}
                    />
                  </label>
                  {boss && (
                    <div className="modal__current">
                      Current: <strong>{boss.kills.toLocaleString()} KC</strong>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <label className="modal__label">Note (optional)
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. For Barrows gloves" maxLength={100} />
          </label>

          {error && <p className="modal__error">{error}</p>}
        </div>

        <div className="modal__footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-gold" onClick={handleSubmit}>Save Goal</button>
        </div>
      </div>
    </div>
  );
}
