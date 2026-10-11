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

export default router;
