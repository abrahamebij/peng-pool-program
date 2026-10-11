import * as anchor from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

export const PROGRAM_ID = new PublicKey("2G9MvvQTCjFmNn3Bm98ibJ34cCsW2eXEoieWtsRiRnpf");

export interface RoundInfo {
  roundId: number;
  entryFee: number;
  totalPot: number;
  startTime: number;
  endTime: number;
  bestTimeMs: number;
  currentWinner: string;
  totalRuns: number;
  totalWins: number;
  totalLosses: number;
  isFinalized: boolean;
  prizeClaimed: boolean;
  isNative: boolean;
}

export interface LeaderboardItem {
  rank: number;
  player: string;
  timeMs: number;
  formattedTime: string;
  wins: number;
  losses: number;
  recordedAt: number;
}

export class PengPoolClient {
  readonly programId: PublicKey;
  readonly connection: Connection;

  constructor(connection: Connection, programId: PublicKey = PROGRAM_ID) {
    this.connection = connection;
    this.programId = programId;
  }

  getPoolRoundPda(roundId: number | BN): [PublicKey, number] {
    const bn = typeof roundId === "number" ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [Buffer.from("pool_round"), bn.toArrayLike(Buffer, "le", 8)],
      this.programId
    );
  }

  getVaultPda(roundId: number | BN): [PublicKey, number] {
    const bn = typeof roundId === "number" ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), bn.toArrayLike(Buffer, "le", 8)],
      this.programId
    );
  }

  getVaultSolPda(roundId: number | BN): [PublicKey, number] {
    const bn = typeof roundId === "number" ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault_sol"), bn.toArrayLike(Buffer, "le", 8)],
      this.programId
    );
  }

  getLeaderboardPda(roundId: number | BN): [PublicKey, number] {
    const bn = typeof roundId === "number" ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [Buffer.from("leaderboard"), bn.toArrayLike(Buffer, "le", 8)],
      this.programId
    );
  }

  getPlayerStatsPda(roundId: number | BN, player: PublicKey): [PublicKey, number] {
    const bn = typeof roundId === "number" ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [Buffer.from("player_stats"), bn.toArrayLike(Buffer, "le", 8), player.toBuffer()],
      this.programId
    );
  }

  static formatMs(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const remainderMs = Math.floor((ms % 1000) / 10);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}.${remainderMs.toString().padStart(2, "0")}`;
  }
}
