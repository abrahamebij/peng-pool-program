import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// If no JWT_SECRET is provided in environment, generate a cryptographically random in-memory secret for this session
const sessionSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

export const CONFIG = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  PROGRAM_ID: process.env.PROGRAM_ID || "2G9MvvQTCjFmNn3Bm98ibJ34cCsW2eXEoieWtsRiRnpf",
  MIN_RUN_TIME_MS: 15_000, // 15 seconds physical minimum
  MAX_RUN_TIME_MS: 300_000, // 5 minutes max window
  JWT_SECRET: sessionSecret,
  POLL_INTERVAL_MS: 30_000,
};
