import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import { CONFIG } from "../config";
import { PengPoolClient, RoundInfo, LeaderboardItem } from "../../../client/peng_pool_client";

export class SolanaService {
  readonly connection: Connection;
  readonly client: PengPoolClient;
  private authorityKeypair: Keypair | null = null;

  constructor() {
    this.connection = new Connection(CONFIG.SOLANA_RPC_URL, "confirmed");
    this.client = new PengPoolClient(this.connection, CONFIG.PROGRAM_ID);
    this.loadAuthorityKeypair();
  }

  private loadAuthorityKeypair() {
    try {
      if (CONFIG.AUTHORITY_PRIVATE_KEY) {
        // Parse from environment variable string (e.g., "[12,34,...]")
        const secret = Uint8Array.from(JSON.parse(CONFIG.AUTHORITY_PRIVATE_KEY));
        this.authorityKeypair = Keypair.fromSecretKey(secret);
        console.log(`Authority keypair loaded from AUTHORITY_PRIVATE_KEY: ${this.authorityKeypair.publicKey.toBase58()}`);
      } else if (CONFIG.AUTHORITY_KEYPAIR_PATH && fs.existsSync(CONFIG.AUTHORITY_KEYPAIR_PATH)) {
        const raw = fs.readFileSync(CONFIG.AUTHORITY_KEYPAIR_PATH, "utf-8");
        const secret = Uint8Array.from(JSON.parse(raw));
        this.authorityKeypair = Keypair.fromSecretKey(secret);
        console.log(`Authority keypair loaded from file: ${this.authorityKeypair.publicKey.toBase58()}`);
      } else {
        console.log("No authority keypair configured in environment variables. Authority write actions disabled.");
      }
    } catch (err) {
      console.error("Error loading authority keypair:", err);
      this.authorityKeypair = null;
    }
  }

  getAuthorityPublicKey(): PublicKey | null {
    return this.authorityKeypair ? this.authorityKeypair.publicKey : null;
  }

  /**
   * Fetches the on-chain PoolRound account info
   */
  async getPoolRound(roundId: number): Promise<RoundInfo | null> {
    try {
      const [poolPda] = this.client.getPoolRoundPda(roundId);
      const accountInfo = await this.connection.getAccountInfo(poolPda);
      if (!accountInfo) {
        return null;
      }
      // Note: Full Anchor deserialization can be performed when IDL is built
      return null;
    } catch (err) {
      console.error(`Error fetching pool round #${roundId}:`, err);
      return null;
    }
  }

  /**
   * Fetches top 50 standings for a given pool round
   */
  async getTop50Standings(roundId: number): Promise<LeaderboardItem[]> {
    try {
      const [lbPda] = this.client.getLeaderboardPda(roundId);
      const accountInfo = await this.connection.getAccountInfo(lbPda);
      if (!accountInfo) {
        return [];
      }
      return [];
    } catch (err) {
      console.error(`Error fetching standings for round #${roundId}:`, err);
      return [];
    }
  }
}

export const solanaService = new SolanaService();
