import express from "express";
import cors from "cors";
import { CONFIG } from "./config";
import poolsRouter, { handleGetStandings } from "./routes/poolsRoute";
import runsRouter, { handleEnterPool, handleSubmitRun } from "./routes/runsRoute";
import accountRouter from "./routes/accountRoute";

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "peng-pool-backend",
    programId: CONFIG.PROGRAM_ID,
    cluster: CONFIG.SOLANA_RPC_URL,
    timestamp: new Date().toISOString(),
  });
});

// Digital Asset Links for Android MWA & Phantom Domain Verification
app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.abrahamebij.pengballs",
        sha256_cert_fingerprints: [
          "91:76:DE:5F:E3:68:EB:7F:82:AE:51:DD:EF:17:D7:74:06:3F:E8:09:B4:CB:D7:A9:A8:1F:19:97:F1:64:A0:C4"
        ]
      }
    }
  ]);
});

// API Routes
app.use("/api/pools", poolsRouter);
app.use("/api/runs", runsRouter);
app.use("/api/account", accountRouter);

// Aliases matching Godot client endpoints:
// GET /api/standings (with ?roundId=...)
app.get("/api/standings", handleGetStandings);
// POST /api/enter
app.post("/api/enter", handleEnterPool);
// POST /api/submit-run
app.post("/api/submit-run", handleSubmitRun);

// Start Server (only when running standalone locally, not in Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(CONFIG.PORT, () => {
    console.log(`[PengPool Backend] Server running on http://localhost:${CONFIG.PORT}`);
    console.log(`[PengPool Backend] Solana RPC: ${CONFIG.SOLANA_RPC_URL}`);
    console.log(`[PengPool Backend] Program ID: ${CONFIG.PROGRAM_ID}`);
  });
}

export default app;
