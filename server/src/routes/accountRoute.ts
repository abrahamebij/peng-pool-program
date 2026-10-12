import { Router, Request, Response } from "express";
import { CONFIG } from "../config";

const router = Router();

/**
 * GET /api/account/:pubkey/balance - Fetches live Devnet balance for a wallet address
 */
router.get("/:pubkey/balance", async (req: Request, res: Response) => {
  const { pubkey } = req.params;

  if (!pubkey) {
    res.status(400).json({ success: false, error: "pubkey is required" });
    return;
  }

  try {
    // 1. Query Devnet SOL balance
    const solResponse = await fetch(CONFIG.SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [pubkey, { commitment: "confirmed" }],
      }),
    });

    const solData = await solResponse.json();
    const lamports = solData?.result?.value || 0;
    const solBalance = lamports / 1_000_000_000;

    // 2. Query SPL Token accounts on devnet
    let skrBalance = 0.0;
    try {
      const tokenResponse = await fetch(CONFIG.SOLANA_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "getTokenAccountsByOwner",
          params: [
            pubkey,
            { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
            { encoding: "jsonParsed" },
          ],
        }),
      });
      const tokenData = await tokenResponse.json();
      const accounts = tokenData?.result?.value || [];
      for (const acc of accounts) {
        const info = acc.account?.data?.parsed?.info;
        if (info && info.tokenAmount) {
          // If token account exists, track balance
          skrBalance += info.tokenAmount.uiAmount || 0;
        }
      }
    } catch {
      skrBalance = 0.0;
    }

    res.json({
      success: true,
      pubkey,
      cluster: CONFIG.SOLANA_RPC_URL,
      lamports,
      solBalance,
      skrBalance,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to query Solana RPC",
      details: err?.message,
    });
  }
});

export default router;
