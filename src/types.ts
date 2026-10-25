export interface Skill {
  id: number;
  name: string;
  rank: number;
  level: number;
  xp: number;
}

export interface BossKc {
  name: string;
  rank: number;
  kills: number;
}

export interface PlayerData {
  username: string;
  fetchedAt: number;
  skills: Record<string, Skill>;
  bosses: Record<string, BossKc>;
}

export interface Goal {
  id: string;
  type: 'skill' | 'boss';
  targetName: string;       // skill name or boss name
  targetType: 'level' | 'xp' | 'kc';
  targetValue: number;
  baselineValue: number;    // value when goal was created
  createdAt: number;
  note?: string;
}

export const SKILL_ORDER = [
  'Attack','Hitpoints','Mining',
  'Strength','Agility','Smithing',
  'Defence','Herblore','Fishing',
  'Ranged','Thieving','Cooking',
  'Prayer','Crafting','Firemaking',
  'Magic','Fletching','Woodcutting',
  'Runecraft','Slayer','Farming',
  'Construction','Hunter','Sailing',
  'Overall',
];

export const XP_TABLE: number[] = (() => {
  const t: number[] = [0];
  let pts = 0;
  for (let lvl = 1; lvl < 99; lvl++) {
    pts += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    t.push(Math.floor(pts / 4));
  }
  return t; // index = level-1, value = xp needed for next level
})();

export function xpToLevel(xp: number): number {
  let lvl = 1;
  for (let i = 0; i < XP_TABLE.length; i++) {
    if (xp >= XP_TABLE[i]) lvl = i + 1;
    else break;
  }
  return Math.min(lvl, 99);
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return XP_TABLE[level - 1] ?? XP_TABLE[XP_TABLE.length - 1];
}

export function xpToNextLevel(xp: number): { current: number; needed: number; level: number } {
  const level = xpToLevel(xp);
  if (level >= 99) return { current: xp, needed: xp, level: 99 };
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return {
    level,
    current: xp - currentLevelXp,
    needed: nextLevelXp - currentLevelXp,
  };
}

export function formatXp(xp: number): string {
  if (xp >= 1_000_000) return (xp / 1_000_000).toFixed(1) + 'm';
  if (xp >= 1_000) return (xp / 1_000).toFixed(1) + 'k';
  return xp.toString();
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}
