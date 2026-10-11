import dotenv from "dotenv";
import path from "path";
import { PublicKey } from "@solana/web3.js";

dotenv.config();

export const CONFIG = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  PROGRAM_ID: new PublicKey(process.env.PROGRAM_ID || "Mh2yn8cR99LYd88UcihsCnbXatss89VKxYZU9W6WQEj"),
  AUTHORITY_KEYPAIR_PATH: process.env.AUTHORITY_KEYPAIR_PATH || path.join(process.env.USERPROFILE || "", ".config", "solana", "id.json"),
  MIN_RUN_TIME_MS: 15_000, // 15 seconds theoretical human minimum
  MAX_RUN_TIME_MS: 300_000, // 5 minutes maximum run window
  JWT_SECRET: process.env.JWT_SECRET || "peng_balls_super_secure_anti_cheat_secret_2026",
  POLL_INTERVAL_MS: 30_000, // 30 seconds for pool cache refresh
};
