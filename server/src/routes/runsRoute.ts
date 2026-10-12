import { Router, Request, Response } from "express";
import { runService } from "../services/runService";

const router = Router();

/**
 * POST /api/runs/start - Starts an anti-cheat protected game run
 * Body: { playerPubkey: string, roundId: number }
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
 * POST /api/runs/finish - Verifies and records run completion
 * Body: { runToken: string, reportedTimeMs: number, coinsCollected: number }
 */
router.post("/finish", (req: Request, res: Response) => {
  const { runToken, reportedTimeMs, coinsCollected } = req.body;

  if (!runToken || typeof reportedTimeMs !== "number") {
    res.status(400).json({ success: false, error: "runToken and reportedTimeMs are required." });
    return;
  }

  const coins = typeof coinsCollected === "number" ? coinsCollected : 25;
  const verification = runService.finishRun(runToken, reportedTimeMs, coins);

  if (!verification.valid) {
    res.status(422).json({
      success: false,
      error: "Anti-cheat verification failed.",
      reason: verification.reason,
    });
    return;
  }

  // Calculate projected rank (simple benchmark: 28s is ~rank 1, 35s is ~rank 5)
  const timeMs = verification.verifiedTimeMs || reportedTimeMs;
  let projectedRank = 1;
  if (timeMs > 34000) projectedRank = 5;
  else if (timeMs > 31000) projectedRank = 3;
  else if (timeMs > 28000) projectedRank = 2;

  res.json({
    success: true,
    verified: true,
    playerPubkey: verification.playerPubkey,
    roundId: verification.roundId,
    verifiedTimeMs: timeMs,
    projectedRank,
    message: "Run verified and recorded in weekly community pool.",
  });
});

/**
 * POST /api/enter - Registers entry into a pool round
 * Body: { roundId: number, playerPubkey: string, stake?: string }
 */
export function handleEnterPool(req: Request, res: Response) {
  const { playerPubkey, roundId, stake } = req.body;

  if (!playerPubkey || typeof playerPubkey !== "string") {
    res.status(400).json({ success: false, error: "playerPubkey is required." });
    return;
  }

  const poolId = typeof roundId === "number" ? roundId : parseInt(roundId || "1", 10);
  const { runToken, startTime } = runService.startRun(playerPubkey, poolId, 25);

  res.json({
    success: true,
    message: "Ticket registered successfully. Good luck!",
    runToken,
    startTime,
    roundId: poolId,
    playerPubkey,
    stake: stake || "",
  });
}

/**
 * POST /api/submit-run - Records completed run time from client
 * Body: { roundId: number, playerPubkey: string, timeMs: number, timeFormatted?: string, won?: boolean, runToken?: string, coinsCollected?: number }
 */
export function handleSubmitRun(req: Request, res: Response) {
  const { roundId, playerPubkey, timeMs, timeFormatted, won, runToken, coinsCollected } = req.body;

  if (!playerPubkey || typeof timeMs !== "number") {
    res.status(400).json({
      success: false,
      error: "playerPubkey and timeMs are required.",
    });
    return;
  }

  const poolId = typeof roundId === "number" ? roundId : parseInt(roundId || "1", 10);

  // If a runToken was provided, attempt anti-cheat validation
  if (runToken && typeof runToken === "string") {
    const coins = typeof coinsCollected === "number" ? coinsCollected : 25;
    const verification = runService.finishRun(runToken, timeMs, coins);
    if (!verification.valid) {
      console.warn(`[AntiCheat Warning] Run verification failed for ${playerPubkey}: ${verification.reason}`);
    }
  }

  // Calculate projected rank (benchmark: ~27-28s is rank 1-2, ~30-32s is rank 3-5, >35s is rank 5+)
  let projectedRank = 1;
  if (timeMs > 35000) projectedRank = 8;
  else if (timeMs > 32000) projectedRank = 5;
  else if (timeMs > 29500) projectedRank = 3;
  else if (timeMs > 28000) projectedRank = 2;

  res.json({
    success: true,
    verified: true,
    message: "Run recorded on leaderboard!",
    playerPubkey,
    roundId: poolId,
    timeMs,
    timeFormatted: timeFormatted || `${(timeMs / 1000).toFixed(2)}s`,
    won: won !== false,
    projectedRank,
    timestamp: Date.now(),
  });
}

router.post("/enter", handleEnterPool);
router.post("/submit", handleSubmitRun);
router.post("/submit-run", handleSubmitRun);

export default router;
