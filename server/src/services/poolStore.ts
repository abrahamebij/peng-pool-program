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
    // Pool 1: Weekly Sprint Pool (0.05 SOL)
    const pool1Standings: LeaderboardEntry[] = [
      { rank: 1, playerPubkey: "DeV1LapToPpReTeNdWaLLeT111111111111111111111", shorthand: "DeV1...1111", timeMs: 27950, formattedTime: "00:27.95", wins: 14, losses: 2, recordedAt: Date.now() - 3600000 },
      { rank: 2, playerPubkey: "7etjW1uPretendDevWalletX8c4BvQ9r3M12345678", shorthand: "7etj...5678", timeMs: 28420, formattedTime: "00:28.42", wins: 12, losses: 3, recordedAt: Date.now() - 7200000 },
      { rank: 3, playerPubkey: "9pLmK8rVq2TsYz1W4eRtYuIoPaSdFgHjKlZxCvBnMq", shorthand: "9pLm...BnMq", timeMs: 29110, formattedTime: "00:29.11", wins: 10, losses: 4, recordedAt: Date.now() - 10800000 },
      { rank: 4, playerPubkey: "4xQrVn19LmKp88ZtYuIoPaSdFgHjKlZxCvBnMqWeRt", shorthand: "4xQr...WeRt", timeMs: 30250, formattedTime: "00:30.25", wins: 9, losses: 5, recordedAt: Date.now() - 14400000 },
      { rank: 5, playerPubkey: "Bw7Z3mP4Lk99Mn22Po00Qq11Rr33Ss44Tt55Uu66Vv", shorthand: "Bw7Z...66Vv", timeMs: 31400, formattedTime: "00:31.40", wins: 8, losses: 6, recordedAt: Date.now() - 18000000 },
      { rank: 6, playerPubkey: "6yTuKp88Qw12Er34Ty56Ui78Op90As12Df34Gh56Jk", shorthand: "6yTu...56Jk", timeMs: 32180, formattedTime: "00:32.18", wins: 6, losses: 7, recordedAt: Date.now() - 21600000 },
      { rank: 7, playerPubkey: "2mNtR9w1ZxCvBnMqWeRtYuIoPaSdFgHjKlZxCvBn11", shorthand: "2mNt...Bn11", timeMs: 33500, formattedTime: "00:33.50", wins: 5, losses: 8, recordedAt: Date.now() - 25200000 },
      { rank: 8, playerPubkey: "8vBxLq44Po99Oi88Uu77Yy66Tt55Rr44Ee33Ww22Qq", shorthand: "8vBx...22Qq", timeMs: 34200, formattedTime: "00:34.20", wins: 4, losses: 9, recordedAt: Date.now() - 28800000 },
    ];

    // Pool 2: High Roller Pool (0.50 SOL) - completely separate standings
    const pool2Standings: LeaderboardEntry[] = [
      { rank: 1, playerPubkey: "HR11ApexRacer777DevnetSpeedKey999999999999", shorthand: "HR11...9999", timeMs: 26800, formattedTime: "00:26.80", wins: 22, losses: 1, recordedAt: Date.now() - 2000000 },
      { rank: 2, playerPubkey: "Roll88WhaleRunnerXxDevnetSolanaPoolKey888", shorthand: "Roll...k888", timeMs: 27350, formattedTime: "00:27.35", wins: 19, losses: 3, recordedAt: Date.now() - 4000000 },
      { rank: 3, playerPubkey: "High55StakeWinner44SolanaDevnetKey33333333", shorthand: "High...3333", timeMs: 28100, formattedTime: "00:28.10", wins: 15, losses: 4, recordedAt: Date.now() - 6000000 },
      { rank: 4, playerPubkey: "Apex99SolRunner1234DevnetTopGunKey55555555", shorthand: "Apex...5555", timeMs: 29400, formattedTime: "00:29.40", wins: 11, losses: 5, recordedAt: Date.now() - 8000000 },
      { rank: 5, playerPubkey: "Gold33VaultMaster88SolanaDevKey22222222222", shorthand: "Gold...2222", timeMs: 30900, formattedTime: "00:30.90", wins: 7, losses: 6, recordedAt: Date.now() - 10000000 },
    ];

    // Pool 3: Clock-In Arcade Pool - completely separate standings
    const pool3Standings: LeaderboardEntry[] = [
      { rank: 1, playerPubkey: "Arcade99TurboMasterDevnetSolanaKey111111111", shorthand: "Arca...1111", timeMs: 28900, formattedTime: "00:28.90", wins: 30, losses: 2, recordedAt: Date.now() - 1500000 },
      { rank: 2, playerPubkey: "Skr77TokenRacerPoolKeyDevnetSolana99999999", shorthand: "Skr7...9999", timeMs: 29850, formattedTime: "00:29.85", wins: 25, losses: 4, recordedAt: Date.now() - 3000000 },
      { rank: 3, playerPubkey: "Coin44CollectorPenguinMazeRunnerKey8888888", shorthand: "Coin...8888", timeMs: 31200, formattedTime: "00:31.20", wins: 20, losses: 7, recordedAt: Date.now() - 4500000 },
      { rank: 4, playerPubkey: "Maze22SpeedyPenguinDevnetPlayerKey77777777", shorthand: "Maze...7777", timeMs: 32600, formattedTime: "00:32.60", wins: 17, losses: 8, recordedAt: Date.now() - 6000000 },
      { rank: 5, playerPubkey: "Ice11SlideChampionDevnetSolanaKey666666666", shorthand: "Ice1...6666", timeMs: 33900, formattedTime: "00:33.90", wins: 14, losses: 9, recordedAt: Date.now() - 7500000 },
    ];

    this.pools.set(1, {
      roundId: 1,
      name: "Weekly Sprint Pool",
      tokenType: "Devnet SOL",
      tokenSymbol: "SOL",
      stake: "0.05 SOL",
      entryFeeLamports: 50_000_000,
      vaultPubkey: "2G9MvvQTCjFmNn3Bm98ibJ34cCsW2eXEoieWtsRiRnpf",
      totalPotLamports: 14_250_000_000,
      totalPotFormatted: "14.25 SOL",
      totalRuns: 285,
      totalWins: 230,
      totalLosses: 55,
      endTime: oneWeekSec,
      timeLeft: calculateTimeLeft(oneWeekSec),
      currentLeader: pool1Standings[0].shorthand,
      bestTimeMs: pool1Standings[0].timeMs,
      bestTimeFormatted: pool1Standings[0].formattedTime,
      status: "Active",
      isNative: true,
      standings: pool1Standings,
    });

    this.pools.set(2, {
      roundId: 2,
      name: "High Roller Pool",
      tokenType: "Devnet SOL",
      tokenSymbol: "SOL",
      stake: "0.50 SOL",
      entryFeeLamports: 500_000_000,
      vaultPubkey: "2G9MvvQTCjFmNn3Bm98ibJ34cCsW2eXEoieWtsRiRnpf",
      totalPotLamports: 32_000_000_000,
      totalPotFormatted: "32.00 SOL",
      totalRuns: 64,
      totalWins: 52,
      totalLosses: 12,
      endTime: oneWeekSec + 86400 * 2,
      timeLeft: calculateTimeLeft(oneWeekSec + 86400 * 2),
      currentLeader: pool2Standings[0].shorthand,
      bestTimeMs: pool2Standings[0].timeMs,
      bestTimeFormatted: pool2Standings[0].formattedTime,
      status: "Active",
      isNative: true,
      standings: pool2Standings,
    });

    this.pools.set(3, {
      roundId: 3,
      name: "Clock-In Arcade Pool",
      tokenType: "Devnet SOL",
      tokenSymbol: "SOL",
      stake: "0.10 SOL",
      entryFeeLamports: 100_000_000,
      vaultPubkey: "2G9MvvQTCjFmNn3Bm98ibJ34cCsW2eXEoieWtsRiRnpf",
      totalPotLamports: 25_400_000_000,
      totalPotFormatted: "25.40 SOL",
      totalRuns: 254,
      totalWins: 198,
      totalLosses: 56,
      endTime: oneWeekSec - 86400,
      timeLeft: calculateTimeLeft(oneWeekSec - 86400),
      currentLeader: pool3Standings[0].shorthand,
      bestTimeMs: pool3Standings[0].timeMs,
      bestTimeFormatted: pool3Standings[0].formattedTime,
      status: "Active",
      isNative: true,
      standings: pool3Standings,
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

    // Annotate user's entry if present
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
        if (timeMs < existingEntry.timeMs) {
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

    // Re-sort standings by lowest time ascending
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
