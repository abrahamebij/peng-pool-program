export interface LeaderboardEntry {
  rank: number;
  playerPubkey: string;
  shorthand: string;
  timeMs: number;
  formattedTime: string;
  wins: number;
  losses: number;
  recordedAt: number;
  isPlayer?: boolean;
}

export interface PoolData {
  roundId: number;
  name: string;
  tokenType: string;
  tokenSymbol: string;
  stake: string;
  entryFeeLamports: number;
  vaultPubkey: string;
  totalPotLamports: number;
  totalPotFormatted: string;
  totalRuns: number;
  totalWins: number;
  totalLosses: number;
  endTime: number;
  timeLeft: string;
  currentLeader: string;
  bestTimeMs: number;
  bestTimeFormatted: string;
  status: string;
  isNative: boolean;
  standings: LeaderboardEntry[];
}

function formatTime(timeMs: number): string {
  const totalSec = Math.floor(timeMs / 1000);
  const remainderMs = Math.floor((timeMs % 1000) / 10);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${remainderMs.toString().padStart(2, "0")}`;
}

function getShorthand(key: string): string {
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function calculateTimeLeft(endTimeSec: number): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const diffSec = Math.max(0, endTimeSec - nowSec);
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  return `${days}d ${hours.toString().padStart(2, "0")}h`;
}

// 7 days from server boot
const oneWeekSec = Math.floor(Date.now() / 1000) + 7 * 86400;

export class PoolStore {
  private pools: Map<number, PoolData> = new Map();

  constructor() {
    this.initializeDefaultPools();
  }

  private initializeDefaultPools() {
    // Round 1: Weekly Sprint Pool (0.05 SOL) - Real clean initial state with zero mock entries
    this.pools.set(1, {
      roundId: 1,
      name: "Weekly Sprint Pool",
      tokenType: "Devnet SOL",
      tokenSymbol: "SOL",
      stake: "0.05 SOL",
      entryFeeLamports: 50_000_000,
      vaultPubkey: "sJy3Qfqi2gSZH2PG8jw9FayenmgN5tmwVSjwYLVwEH6",
      totalPotLamports: 0,
      totalPotFormatted: "0.00 SOL",
      totalRuns: 0,
      totalWins: 0,
      totalLosses: 0,
      endTime: oneWeekSec,
      timeLeft: calculateTimeLeft(oneWeekSec),
      currentLeader: "--",
      bestTimeMs: 0,
      bestTimeFormatted: "--",
      status: "Active",
      isNative: true,
      standings: [],
    });

    // Round 2: High Roller Pool (0.50 SOL) - Separate pool with zero mock entries
    this.pools.set(2, {
      roundId: 2,
      name: "High Roller Pool",
      tokenType: "Devnet SOL",
      tokenSymbol: "SOL",
      stake: "0.50 SOL",
      entryFeeLamports: 500_000_000,
      vaultPubkey: "sJy3Qfqi2gSZH2PG8jw9FayenmgN5tmwVSjwYLVwEH6",
      totalPotLamports: 0,
      totalPotFormatted: "0.00 SOL",
      totalRuns: 0,
      totalWins: 0,
      totalLosses: 0,
      endTime: oneWeekSec + 86400 * 2,
      timeLeft: calculateTimeLeft(oneWeekSec + 86400 * 2),
      currentLeader: "--",
      bestTimeMs: 0,
      bestTimeFormatted: "--",
      status: "Active",
      isNative: true,
      standings: [],
    });

    // Round 3: Clock-In Arcade Pool (0.10 SOL) - Separate pool with zero mock entries
    this.pools.set(3, {
      roundId: 3,
      name: "Clock-In Arcade Pool",
      tokenType: "Devnet SOL",
      tokenSymbol: "SOL",
      stake: "0.10 SOL",
      entryFeeLamports: 100_000_000,
      vaultPubkey: "sJy3Qfqi2gSZH2PG8jw9FayenmgN5tmwVSjwYLVwEH6",
      totalPotLamports: 0,
      totalPotFormatted: "0.00 SOL",
      totalRuns: 0,
      totalWins: 0,
      totalLosses: 0,
      endTime: oneWeekSec - 86400,
      timeLeft: calculateTimeLeft(oneWeekSec - 86400),
      currentLeader: "--",
      bestTimeMs: 0,
      bestTimeFormatted: "--",
      status: "Active",
      isNative: true,
      standings: [],
    });
  }

  getAllPools(): Omit<PoolData, "standings">[] {
    const list: Omit<PoolData, "standings">[] = [];
    for (const pool of this.pools.values()) {
      pool.timeLeft = calculateTimeLeft(pool.endTime);
      const { standings, ...poolSummary } = pool;
      list.push(poolSummary);
    }
    return list;
  }

  getPool(roundId: number): PoolData | undefined {
    const pool = this.pools.get(roundId);
    if (pool) {
      pool.timeLeft = calculateTimeLeft(pool.endTime);
    }
    return pool;
  }

  getStandingsForPool(roundId: number, userPubkey: string = ""): { pool: Omit<PoolData, "standings">; standings: LeaderboardEntry[] } | null {
    const pool = this.pools.get(roundId);
    if (!pool) return null;

    pool.timeLeft = calculateTimeLeft(pool.endTime);

    // Annotate user's entry if present in this pool's standings
    const standingsWithUserFlag = pool.standings.map((entry) => ({
      ...entry,
      isPlayer: userPubkey ? entry.playerPubkey === userPubkey : false,
    }));

    const { standings, ...poolSummary } = pool;
    return {
      pool: poolSummary,
      standings: standingsWithUserFlag,
    };
  }

  recordRunResult(roundId: number, playerPubkey: string, isWin: boolean, timeMs: number): { rank: number; bestTimeMs: number; poolStats: Omit<PoolData, "standings"> } {
    let pool = this.pools.get(roundId);
    if (!pool) {
      pool = this.pools.get(1)!;
      roundId = 1;
    }

    pool.totalRuns += 1;
    if (isWin) {
      pool.totalWins += 1;
    } else {
      pool.totalLosses += 1;
    }

    let existingEntry = pool.standings.find((s) => s.playerPubkey === playerPubkey);

    if (existingEntry) {
      if (isWin) {
        existingEntry.wins += 1;
        if (existingEntry.timeMs === 0 || timeMs < existingEntry.timeMs) {
          existingEntry.timeMs = timeMs;
          existingEntry.formattedTime = formatTime(timeMs);
          existingEntry.recordedAt = Date.now();
        }
      } else {
        existingEntry.losses += 1;
      }
    } else if (isWin && timeMs > 0) {
      existingEntry = {
        rank: pool.standings.length + 1,
        playerPubkey,
        shorthand: getShorthand(playerPubkey),
        timeMs,
        formattedTime: formatTime(timeMs),
        wins: 1,
        losses: 0,
        recordedAt: Date.now(),
      };
      pool.standings.push(existingEntry);
    }

    // Re-sort standings by lowest time ascending (rank 1 = fastest)
    pool.standings.sort((a, b) => a.timeMs - b.timeMs);

    // Re-index ranks 1..50
    pool.standings = pool.standings.slice(0, 50);
    pool.standings.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // Update pool best record
    if (pool.standings.length > 0) {
      pool.bestTimeMs = pool.standings[0].timeMs;
      pool.bestTimeFormatted = pool.standings[0].formattedTime;
      pool.currentLeader = pool.standings[0].shorthand;
    }

    const playerRank = existingEntry ? existingEntry.rank : -1;
    const { standings, ...poolSummary } = pool;

    return {
      rank: playerRank,
      bestTimeMs: pool.bestTimeMs,
      poolStats: poolSummary,
    };
  }

  recordPoolEntry(roundId: number, playerPubkey: string, _txSignature: string = ""): boolean {
    const pool = this.pools.get(roundId);
    if (!pool) return false;

    // Add entry fee to pool pot
    pool.totalPotLamports += pool.entryFeeLamports;
    const solVal = (pool.totalPotLamports / 1_000_000_000).toFixed(2);
    pool.totalPotFormatted = `${solVal} SOL`;

    return true;
  }
}

export const poolStore = new PoolStore();
