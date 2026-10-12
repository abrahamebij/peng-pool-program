export interface RunEntry {
  id: string;
  roundId: number;
  playerPubkey: string;
  timeMs: number;
  timeFormatted: string;
  won: boolean;
  timestamp: number;
}

export interface PoolState {
  roundId: number;
  name: string;
  tokenType: string;
  tokenSymbol: string;
  stake: string;
  entryFeeLamports: number;
  totalPot: string;
  winnerCut: string;
  totalRuns: number;
  timeLeft: string;
  currentLeader: string;
  bestTime: string;
  status: string;
  isNative: boolean;
}

export interface StandingEntry {
  rank: number;
  playerPubkey: string;
  shorthand: string;
  timeMs: number;
  formattedTime: string;
  wins: number;
  losses: number;
  isPlayer: boolean;
}

export function formatTime(timeMs: number): string {
  const totalSec = Math.floor(timeMs / 1000);
  const remainderMs = Math.floor((timeMs % 1000) / 10);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${remainderMs.toString().padStart(2, "0")}`;
}

export function getShorthand(key: string): string {
  if (key.length <= 8) return key;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

class Store {
  public pools: PoolState[] = [
    {
      roundId: 1,
      name: "Weekly Sprint Pool",
      tokenType: "Devnet SOL",
      tokenSymbol: "SOL",
      stake: "0.05 SOL",
      entryFeeLamports: 50_000_000,
      totalPot: "14.25 SOL",
      winnerCut: "12.82 SOL (90%)",
      totalRuns: 285,
      timeLeft: "3d 14h",
      currentLeader: "DeV1...1111",
      bestTime: "00:28.95",
      status: "Active",
      isNative: true,
    },
    {
      roundId: 2,
      name: "High Roller Pool",
      tokenType: "Devnet SOL",
      tokenSymbol: "SOL",
      stake: "0.50 SOL",
      entryFeeLamports: 500_000_000,
      totalPot: "32.00 SOL",
      winnerCut: "28.80 SOL (90%)",
      totalRuns: 64,
      timeLeft: "5d 08h",
      currentLeader: "7etj...4bZ9",
      bestTime: "00:27.40",
      status: "Active",
      isNative: true,
    },
    {
      roundId: 3,
      name: "Clock-In Arcade Pool",
      tokenType: "$SKR Token",
      tokenSymbol: "SKR",
      stake: "100 SKR",
      entryFeeLamports: 100_000_000,
      totalPot: "25,400 SKR",
      winnerCut: "22,860 SKR (90%)",
      totalRuns: 254,
      timeLeft: "2d 04h",
      currentLeader: "9pLm...8kE2",
      bestTime: "00:31.10",
      status: "Active",
      isNative: false,
    },
  ];

  // Map of roundId -> list of real submitted runs
  public submittedRuns: Map<number, RunEntry[]> = new Map();

  // Map of roundId -> ticket entries
  public tickets: Map<number, { playerPubkey: string; timestamp: number }[]> = new Map();

  constructor() {
    this.submittedRuns.set(1, []);
    this.submittedRuns.set(2, []);
    this.submittedRuns.set(3, []);
    this.tickets.set(1, []);
    this.tickets.set(2, []);
    this.tickets.set(3, []);
  }

  public registerTicket(roundId: number, playerPubkey: string): void {
    const list = this.tickets.get(roundId) || [];
    list.push({ playerPubkey, timestamp: Date.now() });
    this.tickets.set(roundId, list);

    const pool = this.pools.find((p) => p.roundId === roundId);
    if (pool) {
      pool.totalRuns += 1;
    }
  }

  public addRun(entry: RunEntry): { projectedRank: number } {
    const list = this.submittedRuns.get(entry.roundId) || [];
    
    // Check if player already had a run; update if faster, or insert
    const existingIndex = list.findIndex((r) => r.playerPubkey === entry.playerPubkey);
    if (existingIndex >= 0) {
      if (entry.timeMs < list[existingIndex].timeMs) {
        list[existingIndex] = entry;
      }
    } else {
      list.push(entry);
    }

    // Sort ascending by time (fastest first)
    list.sort((a, b) => a.timeMs - b.timeMs);
    this.submittedRuns.set(entry.roundId, list);

    // Update pool best leader if this is 1st
    const pool = this.pools.find((p) => p.roundId === entry.roundId);
    if (pool && list.length > 0) {
      pool.currentLeader = getShorthand(list[0].playerPubkey);
      pool.bestTime = formatTime(list[0].timeMs);
    }

    const rank = list.findIndex((r) => r.playerPubkey === entry.playerPubkey) + 1;
    return { projectedRank: rank };
  }

  public getStandings(roundId: number, userPubkey: string): StandingEntry[] {
    const runs = this.submittedRuns.get(roundId) || [];
    const results: StandingEntry[] = [];

    // Add all real submitted runs first
    runs.forEach((r, idx) => {
      const isPlayer = !!userPubkey && r.playerPubkey.toLowerCase() === userPubkey.toLowerCase();
      results.push({
        rank: idx + 1,
        playerPubkey: r.playerPubkey,
        shorthand: getShorthand(r.playerPubkey),
        timeMs: r.timeMs,
        formattedTime: formatTime(r.timeMs),
        wins: 1,
        losses: 0,
        isPlayer,
      });
    });

    // If fewer than 50 real runs, add standard community seed entries so standings is a rich top-50 board
    const seedBaseTimeMs = 28500 + roundId * 350;
    const sampleAddrs = [
      "7etjW1uPretendDevWalletX8c4BvQ9r3M12345678",
      "9pLmK8rVq2TsYz1W4eRtYuIoPaSdFgHjKlZxCvBnMq",
      "4xQrVn19LmKp88ZtYuIoPaSdFgHjKlZxCvBnMqWeRt",
      "Bw7Z3mP4Lk99Mn22Po00Qq11Rr33Ss44Tt55Uu66Vv",
      "6yTuKp88Qw12Er34Ty56Ui78Op90As12Df34Gh56Jk",
      "2mNtR9w1ZxCvBnMqWeRtYuIoPaSdFgHjKlZxCvBn11",
      "8vBxLq44Po99Oi88Uu77Yy66Tt55Rr44Ee33Ww22Qq",
      "5cDsP1z0MnBvCxZlKjHgFdSaQwErTyUiOpLkJhGf12",
      "3kLmWw77AsDfGhJkLzXcCvBnMqWeRtYuIoPaSdFg33",
      "1jKhTy99QazWsxEdcRfvTgbYhnUjmIkoLpQazWsx44",
    ];

    let seedIdx = 0;
    while (results.length < 50) {
      const rank = results.length + 1;
      const addr = seedIdx < sampleAddrs.length
        ? sampleAddrs[seedIdx++]
        : `Sol${rank.toString().padStart(2, "0")}Player${rank * 1337}Key11`;
      
      const entryTimeMs = seedBaseTimeMs + rank * 520;
      results.push({
        rank,
        playerPubkey: addr,
        shorthand: getShorthand(addr),
        timeMs: entryTimeMs,
        formattedTime: formatTime(entryTimeMs),
        wins: Math.max(1, 25 - Math.floor(rank * 0.4)),
        losses: Math.max(1, Math.floor(rank * 0.3)),
        isPlayer: false,
      });
    }

    // Re-sort all by timeMs
    results.sort((a, b) => a.timeMs - b.timeMs);
    // Re-assign rank numbers 1..50
    results.forEach((entry, i) => {
      entry.rank = i + 1;
      if (userPubkey && entry.playerPubkey.toLowerCase() === userPubkey.toLowerCase()) {
        entry.isPlayer = true;
      }
    });

    return results.slice(0, 50);
  }
}

export const store = new Store();
