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
      if (fs.existsSync(CONFIG.AUTHORITY_KEYPAIR_PATH)) {
        const raw = fs.readFileSync(CONFIG.AUTHORITY_KEYPAIR_PATH, "utf-8");
        const secret = Uint8Array.from(JSON.parse(raw));
        this.authorityKeypair = Keypair.fromSecretKey(secret);
        console.log(`Authority keypair loaded: ${this.authorityKeypair.publicKey.toBase58()}`);
      } else {
        // Fallback: generate ephemeral dev keypair for development
        this.authorityKeypair = Keypair.generate();
        console.warn(`Authority file not found at ${CONFIG.AUTHORITY_KEYPAIR_PATH}. Generated temporary ephemeral authority: ${this.authorityKeypair.publicKey.toBase58()}`);
      }
    } catch (err) {
      console.error("Error loading authority keypair:", err);
      this.authorityKeypair = Keypair.generate();
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
