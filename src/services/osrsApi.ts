import type { PlayerData, Skill, BossKc } from '../types';

const HISCORES_URL = 'https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=';

// Multiple CORS proxies tried in order — if one fails, the next is attempted
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
];

const SKILL_NAMES = [
  'Overall', 'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged',
  'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching', 'Fishing',
  'Firemaking', 'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility',
  'Thieving', 'Slayer', 'Farming', 'Runecraft', 'Hunter', 'Construction',
];

const BOSS_NAMES = [
  'Abyssal Sire', 'Alchemical Hydra', 'Amoxliatl', 'Araxxor',
  'Artio', 'Barrows Chests', 'Brutus', 'Bryophyta',
  'Callisto', 'Cal\'varion', 'Cerberus', 'Chambers of Xeric',
  'Chambers of Xeric: Challenge Mode', 'Chaos Elemental', 'Chaos Fanatic', 'Commander Zilyana',
  'Corporeal Beast', 'Crazy Archaeologist', 'Dagannoth Prime', 'Dagannoth Rex',
  'Dagannoth Supreme', 'Deranged Archaeologist', 'Doom of Mokhaiotl', 'Duke Sucellus',
  'General Graardor', 'Giant Mole', 'Grotesque Guardians', 'Hespori',
  'Kalphite Queen', 'King Black Dragon', 'Kraken', 'Kree\'Arra',
  'K\'ril Tsutsaroth', 'Lunar Chests', 'Mad Angel', 'Maggot King',
  'Mimic', 'Nex', 'Nightmare', 'Phosani\'s Nightmare',
  'Obor', 'Phantom Muspah', 'Sarachnis', 'Scorpia',
  'Scurrius', 'Shellbane Gryphon', 'Skotizo', 'Sol Heredit',
  'Spindel', 'Tempoross', 'The Gauntlet', 'The Corrupted Gauntlet',
  'The Hueycoatl', 'The Leviathan', 'The Royal Titans', 'The Whisperer',
  'Theatre of Blood', 'Theatre of Blood: Hard Mode', 'Thermonuclear Smoke Devil', 'Tombs of Amascut',
  'Tombs of Amascut: Expert Mode', 'TzKal-Zuk', 'TzTok-Jad', 'Vardorvis',
  'Venenatis', 'Vet\'ion', 'Vorkath', 'Wintertodt',
  'Yama', 'Zalcano', 'Zulrah'
];

async function tryFetch(username: string): Promise<string> {
  const targetUrl = HISCORES_URL + encodeURIComponent(username);
  const errors: string[] = [];

  for (const makeProxy of PROXIES) {
    try {
      const proxyUrl = makeProxy(targetUrl);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });

      if (!res.ok) {
        errors.push(`${proxyUrl.split('?')[0]}: HTTP ${res.status}`);
        continue;
      }

      const text = await res.text();

      // Validate: hiscores CSV starts with a number (rank)
      if (!text || !/^\d/.test(text.trim())) {
        errors.push(`${proxyUrl.split('?')[0]}: unexpected response format`);
        continue;
      }

      return text;
    } catch (e) {
      errors.push(`${(e as Error).message}`);
    }
  }

  throw new Error(
    `Could not reach OSRS Hiscores. All proxies failed:\n${errors.join('\n')}\n\nMake sure the username exists and is on the hiscores.`
  );
}

function parseHiscores(text: string, username: string): PlayerData {
  const lines = text.trim().split('\n');

  // --- Skills: first 24 lines, each has 3 values (rank, level, xp) ---
  const skills: Record<string, Skill> = {};
  for (let i = 0; i < SKILL_NAMES.length && i < lines.length; i++) {
    const parts = lines[i].split(',').map(Number);
    const [rank, level, xp] = parts;
    if (!isNaN(rank)) {
      skills[SKILL_NAMES[i]] = { id: i, name: SKILL_NAMES[i], rank, level, xp };
    }
  }

  // --- Bosses: don't hardcode the start line.
  // After the 24 skill lines, the rest are minigames/bosses with 2 values (rank, score).
  // We scan from the end of the file backwards, matching boss names to lines.
  // This is resilient to Jagex adding new minigame rows between skills and bosses.
  const NON_SKILL_START = SKILL_NAMES.length; // line 24 onwards
  const nonSkillLines = lines.slice(NON_SKILL_START);

  // The bosses appear at the END of the non-skill section, in order.
  // Find offset by working out how many non-skill rows exist vs boss rows.
  const bossOffset = nonSkillLines.length - BOSS_NAMES.length;

  const bosses: Record<string, BossKc> = {};
  for (let i = 0; i < BOSS_NAMES.length; i++) {
    const lineIdx = bossOffset + i;
    if (lineIdx < 0 || lineIdx >= nonSkillLines.length) continue;
    const parts = nonSkillLines[lineIdx].split(',').map(Number);
    const [rank, kills] = parts;
    if (!isNaN(rank) && kills > 0) {
      bosses[BOSS_NAMES[i]] = { name: BOSS_NAMES[i], rank, kills };
    }
  }

  return { username, fetchedAt: Date.now(), skills, bosses };
}

export async function fetchPlayer(username: string): Promise<PlayerData> {
  const text = await tryFetch(username);
  return parseHiscores(text, username);
}
