import { Router, Request, Response } from "express";
import { runService } from "../services/runService";
import { poolStore } from "../services/poolStore";

const router = Router();

export function handleEnterPool(req: Request, res: Response) {
  const { roundId, playerPubkey, txSignature } = req.body;
  const poolId = typeof roundId === "number" ? roundId : parseInt(String(roundId || "1"), 10);

  if (!playerPubkey) {
    res.status(400).json({ success: false, error: "playerPubkey is required." });
    return;
  }

  poolStore.recordPoolEntry(poolId, playerPubkey, txSignature || "");

  // Generate anti-cheat token ready for the game run
  const { runToken, startTime } = runService.startRun(playerPubkey, poolId, 25);

  res.json({
    success: true,
    message: "Entry confirmed in weekly pool.",
    roundId: poolId,
    playerPubkey,
    txSignature,
    runToken,
    startTime,
  });
}

export function handleSubmitRun(req: Request, res: Response) {
  const { roundId, playerPubkey, timeMs, won, runToken, coinsCollected } = req.body;
  const poolId = typeof roundId === "number" ? roundId : parseInt(String(roundId || "1"), 10);
  const isWin = typeof won === "boolean" ? won : true;
  const reportedTime = typeof timeMs === "number" ? timeMs : 0;
  const coins = typeof coinsCollected === "number" ? coinsCollected : 25;

  let verifiedTime = reportedTime;

  // If runToken is provided, verify anti-cheat HMAC
  if (runToken) {
    const verification = runService.finishRun(runToken, reportedTime, coins);
    if (!verification.valid) {
      res.status(422).json({
        success: false,
        error: "Anti-cheat verification failed.",
        reason: verification.reason,
      });
      return;
    }
    if (verification.verifiedTimeMs) {
      verifiedTime = verification.verifiedTimeMs;
    }
  }

  const result = poolStore.recordRunResult(poolId, playerPubkey || "Player", isWin, verifiedTime);

  res.json({
    success: true,
    verified: true,
    playerPubkey,
    roundId: poolId,
    timeMs: verifiedTime,
    projectedRank: result.rank,
    bestTimeMs: result.bestTimeMs,
    poolStats: result.poolStats,
    message: "Run recorded in weekly pool standings.",
  });
}

/**
 * POST /api/runs/start - Starts an anti-cheat protected game run
 */
router.post("/start", (req: Request, res: Response) => {
  const { playerPubkey, roundId } = req.body;

  if (!playerPubkey || typeof playerPubkey !== "string") {
    res.status(400).json({ success: false, error: "playerPubkey is required." });
    return;
  }

  const poolId = typeof roundId === "number" ? roundId : 1;
  const { runToken, startTime } = runService.startRun(playerPubkey, poolId, 25);

  res.json({
    success: true,
    runToken,
    startTime,
    playerPubkey,
    roundId: poolId,
  });
});

/**
 * POST /api/runs/finish - Verifies and records run completion directly into pool leaderboard
 */
router.post("/finish", handleSubmitRun);

export default router;
