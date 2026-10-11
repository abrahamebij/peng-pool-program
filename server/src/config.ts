import dotenv from "dotenv";
import crypto from "crypto";
import { PublicKey } from "@solana/web3.js";

dotenv.config();

// If no JWT_SECRET is provided in environment, generate a cryptographically random in-memory secret for this session
// Never hardcode fallback secret keys in the codebase
const sessionSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

export const CONFIG = {
  PORT: parseInt(process.env.PORT || "3001", 10),
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  PROGRAM_ID: new PublicKey(process.env.PROGRAM_ID || "2G9MvvQTCjFmNn3Bm98ibJ34cCsW2eXEoieWtsRiRnpf"),
  AUTHORITY_PRIVATE_KEY: process.env.AUTHORITY_PRIVATE_KEY || "",
  AUTHORITY_KEYPAIR_PATH: process.env.AUTHORITY_KEYPAIR_PATH || "",
  MIN_RUN_TIME_MS: 15_000, // 15 seconds physical minimum
  MAX_RUN_TIME_MS: 300_000, // 5 minutes max window
  JWT_SECRET: sessionSecret,
  POLL_INTERVAL_MS: 30_000,
};
