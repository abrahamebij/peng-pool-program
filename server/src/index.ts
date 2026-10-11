import express from "express";
import cors from "cors";
import { CONFIG } from "./config";
import poolsRouter from "./routes/poolsRoute";
import runsRouter from "./routes/runsRoute";

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "peng-pool-backend",
    programId: CONFIG.PROGRAM_ID.toBase58(),
    cluster: CONFIG.SOLANA_RPC_URL,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/pools", poolsRouter);
app.use("/api/runs", runsRouter);

// Start Server
app.listen(CONFIG.PORT, () => {
  console.log(`[PengPool Backend] Server running on http://localhost:${CONFIG.PORT}`);
  console.log(`[PengPool Backend] Solana RPC: ${CONFIG.SOLANA_RPC_URL}`);
  console.log(`[PengPool Backend] Program ID: ${CONFIG.PROGRAM_ID.toBase58()}`);
});

export default app;
