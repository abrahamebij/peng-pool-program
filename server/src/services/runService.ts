import crypto from "crypto";
import { CONFIG } from "../config";

export interface ActiveRun {
  playerPubkey: string;
  roundId: number;
  startTime: number;
  coinsTotal: number;
}

export interface RunVerificationResult {
  valid: boolean;
  reason?: string;
  verifiedTimeMs?: number;
  playerPubkey?: string;
  roundId?: number;
}

export class RunService {
  private activeRuns: Map<string, ActiveRun> = new Map();

  /**
   * Starts a new run and generates a tamper-proof signed run token
   */
  startRun(playerPubkey: string, roundId: number, coinsTotal: number = 25): { runToken: string; startTime: number } {
    const startTime = Date.now();
    const payload = `${playerPubkey}:${roundId}:${startTime}:${coinsTotal}`;
    const signature = crypto.createHmac("sha256", CONFIG.JWT_SECRET).update(payload).digest("hex");
    const runToken = Buffer.from(`${payload}:${signature}`).toString("base64url");

    this.activeRuns.set(runToken, {
      playerPubkey,
      roundId,
      startTime,
      coinsTotal,
    });

    return { runToken, startTime };
  }

  /**
   * Verifies the completed run against anti-cheat physical bounds
   */
  finishRun(runToken: string, reportedTimeMs: number, coinsCollected: number): RunVerificationResult {
    let payload = "";
    let signature = "";

    try {
      const decoded = Buffer.from(runToken, "base64url").toString("utf-8");
      const parts = decoded.split(":");
      if (parts.length !== 5) {
        return { valid: false, reason: "Malformed run token." };
      }

      const [playerPubkey, roundIdStr, startTimeStr, coinsTotalStr, sig] = parts;
      payload = `${playerPubkey}:${roundIdStr}:${startTimeStr}:${coinsTotalStr}`;
      signature = sig;

      const expectedSig = crypto.createHmac("sha256", CONFIG.JWT_SECRET).update(payload).digest("hex");
      if (signature !== expectedSig) {
        return { valid: false, reason: "Invalid token signature (tamper detected)." };
      }

      const startTime = parseInt(startTimeStr, 10);
      const roundId = parseInt(roundIdStr, 10);
      const coinsTotal = parseInt(coinsTotalStr, 10);
      const serverElapsedMs = Date.now() - startTime;

      // Anti-Cheat Check 1: Minimum physical time required to collect 25 coins
      if (reportedTimeMs < CONFIG.MIN_RUN_TIME_MS) {
        return {
          valid: false,
          reason: `Reported time (${reportedTimeMs} ms) is below the minimum threshold (${CONFIG.MIN_RUN_TIME_MS} ms).`,
        };
      }

      // Anti-Cheat Check 2: Server elapsed time vs reported client time
      // Client reported time should be approximately equal to server wall-clock time
      const discrepancyMs = Math.abs(serverElapsedMs - reportedTimeMs);
      if (discrepancyMs > 10_000) {
        return {
          valid: false,
          reason: `Time discrepancy too high: client=${reportedTimeMs}ms, server=${serverElapsedMs}ms.`,
        };
      }

      // Anti-Cheat Check 3: Coin completion check
      if (coinsCollected < coinsTotal) {
        return {
          valid: false,
          reason: `Incomplete coin collection: collected ${coinsCollected}/${coinsTotal}.`,
        };
      }

      // Consume active run token
      this.activeRuns.delete(runToken);

      return {
        valid: true,
        verifiedTimeMs: reportedTimeMs,
        playerPubkey,
        roundId,
      };
    } catch (err: any) {
      return { valid: false, reason: `Token verification error: ${err.message}` };
    }
  }
}

export const runService = new RunService();
