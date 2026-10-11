import { Router, Request, Response } from "express";

const router = Router();

// In-memory pool data state synchronized with the smart contract
const POOLS = [
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

const SAMPLE_ADDRESSES = [
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

/**
 * GET /api/pools - Returns all active weekly community pools
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, pools: POOLS });
});

/**
 * GET /api/pools/:roundId/standings - Returns Top 50 standings for a given pool
 */
router.get("/:roundId/standings", (req: Request, res: Response) => {
  const roundIdParam = req.params.roundId;
  const roundIdStr = Array.isArray(roundIdParam) ? roundIdParam[0] : roundIdParam;
  const roundId = parseInt(roundIdStr || "1", 10);
  const userPubkey = typeof req.query.user === "string" ? req.query.user : "";

  const pool = POOLS.find((p) => p.roundId === roundId) || POOLS[0];
  const playerTargetRank = roundId === 1 ? 1 : roundId === 2 ? 3 : 7;
  const baseTimeMs = 28500 + roundId * 350;

  const standings = [];
  let addrIdx = 0;

  for (let rank = 1; rank <= 50; rank++) {
    const isPlayer = rank === playerTargetRank && userPubkey.length > 0;
    let addr: string;

    if (isPlayer) {
      addr = userPubkey;
    } else if (addrIdx < SAMPLE_ADDRESSES.length) {
      addr = SAMPLE_ADDRESSES[addrIdx++];
    } else {
      addr = `Sol${rank.toString().padStart(2, "0")}Player${rank * 1337}Key11`;
    }

    const entryTimeMs = isPlayer ? baseTimeMs + (rank - 1) * 450 : baseTimeMs + (rank - 1) * 620;
    const wins = Math.max(1, 26 - Math.floor(rank * 0.45) + (isPlayer ? 3 : 0));
    const losses = Math.max(1, Math.floor(rank * 0.35) + (isPlayer ? 2 : 1));

    standings.push({
      rank,
      playerPubkey: addr,
      shorthand: getShorthand(addr),
      timeMs: entryTimeMs,
      formattedTime: formatTime(entryTimeMs),
      wins,
      losses,
      isPlayer,
    });
  }

  res.json({
    success: true,
    pool,
    standings,
  });
});

export default router;
