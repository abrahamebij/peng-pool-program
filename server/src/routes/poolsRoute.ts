import { Router, Request, Response } from "express";
import { store } from "../store";

const router = Router();

export function handleGetStandings(req: Request, res: Response) {
  const roundIdParam = req.params.roundId || req.query.roundId;
  const roundIdStr = Array.isArray(roundIdParam) ? roundIdParam[0] : roundIdParam;
  const roundId = parseInt((roundIdStr as string) || "1", 10);
  const userPubkey = typeof req.query.user === "string" ? req.query.user : "";

  const pool = store.pools.find((p) => p.roundId === roundId) || store.pools[0];
  const standings = store.getStandings(roundId, userPubkey);

  res.json({
    success: true,
    pool,
    standings,
  });
}

/**
 * GET /api/pools - Returns all active weekly community pools
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({ success: true, pools: store.pools });
});

/**
 * GET /api/pools/:roundId/standings - Returns Top 50 standings for a given pool
 */
router.get("/:roundId/standings", handleGetStandings);

export default router;
