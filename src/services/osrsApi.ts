import type { PlayerData, Skill, BossKc } from '../types';

// The official hiscores endpoint does not allow browser requests. Public CORS
// proxies were dropping lookups. Wise Old Man fetches hiscores server-side and
// allows browser access, and it keeps the last snapshot when a refresh is slow.
const WOM_BASE = 'https://api.wiseoldman.net/v2';

// A snapshot checked within this window is recent enough to show immediately.
const FRESH_MS = 20 * 60 * 1000;

const SKILL_LABELS: Record<string, string> = {
  overall: 'Overall',
  attack: 'Attack',
  defence: 'Defence',
  strength: 'Strength',
  hitpoints: 'Hitpoints',
  ranged: 'Ranged',
  prayer: 'Prayer',
  magic: 'Magic',
  cooking: 'Cooking',
  woodcutting: 'Woodcutting',
  fletching: 'Fletching',
  fishing: 'Fishing',
  firemaking: 'Firemaking',
  crafting: 'Crafting',
  smithing: 'Smithing',
  mining: 'Mining',
  herblore: 'Herblore',
  agility: 'Agility',
  thieving: 'Thieving',
  slayer: 'Slayer',
  farming: 'Farming',
  runecrafting: 'Runecraft',
  hunter: 'Hunter',
  construction: 'Construction',
  sailing: 'Sailing',
};

// Keys are Wise Old Man metric ids. Labels match names already stored on goals.
const BOSS_LABELS: Record<string, string> = {
  abyssal_sire: 'Abyssal Sire',
  alchemical_hydra: 'Alchemical Hydra',
  amoxliatl: 'Amoxliatl',
  araxxor: 'Araxxor',
  artio: 'Artio',
  barrows_chests: 'Barrows Chests',
  brutus: 'Brutus',
  bryophyta: 'Bryophyta',
  callisto: 'Callisto',
  calvarion: "Cal'varion",
  cerberus: 'Cerberus',
  chambers_of_xeric: 'Chambers of Xeric',
  chambers_of_xeric_challenge_mode: 'Chambers of Xeric: Challenge Mode',
  chaos_elemental: 'Chaos Elemental',
  chaos_fanatic: 'Chaos Fanatic',
  commander_zilyana: 'Commander Zilyana',
  corporeal_beast: 'Corporeal Beast',
  crazy_archaeologist: 'Crazy Archaeologist',
  dagannoth_prime: 'Dagannoth Prime',
  dagannoth_rex: 'Dagannoth Rex',
  dagannoth_supreme: 'Dagannoth Supreme',
  deranged_archaeologist: 'Deranged Archaeologist',
  doom_of_mokhaiotl: 'Doom of Mokhaiotl',
  duke_sucellus: 'Duke Sucellus',
  general_graardor: 'General Graardor',
  giant_mole: 'Giant Mole',
  grotesque_guardians: 'Grotesque Guardians',
  hespori: 'Hespori',
  kalphite_queen: 'Kalphite Queen',
  king_black_dragon: 'King Black Dragon',
  kraken: 'Kraken',
  kreearra: "Kree'Arra",
  kril_tsutsaroth: "K'ril Tsutsaroth",
  lunar_chests: 'Lunar Chests',
  mad_angel: 'Mad Angel',
  maggot_king: 'Maggot King',
  mimic: 'Mimic',
  nex: 'Nex',
  nightmare: 'Nightmare',
  phosanis_nightmare: "Phosani's Nightmare",
  obor: 'Obor',
  phantom_muspah: 'Phantom Muspah',
  sarachnis: 'Sarachnis',
  scorpia: 'Scorpia',
  scurrius: 'Scurrius',
  shellbane_gryphon: 'Shellbane Gryphon',
  skotizo: 'Skotizo',
  sol_heredit: 'Sol Heredit',
  spindel: 'Spindel',
  tempoross: 'Tempoross',
  the_gauntlet: 'The Gauntlet',
  the_corrupted_gauntlet: 'The Corrupted Gauntlet',
  the_fractured_archive: 'The Fractured Archive',
  the_hueycoatl: 'The Hueycoatl',
  the_leviathan: 'The Leviathan',
  the_royal_titans: 'The Royal Titans',
  the_whisperer: 'The Whisperer',
  theatre_of_blood: 'Theatre of Blood',
  theatre_of_blood_hard_mode: 'Theatre of Blood: Hard Mode',
  thermonuclear_smoke_devil: 'Thermonuclear Smoke Devil',
  tombs_of_amascut: 'Tombs of Amascut',
  tombs_of_amascut_expert: 'Tombs of Amascut: Expert Mode',
  tzkal_zuk: 'TzKal-Zuk',
  tztok_jad: 'TzTok-Jad',
  vardorvis: 'Vardorvis',
  venenatis: 'Venenatis',
  vetion: "Vet'ion",
  vorkath: 'Vorkath',
  wintertodt: 'Wintertodt',
  yama: 'Yama',
  zalcano: 'Zalcano',
  zulrah: 'Zulrah',
};

export interface FetchPlayerResult {
  player: PlayerData;
  notice: string | null;
}

interface WomSkill {
  experience: number;
  rank: number;
  level: number;
}

interface WomBoss {
  kills: number;
  rank: number;
}

interface WomPlayer {
  username: string;
  displayName: string;
  updatedAt: string;
  latestSnapshot: {
    createdAt: string;
    data: {
      skills: Record<string, WomSkill>;
      bosses: Record<string, WomBoss>;
    };
  } | null;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function titleCaseMetric(metric: string): string {
  return metric.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function bossName(metric: string): string {
  return BOSS_LABELS[metric] ?? titleCaseMetric(metric);
}

function formatWhen(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function isFresh(player: WomPlayer): boolean {
  return Date.now() - new Date(player.updatedAt).getTime() < FRESH_MS;
}

async function readMessage(res: Response): Promise<string> {
  try {
    const body = await res.json() as { message?: string };
    if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
  } catch {
    // Response was not JSON.
  }
  return `Wise Old Man returned HTTP ${res.status}.`;
}

function friendlyLookupError(message: string, username: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('not found') || lower.includes('hiscore') || lower.includes('could not find')) {
    return `No hiscores data for "${username}". Check the spelling so it matches the account.`;
  }
  return message;
}

async function womFetch(url: string, init: RequestInit, timeoutMs: number, attempts: number): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { Accept: 'application/json', ...init.headers },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.status >= 500) {
        lastError = new Error(`Wise Old Man returned HTTP ${res.status}.`);
        await sleep(1000 * (attempt + 1));
        continue;
      }

      return res;
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      lastError = name === 'TimeoutError' || name === 'AbortError'
        ? new Error('The hiscores lookup timed out.')
        : new Error('Could not reach Wise Old Man. Check your connection and try again.');
      await sleep(1000 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('Could not reach Wise Old Man.');
}

async function getDetails(username: string): Promise<WomPlayer | null> {
  const res = await womFetch(
    `${WOM_BASE}/players/${encodeURIComponent(username)}`,
    { method: 'GET' },
    20_000,
    3,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await readMessage(res));
  return res.json() as Promise<WomPlayer>;
}

async function updateDetails(username: string): Promise<WomPlayer> {
  const res = await womFetch(
    `${WOM_BASE}/players/${encodeURIComponent(username)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
    60_000,
    2,
  );

  if (!res.ok) {
    const message = await readMessage(res);
    if (res.status === 429) throw new Error(message || 'Wise Old Man is rate limiting refreshes. Try again shortly.');
    throw new Error(friendlyLookupError(message, username));
  }

  const player = await res.json() as WomPlayer;
  if (!player.latestSnapshot) {
    throw new Error('Hiscores lookup finished without stats. Try again in a moment.');
  }
  return player;
}

function toPlayerData(player: WomPlayer): PlayerData {
  const snapshot = player.latestSnapshot;
  if (!snapshot) throw new Error('No stats available for that player yet.');

  const skills: Record<string, Skill> = {};
  let id = 0;
  for (const [metric, raw] of Object.entries(snapshot.data.skills)) {
    const name = SKILL_LABELS[metric] ?? titleCaseMetric(metric);
    skills[name] = {
      id: id++,
      name,
      rank: Math.max(0, raw.rank ?? 0),
      level: raw.level > 0 ? raw.level : 1,
      xp: Math.max(0, raw.experience ?? 0),
    };
  }

  const bosses: Record<string, BossKc> = {};
  for (const [metric, raw] of Object.entries(snapshot.data.bosses)) {
    if (raw.kills <= 0) continue;
    const name = bossName(metric);
    bosses[name] = {
      name,
      rank: Math.max(0, raw.rank ?? 0),
      kills: raw.kills,
    };
  }

  return {
    username: player.displayName || player.username,
    fetchedAt: new Date(snapshot.createdAt).getTime(),
    skills,
    bosses,
  };
}

export async function fetchPlayer(
  username: string,
  onStatus?: (message: string) => void,
): Promise<FetchPlayerResult> {
  const name = username.trim().replace(/\s+/g, ' ');
  if (!name) throw new Error('Enter a player name.');

  onStatus?.('Looking up player…');
  const existing = await getDetails(name);

  if (existing?.latestSnapshot && isFresh(existing)) {
    return { player: toPlayerData(existing), notice: null };
  }

  onStatus?.(
    existing
      ? 'Refreshing from the hiscores. This can take a little while…'
      : 'Looking this player up on the hiscores. This can take a little while…',
  );

  try {
    const updated = await updateDetails(name);
    return { player: toPlayerData(updated), notice: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'the refresh did not finish';
    const fallback = existing?.latestSnapshot ? existing : await getDetails(name).catch(() => null);
    if (fallback?.latestSnapshot) {
      return {
        player: toPlayerData(fallback),
        notice: `Showing stats from ${formatWhen(fallback.updatedAt)}. Live refresh unavailable: ${reason}`,
      };
    }
    throw error instanceof Error ? error : new Error('Failed to fetch player data.');
  }
}
