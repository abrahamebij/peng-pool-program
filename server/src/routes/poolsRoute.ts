import { Router, Request, Response } from "express";
import { poolStore } from "../services/poolStore";

const router = Router();

export function handleGetStandings(req: Request, res: Response) {
  const roundId = parseInt(String(req.params.roundId || req.query.roundId || "1"), 10);
  const userPubkey = typeof req.query.user === "string" ? req.query.user : "";

  const result = poolStore.getStandingsForPool(roundId, userPubkey);
  if (!result) {
    res.status(404).json({ success: false, error: "Pool not found" });
    return;
  }

  res.json({
    success: true,
    pool: result.pool,
    standings: result.standings,
  });
}

/**
 * GET /api/pools - Returns all active weekly community pools
 */
router.get("/", (_req: Request, res: Response) => {
  const pools = poolStore.getAllPools();
  res.json({
    success: true,
    pools,
  });
});

/**
 * GET /api/pools/:roundId - Returns single pool details
 */
router.get("/:roundId", (req: Request, res: Response) => {
  const roundId = parseInt(String(req.params.roundId || "1"), 10);
  const pool = poolStore.getPool(roundId);

  if (!pool) {
    res.status(404).json({ success: false, error: "Pool not found" });
    return;
  }

  const { standings, ...summary } = pool;
  res.json({ success: true, pool: summary });
});

/**
 * GET /api/pools/:roundId/standings - Returns Top 50 standings for ONLY the requested pool round
 */
router.get("/:roundId/standings", handleGetStandings);

/**
 * POST /api/pools/:roundId/enter - Registers an entry ticket with real transaction signature
 */
router.post("/:roundId/enter", (req: Request, res: Response) => {
  const roundId = parseInt(String(req.params.roundId || "1"), 10);
  const { playerPubkey, txSignature } = req.body;

  if (!playerPubkey) {
    res.status(400).json({ success: false, error: "playerPubkey is required." });
    return;
  }

  const recorded = poolStore.recordPoolEntry(roundId, playerPubkey, txSignature || "");
  if (!recorded) {
    res.status(404).json({ success: false, error: "Pool not found" });
    return;
  }

  res.json({
    success: true,
    message: "Entry confirmed in weekly community pool.",
    roundId,
    playerPubkey,
    txSignature,
  });
});

export default router;
