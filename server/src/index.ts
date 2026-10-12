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

// Demo link redirect 
app.get("/video", (_req, res) => {
  res.redirect("https://youtu.be/qEhcvXdnvpg")
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

// App Icon & Favicon for Phantom and Web
const iconBase64 = "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";
const iconBuffer = Buffer.from(iconBase64, "base64");

app.get(["/favicon.ico", "/icon.png"], (_req, res) => {
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(iconBuffer);
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
